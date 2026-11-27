import { createHash } from 'node:crypto'
import { test } from '@japa/runner'
import type { ApiClient } from '@japa/api-client'
import testUtils from '@adonisjs/core/services/test_utils'
import mail from '@adonisjs/mail/services/main'
import { DateTime, Settings } from 'luxon'
import type { EnrollmentRole } from '@aptoph/shared'
import Building from '#models/property/building'
import ParkingAssignment from '#models/property/parking_assignment'
import Unit from '#models/property/unit'
import UnitOccupant from '#models/property/unit_occupant'
import Vehicle from '#models/property/vehicle'
import ParkingMail from '#mails/property/parking_mail'
import { createMember } from '#tests/helpers'
import { apiFor, dataOf, expectStatus } from '../finance/helpers.js'

const ZONE = 'America/Bogota'

function clock(day: string, time = '10:00') {
  const ms = DateTime.fromISO(`${day}T${time}`, { zone: ZONE }).toMillis()
  Settings.now = () => ms
}

const settings = {
  mode: 'mixed',
  maxSpotsPerUnit: 2,
  rates: {
    car: { communal: 62_000, private: 0 },
    motorcycle: { communal: 20_000, private: 0 },
    bicycle: { communal: 0, private: 0 },
    other: { communal: 0, private: 0 },
  },
  lotteryMonths: 6,
  offerDays: 3,
  requirements: {
    noDebt: true,
    debtToleranceDays: 0,
    vehicle: true,
    documents: true,
    priorityWithoutPrivate: true,
  },
  allowThirdPartyVehicles: false,
}

/**
 * A mixed conjunto: 101 has a private spot (PQ-1), 102, 103 and 104 do not.
 * 101 and 102 have a resident with an account; 101-103 a car with its SOAT.
 */
async function setup(client: ApiClient, communalSpots = 1) {
  const { tenant, user: admin } = await createMember('administrator')
  const building = await Building.create({ tenantId: tenant.id, name: 'Torre 1', sortOrder: 0 })
  const apartment = (code: string) =>
    Unit.create({
      tenantId: tenant.id,
      buildingId: building.id,
      code,
      type: 'apartment',
      ownershipCoefficient: '0.25',
      status: 'occupied',
    })
  const units = {
    a101: await apartment('101'),
    a102: await apartment('102'),
    a103: await apartment('103'),
    a104: await apartment('104'),
  }
  await Unit.create({
    tenantId: tenant.id,
    buildingId: building.id,
    code: 'PQ-1',
    type: 'parking',
    ownershipCoefficient: '0.01',
    status: 'occupied',
    parentUnitId: units.a101.id,
  })
  const person = async (role: EnrollmentRole) => {
    const { user } = await createMember(role, tenant)
    return { user, api: apiFor(client, tenant, user) }
  }
  const resident = async (unit: Unit) => {
    const p = await person('resident')
    await UnitOccupant.create({
      tenantId: tenant.id,
      unitId: unit.id,
      userId: p.user.id,
      fullName: p.user.fullName,
      relationship: 'owner',
      isPrimaryContact: true,
      isBillingResponsible: true,
    })
    return p
  }
  const soat = DateTime.fromISO('2027-12-31')
  for (const [unit, plate] of [
    [units.a101, 'AAA101'],
    [units.a102, 'AAA102'],
    [units.a103, 'AAA103'],
  ] as const) {
    await Vehicle.create({
      tenantId: tenant.id,
      unitId: unit.id,
      plate,
      type: 'car',
      soatExpiresOn: soat,
    })
  }
  const administration = { user: admin, api: apiFor(client, tenant, admin) }
  await expectStatus(administration.api.put('/parking/settings', settings), 200)
  await dataOf(administration.api.post('/parking/spots/import'))
  await expectStatus(
    administration.api.post('/parking/spots/batch', {
      prefix: 'C-',
      from: 1,
      to: communalSpots,
      digits: 2,
      vehicleType: 'car',
      ownership: 'communal',
    }),
    201
  )
  return {
    tenant,
    ...units,
    admin: administration,
    council: await person('council_member'),
    guard: await person('security_guard'),
    r101: await resident(units.a101),
    r102: await resident(units.a102),
  }
}

type Setup = Awaited<ReturnType<typeof setup>>

const lotteryInput = (overrides: Record<string, unknown> = {}) => ({
  title: 'Sorteo primer semestre',
  closesAt: '2026-01-20T23:59:00-05:00',
  periodStartsOn: '2026-02-01',
  ...overrides,
})

async function openLottery(s: Setup, overrides: Record<string, unknown> = {}) {
  return dataOf(s.admin.api.post('/parking/lotteries', lotteryInput(overrides)))
}

const applications = async (s: Setup, lotteryId: string) =>
  dataOf(s.admin.api.get(`/parking/lotteries/${lotteryId}/applications`))

test.group('Parking lottery', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => () => {
    Settings.now = () => Date.now()
    mail.restore()
  })

  test('applications, auditable draw and the waiting list', async ({ client, assert }) => {
    clock('2026-01-10')
    const { mails } = mail.fake()
    const s = await setup(client)

    const lottery = await openLottery(s, { notify: true })
    assert.equal(lottery.status, 'open')
    assert.equal(lottery.periodEndsOn, '2026-07-31')
    assert.isNull(lottery.seed)
    assert.deepEqual(lottery.spots, [{ type: 'car', count: 1 }])
    // Opening notice to the two residents with an account (bulk quota)
    assert.equal(lottery.notifiedCount, 2)
    mails.assertQueuedCount(ParkingMail, 2)
    // One open at a time
    await expectStatus(s.admin.api.post('/parking/lotteries', lotteryInput()), 409)

    // The portal shows what each unit can apply for
    const portal = await dataOf(s.r102.api.get('/resident/parking'))
    assert.equal(portal.lottery.id, lottery.id)
    assert.deepEqual(portal.units[0].eligibility, [
      { vehicleType: 'car', errors: [], warnings: [] },
    ])

    const mine = await dataOf(
      s.r102.api.post('/resident/parking/applications', { unitId: s.a102.id, vehicleType: 'car' })
    )
    assert.equal(mine.status, 'pending')
    assert.equal(mine.priorityGroup, 0)
    // Once per type, and only for their units
    await expectStatus(
      s.r102.api.post('/resident/parking/applications', { unitId: s.a102.id, vehicleType: 'car' }),
      422
    )
    await expectStatus(
      s.r102.api.post('/resident/parking/applications', { unitId: s.a103.id, vehicleType: 'car' }),
      404
    )
    const withPrivate = await dataOf(
      s.r101.api.post('/resident/parking/applications', { unitId: s.a101.id, vehicleType: 'car' })
    )
    assert.equal(withPrivate.priorityGroup, 1)
    // The administration applies on behalf of 104, which has no car: it does not meet
    const without = await expectStatus(
      s.admin.api.post(`/parking/lotteries/${lottery.id}/applications`, {
        unitId: s.a104.id,
        vehicleType: 'car',
      }),
      422
    )
    assert.include(without.body().errors[0].message, 'No tiene registrado un vehículo tipo carro')

    // Council consults, the guards do not
    await expectStatus(s.council.api.get(`/parking/lotteries/${lottery.id}/applications`), 200)
    await expectStatus(s.guard.api.get('/parking/lotteries'), 403)
    await expectStatus(s.council.api.post(`/parking/lotteries/${lottery.id}/draw`), 403)

    // Draw
    clock('2026-01-21')
    const drawn = await dataOf(s.admin.api.post(`/parking/lotteries/${lottery.id}/draw`))
    assert.equal(drawn.status, 'drawn')
    assert.match(drawn.seed, /^[0-9a-f]{64}$/)
    await expectStatus(s.admin.api.post(`/parking/lotteries/${lottery.id}/draw`), 409)

    const list = await applications(s, lottery.id)
    const byUnit = (code: string) =>
      list.find((a: { unit: { code: string } }) => a.unit.code === code)
    // Without a private spot goes first: 102 wins, 101 waits
    assert.equal(byUnit('102').status, 'won')
    assert.equal(byUnit('102').spot.code, 'C-01')
    assert.equal(byUnit('101').status, 'waiting')
    assert.equal(byUnit('101').queuePosition, 1)
    // Anyone can repeat it with the published seed
    for (const application of list) {
      assert.equal(
        application.drawHash,
        createHash('sha256').update(`${drawn.seed}:${application.id}`).digest('hex')
      )
    }
    mails.assertQueued(ParkingMail, ({ content }) => content.title.includes('Ganaste'))
    mails.assertQueued(ParkingMail, ({ content }) => content.title.includes('lista de espera'))

    // Won: scheduled for the period, starts on its own
    const scheduled = await ParkingAssignment.findByOrFail('application_id', byUnit('102').id)
    assert.equal(scheduled.status, 'scheduled')
    assert.equal(scheduled.endsOn?.toISODate(), '2026-07-31')
    clock('2026-02-02')
    const current = await dataOf(s.admin.api.get('/parking/assignments?current=true'))
    assert.equal(current.length, 1)
    assert.equal(current[0].status, 'active')

    // Cancelled: the unit is told and the spot is offered to the next one
    const ended = await expectStatus(
      s.admin.api.post(`/parking/assignments/${scheduled.id}/end`, {
        status: 'cancelled',
        reason: 'rules_violation',
        note: 'Parqueó en zona de visitantes',
      }),
      200
    )
    assert.equal(ended.body().offeredTo.unitId, s.a101.id)
    mails.assertQueued(ParkingMail, ({ content }) => content.title.includes('Se canceló'))
    mails.assertQueued(ParkingMail, ({ content }) => content.title.includes('Se liberó'))

    const portal101 = await dataOf(s.r101.api.get('/resident/parking'))
    const offer = portal101.applications[0]
    assert.equal(offer.status, 'offered')
    assert.equal(offer.spot.code, 'C-01')
    assert.isNotNull(offer.offerExpiresAt)
    // Only the unit answers its offer
    await expectStatus(s.r102.api.post(`/resident/parking/applications/${offer.id}/accept`), 404)
    const accepted = await dataOf(
      s.r101.api.post(`/resident/parking/applications/${offer.id}/accept`)
    )
    assert.equal(accepted.status, 'accepted')
    const holding = await ParkingAssignment.findByOrFail('application_id', offer.id)
    assert.equal(holding.status, 'active')
    assert.equal(holding.startsOn.toISODate(), '2026-02-02')
    assert.equal(holding.endsOn?.toISODate(), '2026-07-31')
  })

  test('offers expire, are declined and late applications', async ({ client, assert }) => {
    clock('2026-01-10')
    mail.fake()
    const s = await setup(client)
    const lottery = await openLottery(s, { periodStartsOn: '2026-01-21' })
    for (const unit of [s.a102, s.a103]) {
      await expectStatus(
        s.admin.api.post(`/parking/lotteries/${lottery.id}/applications`, {
          unitId: unit.id,
          vehicleType: 'car',
        }),
        200
      )
    }
    await expectStatus(
      s.r101.api.post('/resident/parking/applications', { unitId: s.a101.id, vehicleType: 'car' }),
      200
    )
    clock('2026-01-21')
    await dataOf(s.admin.api.post(`/parking/lotteries/${lottery.id}/draw`))
    let list = await applications(s, lottery.id)
    const winner = list.find((a: { status: string }) => a.status === 'won')
    // Starts today: active right away
    const assignment = await ParkingAssignment.findByOrFail('application_id', winner.id)
    assert.equal(assignment.status, 'active')
    const waiting = list
      .filter((a: { status: string }) => a.status === 'waiting')
      .sort(
        (a: { queuePosition: number }, b: { queuePosition: number }) =>
          a.queuePosition - b.queuePosition
      )
    assert.lengthOf(waiting, 2)
    // 101 has a private spot: last in the list
    assert.equal(waiting[1].unit.code, '101')

    // A new spot: the administration gives it straight to the first one in the list
    const extra = await dataOf(
      s.admin.api.post('/parking/spots', {
        code: 'C-02',
        vehicleType: 'car',
        ownership: 'communal',
      })
    )
    const direct = await dataOf(
      s.admin.api.post(`/parking/applications/${waiting[0].id}/assign`, { spotId: extra.id })
    )
    assert.equal(direct.status, 'accepted')
    assert.equal(direct.spot.code, 'C-02')
    assert.isNotNull(direct.assignmentId)
    // Not a free spot any more
    await expectStatus(
      s.admin.api.post(`/parking/applications/${waiting[1].id}/assign`, { spotId: extra.id }),
      422
    )

    await dataOf(
      s.admin.api.post(`/parking/assignments/${assignment.id}/end`, {
        status: 'cancelled',
        reason: 'resident_resigned',
        note: 'Ya no lo necesita',
      })
    )
    list = await applications(s, lottery.id)
    assert.equal(list.find((a: { id: string }) => a.id === waiting[1].id).status, 'offered')

    // Without an answer in 3 days it lapses; nobody left, the spot stays free
    clock('2026-01-25')
    list = await applications(s, lottery.id)
    assert.equal(list.find((a: { id: string }) => a.id === waiting[1].id).status, 'expired')
    const lapsed = await ParkingAssignment.query()
      .where('application_id', waiting[1].id)
      .firstOrFail()
    assert.equal(lapsed.status, 'rejected')
    assert.equal(lapsed.endReason, 'offer_expired')
    let summary = await dataOf(s.admin.api.get('/parking/summary'))
    assert.equal(summary.byType.find((t: { type: string }) => t.type === 'car').free, 1)

    // Applying after the draw: end of the list, and the free spot is offered right away
    await Vehicle.create({
      tenantId: s.tenant.id,
      unitId: s.a104.id,
      plate: 'AAA104',
      type: 'car',
      soatExpiresOn: DateTime.fromISO('2027-12-31'),
    })
    const late = await dataOf(
      s.admin.api.post(`/parking/lotteries/${lottery.id}/applications`, {
        unitId: s.a104.id,
        vehicleType: 'car',
      })
    )
    assert.isTrue(late.late)
    list = await applications(s, lottery.id)
    assert.equal(list.find((a: { id: string }) => a.id === late.id).status, 'offered')
    summary = await dataOf(s.admin.api.get('/parking/summary'))
    assert.equal(summary.byType.find((t: { type: string }) => t.type === 'car').free, 0)

    // Declined (withdrawn while offered): the spot is free again
    const declined = await dataOf(s.admin.api.post(`/parking/applications/${late.id}/withdraw`))
    assert.equal(declined.status, 'declined')
    summary = await dataOf(s.admin.api.get('/parking/summary'))
    assert.equal(summary.byType.find((t: { type: string }) => t.type === 'car').free, 1)
  })

  test('a new lottery ends the previous period', async ({ client, assert }) => {
    clock('2026-01-10')
    mail.fake()
    const s = await setup(client, 2)
    const first = await openLottery(s, { periodStartsOn: '2026-01-15', periodEndsOn: '2026-06-30' })
    for (const unit of [s.a102, s.a103]) {
      await dataOf(
        s.admin.api.post(`/parking/lotteries/${first.id}/applications`, {
          unitId: unit.id,
          vehicleType: 'car',
        })
      )
    }
    clock('2026-01-15')
    await dataOf(s.admin.api.post(`/parking/lotteries/${first.id}/draw`))
    const held = await ParkingAssignment.query().where('lottery_id', first.id)
    assert.lengthOf(held, 2)
    assert.isTrue(held.every((a) => a.status === 'active'))

    // Applications closed: wait for the result
    clock('2026-05-20')
    const second = await openLottery(s, {
      closesAt: '2026-06-10T18:00:00-05:00',
      periodStartsOn: '2026-07-01',
    })
    await dataOf(
      s.r101.api.post('/resident/parking/applications', { unitId: s.a101.id, vehicleType: 'car' })
    )
    clock('2026-06-11')
    await expectStatus(
      s.r102.api.post('/resident/parking/applications', { unitId: s.a102.id, vehicleType: 'car' }),
      409
    )
    // Lent until the next period starts, not after it
    await dataOf(s.admin.api.post(`/parking/lotteries/${second.id}/draw`))
    const won = await ParkingAssignment.query()
      .where('lottery_id', second.id)
      .preload('spot')
      .firstOrFail()
    assert.equal(won.status, 'scheduled')
    assert.equal(won.startsOn.toISODate(), '2026-07-01')
    assert.equal(won.endsOn?.toISODate(), '2026-12-31')

    // The holders of the first period end the day before
    const previous = await ParkingAssignment.query().where('lottery_id', first.id)
    assert.isTrue(previous.every((a) => a.endsOn?.toISODate() === '2026-06-30'))
    const lotteries = await dataOf(s.admin.api.get('/parking/lotteries'))
    assert.equal(lotteries.find((l: { id: string }) => l.id === first.id).status, 'finished')

    clock('2026-07-01')
    const current = await dataOf(s.admin.api.get('/parking/assignments?current=true'))
    assert.lengthOf(current, 1)
    assert.equal(current[0].unit.code, '101')
    assert.equal(current[0].status, 'active')
  })

  test('cancel before drawing and other conjuntos', async ({ client, assert }) => {
    clock('2026-01-10')
    mail.fake()
    const s = await setup(client)
    const other = await setup(client)
    const lottery = await openLottery(s)

    await expectStatus(other.admin.api.get(`/parking/lotteries/${lottery.id}`), 404)
    await expectStatus(other.admin.api.post(`/parking/lotteries/${lottery.id}/draw`), 404)
    await expectStatus(
      other.r102.api.post('/resident/parking/applications', {
        unitId: s.a102.id,
        vehicleType: 'car',
      }),
      404
    )

    const edited = await dataOf(
      s.admin.api.patch(`/parking/lotteries/${lottery.id}`, { periodStartsOn: '2026-03-01' })
    )
    assert.equal(edited.periodEndsOn, '2026-08-31')
    const cancelled = await dataOf(s.admin.api.post(`/parking/lotteries/${lottery.id}/cancel`))
    assert.equal(cancelled.status, 'cancelled')
    await expectStatus(
      s.r102.api.post('/resident/parking/applications', { unitId: s.a102.id, vehicleType: 'car' }),
      409
    )
    // Another one can open now
    await expectStatus(s.admin.api.post('/parking/lotteries', lotteryInput()), 200)
  })
})
