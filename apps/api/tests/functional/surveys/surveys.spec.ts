import { test } from '@japa/runner'
import type { ApiClient } from '@japa/api-client'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import mail from '@adonisjs/mail/services/main'
import { DateTime } from 'luxon'
import type { EnrollmentRole } from '@aptoph/shared'
import UnitOccupant from '#models/property/unit_occupant'
import type Unit from '#models/property/unit'
import type Tenant from '#models/tenants/tenant'
import { SurveysService } from '#services/surveys/surveys'
import { createMember } from '#tests/helpers'
import { apiFor, dataOf, expectStatus, financeSetup } from '../finance/helpers.js'

async function member(
  client: ApiClient,
  tenant: Tenant,
  role: EnrollmentRole,
  occupancies: Array<{ unit: Unit; relationship: 'owner' | 'renter' }> = []
) {
  const { user } = await createMember(role, tenant)
  for (const { unit, relationship } of occupancies) {
    await UnitOccupant.create({
      tenantId: tenant.id,
      unitId: unit.id,
      userId: user.id,
      fullName: user.fullName,
      relationship,
      isPrimaryContact: relationship === 'owner',
    })
  }
  return { user, api: apiFor(client, tenant, user) }
}

/** Units a (0.5), b (0.3), c (0.2); P-01 has no coefficient and does not vote */
async function setup(client: ApiClient) {
  const finance = await financeSetup(client, { fees: false })
  const { tenant, units } = finance
  return {
    ...finance,
    admin: { user: finance.user, api: finance.api },
    /** Owns a */
    ownerA: await member(client, tenant, 'resident', [{ unit: units.a, relationship: 'owner' }]),
    /** Also owns a */
    coOwnerA: await member(client, tenant, 'resident', [{ unit: units.a, relationship: 'owner' }]),
    /** Owns b and c */
    ownerBC: await member(client, tenant, 'resident', [
      { unit: units.b, relationship: 'owner' },
      { unit: units.c, relationship: 'owner' },
    ]),
    renter: await member(client, tenant, 'resident', [{ unit: units.c, relationship: 'renter' }]),
    council: await member(client, tenant, 'council_member'),
  }
}
type Setup = Awaited<ReturnType<typeof setup>>

const input = (overrides: Record<string, unknown> = {}) => ({
  title: 'Pintura de fachadas',
  description: 'Antes de la asamblea queremos conocer tu opinión.',
  closesAt: DateTime.now().plus({ days: 5 }).toISO(),
  anonymous: true,
  resultsVisibility: 'after_vote',
  minParticipation: 51,
  questions: [
    { text: '¿Está de acuerdo con pintar las fachadas?', options: ['Sí', 'No', 'Me abstengo'] },
    { text: '¿Qué color prefiere?', options: ['Blanco', 'Gris'] },
  ],
  ...overrides,
})

type Detail = {
  id: string
  status: string
  questions: Array<{ id: string; options: Array<{ id: string; label: string }> }>
  results: null | {
    participation: {
      votedUnits: number
      votedCoefficient: number
      eligibleUnits: number
      reached: boolean
    }
    questions: Array<{
      questionId: string
      options: Array<{ optionId: string; votes: number; coefficient: number }>
    }>
  }
}

async function published(s: Setup, overrides: Record<string, unknown> = {}) {
  const draft: Detail = await dataOf(s.admin.api.post('/surveys', input(overrides)))
  await expectStatus(s.admin.api.post(`/surveys/${draft.id}/publish`, { notify: false }), 200)
  return draft
}

/** questionId → optionId choosing the option labels given, in order */
const choose = (survey: Detail, labels: string[]) =>
  Object.fromEntries(
    survey.questions.map((q, i) => [q.id, q.options.find((o) => o.label === labels[i])!.id])
  )

const optionResult = (detail: Detail, question: number, label: string) => {
  const q = detail.questions[question]
  const optionId = q.options.find((o) => o.label === label)!.id
  return detail.results!.questions[question].options.find((o) => o.optionId === optionId)!
}

test.group('Surveys', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('drafts are edited and validated; publishing notifies the owners', async ({
    client,
    assert,
  }) => {
    mail.fake()
    const s = await setup(client)
    await expectStatus(
      s.admin.api.post('/surveys', input({ questions: [{ text: 'Pregunta', options: ['Sí'] }] })),
      422
    )
    await expectStatus(
      s.admin.api.post(
        '/surveys',
        input({ questions: [{ text: 'Pregunta', options: ['Sí', 'sí'] }] })
      ),
      422
    )
    const draft: Detail = await dataOf(s.admin.api.post('/surveys', input()))
    assert.equal(draft.status, 'draft')
    assert.isNull(draft.results)
    // The council reads, it does not create
    await expectStatus(s.council.api.post('/surveys', input()), 403)
    await expectStatus(s.council.api.get(`/surveys/${draft.id}`), 200)
    // Owners do not see drafts
    await expectStatus(s.ownerA.api.get(`/resident/surveys/${draft.id}`), 404)

    const updated: Detail = await dataOf(
      s.admin.api.put(
        `/surveys/${draft.id}`,
        input({ closesAt: DateTime.now().plus({ minutes: 20 }).toISO() })
      )
    )
    assert.lengthOf(updated.questions, 2)
    // Too close to the deadline to publish
    await expectStatus(s.admin.api.post(`/surveys/${draft.id}/publish`, {}), 422)
    await expectStatus(s.admin.api.put(`/surveys/${draft.id}`, input()), 200)

    const response = await s.admin.api.post(`/surveys/${draft.id}/publish`, { notify: true })
    response.assertStatus(200)
    // The three owners; not the renter
    assert.equal(response.body().notified, 3)
    assert.equal(response.body().data.status, 'open')
    await expectStatus(s.admin.api.put(`/surveys/${draft.id}`, input()), 409)
    const remove = await client
      .delete(`/api/v1/surveys/${draft.id}`)
      .loginAs(s.admin.user)
      .header('X-Tenant-Id', s.tenant.id)
    remove.assertStatus(409)

    const renterList = await s.renter.api.get('/resident/surveys')
    const { data: forRenter, isOwner } = renterList.body()
    assert.isFalse(isOwner)
    assert.lengthOf(forRenter, 0)
    await expectStatus(s.renter.api.get(`/resident/surveys/${draft.id}`), 404)
  })

  test('one vote per unit, weighted by coefficient; results after voting', async ({
    client,
    assert,
  }) => {
    const s = await setup(client)
    const survey = await published(s)

    const before: Detail = await dataOf(s.ownerA.api.get(`/resident/surveys/${survey.id}`))
    assert.isNull(before.results)

    // Every question must be answered
    await expectStatus(
      s.ownerA.api.post(`/resident/surveys/${survey.id}/vote`, {
        unitIds: [s.units.a.id],
        answers: { [survey.questions[0].id]: survey.questions[0].options[0].id },
      }),
      422
    )
    // Only for the units the person owns
    await expectStatus(
      s.ownerA.api.post(`/resident/surveys/${survey.id}/vote`, {
        unitIds: [s.units.b.id],
        answers: choose(survey, ['Sí', 'Blanco']),
      }),
      422
    )

    const voted: Detail = await dataOf(
      s.ownerA.api.post(`/resident/surveys/${survey.id}/vote`, {
        unitIds: [s.units.a.id],
        answers: choose(survey, ['Sí', 'Blanco']),
      })
    )
    assert.equal(voted.results!.participation.votedUnits, 1)
    assert.equal(voted.results!.participation.eligibleUnits, 3)
    assert.isFalse(voted.results!.participation.reached)

    // The other owner of the same unit cannot vote again
    await expectStatus(
      s.coOwnerA.api.post(`/resident/surveys/${survey.id}/vote`, {
        unitIds: [s.units.a.id],
        answers: choose(survey, ['No', 'Gris']),
      }),
      409
    )
    const [coOwner] = await dataOf(s.coOwnerA.api.get('/resident/surveys'))
    assert.isFalse(coOwner.canVote)
    assert.isTrue(coOwner.canSeeResults)
    assert.equal(coOwner.units[0].votedBy, s.ownerA.user.fullName)

    // Two units in one go
    const both: Detail = await dataOf(
      s.ownerBC.api.post(`/resident/surveys/${survey.id}/vote`, {
        unitIds: [s.units.b.id, s.units.c.id],
        answers: choose(survey, ['No', 'Blanco']),
      })
    )
    assert.equal(both.results!.participation.votedUnits, 3)
    assert.closeTo(both.results!.participation.votedCoefficient, 1, 0.0001)
    assert.isTrue(both.results!.participation.reached)
    assert.deepEqual(optionResult(both, 0, 'Sí'), {
      optionId: optionResult(both, 0, 'Sí').optionId,
      votes: 1,
      coefficient: 0.5,
    })
    assert.equal(optionResult(both, 0, 'No').votes, 2)
    assert.closeTo(optionResult(both, 0, 'No').coefficient, 0.5, 0.0001)
    assert.equal(optionResult(both, 1, 'Blanco').votes, 3)
  })

  test('anonymous surveys keep no trace of each vote; nominal ones show it', async ({
    client,
    assert,
  }) => {
    const s = await setup(client)
    const anonymous = await published(s)
    await expectStatus(
      s.ownerA.api.post(`/resident/surveys/${anonymous.id}/vote`, {
        unitIds: [s.units.a.id],
        answers: choose(anonymous, ['Sí', 'Gris']),
      }),
      201
    )
    const voters = await dataOf(s.admin.api.get(`/surveys/${anonymous.id}/voters`))
    assert.lengthOf(voters, 1)
    assert.equal(voters[0].unit.id, s.units.a.id)
    assert.isNull(voters[0].answers)
    const stored = await db.from('survey_answers').count('* as total').first()
    assert.equal(Number(stored.total), 0)

    const nominal = await published(s, { anonymous: false })
    await expectStatus(
      s.ownerA.api.post(`/resident/surveys/${nominal.id}/vote`, {
        unitIds: [s.units.a.id],
        answers: choose(nominal, ['No', 'Blanco']),
      }),
      201
    )
    const [vote] = await dataOf(s.council.api.get(`/surveys/${nominal.id}/voters`))
    assert.deepEqual(vote.answers, choose(nominal, ['No', 'Blanco']))
    assert.equal(vote.votedBy, s.ownerA.user.fullName)
  })

  test('results at closing; closed surveys take no votes and stay in the history', async ({
    client,
    assert,
  }) => {
    const s = await setup(client)
    const survey = await published(s, { resultsVisibility: 'after_close' })
    const voted: Detail = await dataOf(
      s.ownerA.api.post(`/resident/surveys/${survey.id}/vote`, {
        unitIds: [s.units.a.id],
        answers: choose(survey, ['Sí', 'Gris']),
      })
    )
    assert.isNull(voted.results)
    // The administration always sees them
    const admin: Detail = await dataOf(s.admin.api.get(`/surveys/${survey.id}`))
    assert.equal(admin.results!.participation.votedUnits, 1)

    // Opened two days ago, closed a minute ago
    await db
      .from('surveys')
      .where('id', survey.id)
      .update({
        opens_at: DateTime.now().minus({ days: 2 }).toISO(),
        closes_at: DateTime.now().minus({ minutes: 1 }).toISO(),
      })
    const closed: Detail = await dataOf(s.ownerBC.api.get(`/resident/surveys/${survey.id}`))
    assert.equal(closed.status, 'closed')
    assert.equal(optionResult(closed, 0, 'Sí').votes, 1)
    await expectStatus(
      s.ownerBC.api.post(`/resident/surveys/${survey.id}/vote`, {
        unitIds: [s.units.b.id],
        answers: choose(survey, ['No', 'Gris']),
      }),
      409
    )
    const history = await dataOf(s.admin.api.get('/surveys', { status: 'closed' }))
    assert.lengthOf(history, 1)

    // Another conjunto does not see it
    const other = await createMember('administrator')
    await expectStatus(apiFor(client, other.tenant, other.user).get(`/surveys/${survey.id}`), 404)
  })

  test('the day before closing, the owners that did not vote are reminded once', async ({
    client,
    assert,
  }) => {
    mail.fake()
    const s = await setup(client)
    const survey = await published(s)
    await expectStatus(
      s.ownerA.api.post(`/resident/surveys/${survey.id}/vote`, {
        unitIds: [s.units.a.id],
        answers: choose(survey, ['Sí', 'Gris']),
      }),
      201
    )
    const service = new SurveysService(s.tenant)
    // Still far from closing
    assert.equal(await service.remindClosing(), 0)
    await db
      .from('surveys')
      .where('id', survey.id)
      .update({ closes_at: DateTime.now().plus({ hours: 10 }).toISO() })
    // Units b and c (one owner); a already voted
    assert.equal(await service.remindClosing(), 1)
    assert.equal(await service.remindClosing(), 0)
    const bell = await dataOf(s.ownerBC.api.get('/notifications', { app: 'web' }))
    assert.equal(bell[0].type, 'survey.reminder')
    const none = await dataOf(s.coOwnerA.api.get('/notifications', { app: 'web' }))
    assert.notInclude(
      none.map((n: { type: string }) => n.type),
      'survey.reminder'
    )
  })
})
