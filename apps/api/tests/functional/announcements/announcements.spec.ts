import { test } from '@japa/runner'
import type { ApiClient } from '@japa/api-client'
import testUtils from '@adonisjs/core/services/test_utils'
import drive from '@adonisjs/drive/services/main'
import db from '@adonisjs/lucid/services/db'
import mail from '@adonisjs/mail/services/main'
import { DateTime } from 'luxon'
import type { EnrollmentRole, OccupantRelationship } from '@aptoph/shared'
import AnnouncementMail from '#mails/announcements/announcement_mail'
import Building from '#models/property/building'
import type Tenant from '#models/tenants/tenant'
import Unit from '#models/property/unit'
import UnitOccupant from '#models/property/unit_occupant'
import type User from '#models/auth/user'
import { dispatchDueAnnouncementEmails } from '#services/announcements/announcements'
import { EmailQuotaService, quotaPeriod } from '#services/announcements/email_quota'
import { createMember } from '#tests/helpers'
import { apiFor, dataOf, expectStatus } from '../finance/helpers.js'

const PDF = Buffer.from('%PDF-1.4\n%%EOF\n')

/**
 * A conjunto with two towers. People: the administrator, an owner in tower 1,
 * a renter in tower 1, an owner in tower 2, a council member and a guard.
 */
async function setup(client: ApiClient) {
  const { tenant, user: admin } = await createMember('administrator')
  const [t1, t2] = await Promise.all(
    ['Torre 1', 'Torre 2'].map((name, i) =>
      Building.create({ tenantId: tenant.id, name, sortOrder: i })
    )
  )
  const person = async (
    role: EnrollmentRole,
    occupancy?: { building: Building; code: string; relationship: OccupantRelationship }
  ) => {
    const { user } = await createMember(role, tenant)
    if (occupancy) {
      const unit = await Unit.create({
        tenantId: tenant.id,
        buildingId: occupancy.building.id,
        code: occupancy.code,
        type: 'apartment',
        ownershipCoefficient: '0.1',
        status: 'occupied',
      })
      await UnitOccupant.create({
        tenantId: tenant.id,
        unitId: unit.id,
        userId: user.id,
        fullName: user.fullName,
        relationship: occupancy.relationship,
        isPrimaryContact: true,
      })
    }
    return { user, api: apiFor(client, tenant, user) }
  }
  return {
    tenant,
    admin: { user: admin, api: apiFor(client, tenant, admin) },
    towers: { t1: t1!, t2: t2! },
    owner1: await person('resident', { building: t1!, code: '101', relationship: 'owner' }),
    renter1: await person('resident', { building: t1!, code: '102', relationship: 'renter' }),
    owner2: await person('resident', { building: t2!, code: '201', relationship: 'owner' }),
    council: await person('council_member'),
    guard: await person('security_guard'),
  }
}

type Api = ReturnType<typeof apiFor>

async function visibleTitles(api: Api) {
  const rows = (await dataOf(api.get('/resident/announcements'))) as Array<{ title: string }>
  return rows.map((row) => row.title).sort()
}

function remove(client: ApiClient, tenant: Tenant, user: User, path: string) {
  return client.delete(`/api/v1${path}`).loginAs(user).header('X-Tenant-Id', tenant.id)
}

const draft = (overrides: Record<string, unknown> = {}) => ({
  title: 'Corte de agua',
  body: 'Mañana no habrá agua de 8 a 12.\n\nGracias por su comprensión.',
  audience: 'all',
  buildingIds: [],
  isPinned: false,
  sendEmail: false,
  publish: 'draft',
  ...overrides,
})

test.group('Announcements', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => {
    drive.fake()
    return () => drive.restore()
  })

  test('residents only see published announcements addressed to them', async ({
    client,
    assert,
  }) => {
    const { admin, towers, owner1, renter1, owner2 } = await setup(client)

    const tower1 = await admin.api.post(
      '/announcements',
      draft({ title: 'Torre 1', audience: 'residents', buildingIds: [towers.t1.id] })
    )
    tower1.assertStatus(201)
    assert.equal(tower1.body().data.status, 'draft')
    assert.deepEqual(
      tower1.body().data.buildings.map((b: { name: string }) => b.name),
      ['Torre 1']
    )
    // Drafts are invisible
    assert.deepEqual(await visibleTitles(owner1.api), [])

    await expectStatus(admin.api.post(`/announcements/${tower1.body().data.id}/publish`), 200)
    await expectStatus(
      admin.api.post(
        '/announcements',
        draft({ title: 'Propietarios', audience: 'owners', publish: 'now' })
      ),
      201
    )
    await expectStatus(
      admin.api.post(
        '/announcements',
        draft({ title: 'Consejo', audience: 'council', publish: 'now' })
      ),
      201
    )
    await expectStatus(
      admin.api.post('/announcements', draft({ title: 'Todos', publish: 'now' })),
      201
    )

    assert.deepEqual(await visibleTitles(owner1.api), ['Propietarios', 'Todos', 'Torre 1'])
    assert.deepEqual(await visibleTitles(renter1.api), ['Todos', 'Torre 1'])
    assert.deepEqual(await visibleTitles(owner2.api), ['Propietarios', 'Todos'])
    await expectStatus(owner2.api.get(`/resident/announcements/${tower1.body().data.id}`), 404)
  })

  test('opening an announcement marks it read and feeds the read report', async ({
    client,
    assert,
  }) => {
    const { admin, towers, owner1, renter1, council } = await setup(client)
    const created = await admin.api.post(
      '/announcements',
      draft({ audience: 'residents', buildingIds: [towers.t1.id], publish: 'now' })
    )
    const id = created.body().data.id

    const before = await dataOf(admin.api.get(`/announcements/${id}`))
    assert.deepEqual(before.reads, { read: 0, total: 2 })

    const opened = await owner1.api.get(`/resident/announcements/${id}`)
    opened.assertStatus(200)
    assert.isNotNull(opened.body().data.readAt)
    await owner1.api.get(`/resident/announcements/${id}`)

    const readers = (await dataOf(admin.api.get(`/announcements/${id}/readers`))) as Array<{
      fullName: string
      detail: string
      readAt: string | null
    }>
    assert.lengthOf(readers, 2)
    assert.equal(readers[0]!.fullName, owner1.user.fullName)
    assert.equal(readers[0]!.detail, 'Torre 1 · 101')
    assert.isNotNull(readers[0]!.readAt)
    assert.equal(readers[1]!.fullName, renter1.user.fullName)
    assert.isNull(readers[1]!.readAt)

    // The council reads its announcements in the back-office
    const forCouncil = await admin.api.post(
      '/announcements',
      draft({ audience: 'council', publish: 'now' })
    )
    await council.api.get(`/announcements/${forCouncil.body().data.id}`)
    const councilReads = await dataOf(admin.api.get(`/announcements/${forCouncil.body().data.id}`))
    assert.deepEqual(councilReads.reads, { read: 1, total: 1 })
  })

  test('scheduled announcements appear at their time and email the audience once', async ({
    client,
    assert,
  }) => {
    const { mails } = mail.fake()
    const { admin, owner1, renter1, owner2 } = await setup(client)

    const past = await admin.api.post(
      '/announcements',
      draft({ publish: 'schedule', publishAt: DateTime.now().minus({ hours: 1 }).toISO() })
    )
    past.assertStatus(422)

    const scheduled = await admin.api.post(
      '/announcements',
      draft({
        title: 'Asamblea',
        audience: 'owners',
        sendEmail: true,
        publish: 'schedule',
        publishAt: DateTime.now().plus({ days: 1 }).toISO(),
      })
    )
    scheduled.assertStatus(201)
    const id = scheduled.body().data.id
    assert.equal(scheduled.body().data.status, 'scheduled')
    assert.deepEqual(await visibleTitles(owner1.api), [])

    await dispatchDueAnnouncementEmails()
    mails.assertNoneQueued()

    // Its time comes
    await db
      .from('announcements')
      .where('id', id)
      .update({ published_at: DateTime.now().minus({ minutes: 1 }).toJSDate() })
    assert.deepEqual(await visibleTitles(owner1.api), ['Asamblea'])
    assert.deepEqual(await visibleTitles(renter1.api), [])

    await dispatchDueAnnouncementEmails()
    await dispatchDueAnnouncementEmails()
    const sent = mails.queued((message) => message instanceof AnnouncementMail)
    assert.lengthOf(sent, 2)
    const to = sent.map((message) => message.message.toJSON().message.to)
    assert.sameMembers(
      to.flat().map((address: any) => address.address),
      [owner1.user.email, owner2.user.email]
    )
    // The email renders its template with the title, the paragraphs and the link
    const first = sent[0]!
    await first.message.computeContents({ brandName: 'AptoPH' })
    const html = String(first.message.toJSON().message.html)
    assert.include(html, 'Asamblea')
    assert.include(html, 'Mañana no habrá agua de 8 a 12.')
    assert.include(html, `/comunicados/${id}`)

    const detail = await dataOf(admin.api.get(`/announcements/${id}`))
    assert.equal(detail.emailCount, 2)
    assert.isNotNull(detail.emailedAt)

    // Unpublishing and publishing again does not resend it
    await admin.api.post(`/announcements/${id}/unpublish`)
    await admin.api.post(`/announcements/${id}/publish`)
    await dispatchDueAnnouncementEmails()
    assert.lengthOf(
      mails.queued((message) => message instanceof AnnouncementMail),
      2
    )
  })

  test('the monthly email quota blocks the announcements it cannot cover', async ({
    client,
    assert,
  }) => {
    const { mails } = mail.fake()
    const { tenant, admin } = await setup(client)
    const owners = draft({ title: 'Asamblea', audience: 'owners', sendEmail: true, publish: 'now' })
    // One email left this month; the owners are two people
    await db
      .table('email_quotas')
      .insert({ tenant_id: tenant.id, period: quotaPeriod(tenant), used: 2999 })

    const preview = await dataOf(
      admin.api.post('/announcements/email-preview', { audience: 'owners', buildingIds: [] })
    )
    assert.equal(preview.recipients, 2)
    assert.include(preview.quota, { used: 2999, limit: 3000, available: 1 })

    const blocked = await admin.api.post('/announcements', owners)
    blocked.assertStatus(422)
    assert.equal(blocked.body().errors[0].field, 'sendEmail')
    // Without email it is published
    await expectStatus(admin.api.post('/announcements', { ...owners, sendEmail: false }), 201)

    // Additional packs (paid in Wompi: docs/billing.md)
    await new EmailQuotaService(tenant).addPacks(1)
    const activated = await dataOf(admin.api.get('/email-quota'))
    assert.include(activated, { extraPacks: 1, limit: 6000, available: 3001 })

    await expectStatus(admin.api.post('/announcements', owners), 201)
    await dispatchDueAnnouncementEmails()
    assert.lengthOf(
      mails.queued((message) => message instanceof AnnouncementMail),
      2
    )
    const quota = await dataOf(admin.api.get('/email-quota'))
    assert.include(quota, { used: 3001, available: 2999 })
  })

  test('a scheduled announcement without quota at its time goes out without email', async ({
    client,
    assert,
  }) => {
    const { mails } = mail.fake()
    const { tenant, admin, owner1 } = await setup(client)
    const scheduled = await dataOf(
      admin.api.post(
        '/announcements',
        draft({
          title: 'Asamblea',
          audience: 'owners',
          sendEmail: true,
          publish: 'schedule',
          publishAt: DateTime.now().plus({ minutes: 5 }).toISO(),
        })
      )
    )
    // Meanwhile the month's quota runs out, and its time comes
    await db
      .table('email_quotas')
      .insert({ tenant_id: tenant.id, period: quotaPeriod(tenant), used: 3000 })
    await db
      .from('announcements')
      .where('id', scheduled.id)
      .update({ published_at: DateTime.now().minus({ minutes: 1 }).toJSDate() })

    await dispatchDueAnnouncementEmails()
    mails.assertNoneQueued()
    assert.deepEqual(await visibleTitles(owner1.api), ['Asamblea'])
    const skipped = await dataOf(admin.api.get(`/announcements/${scheduled.id}`))
    assert.include(skipped, { emailSkipped: true, emailCount: 0 })

    // Once there is quota, saving it with email sends it
    const retry = draft({ title: 'Asamblea', audience: 'owners', sendEmail: true, publish: 'now' })
    await expectStatus(admin.api.put(`/announcements/${scheduled.id}`, retry), 422)
    await new EmailQuotaService(tenant).addPacks(1)
    const saved = await dataOf(admin.api.put(`/announcements/${scheduled.id}`, retry))
    assert.isFalse(saved.emailSkipped)
    await dispatchDueAnnouncementEmails()
    assert.lengthOf(
      mails.queued((message) => message instanceof AnnouncementMail),
      2
    )
    const sent = await dataOf(admin.api.get(`/announcements/${scheduled.id}`))
    assert.include(sent, { emailSkipped: false, emailCount: 2 })
  })

  test('the administration and the council write; other roles only read', async ({ client }) => {
    const { tenant, admin, council, guard, owner1 } = await setup(client)
    const { user: accountant } = await createMember('accountant', tenant)
    const accountantApi = apiFor(client, tenant, accountant)

    await expectStatus(council.api.post('/announcements', draft()), 201)
    await expectStatus(accountantApi.post('/announcements', draft()), 403)
    await expectStatus(guard.api.post('/announcements', draft()), 403)
    await expectStatus(guard.api.get('/announcements'), 200)
    await expectStatus(owner1.api.get('/announcements'), 403)

    const created = await admin.api.post('/announcements', draft({ publish: 'now' }))
    const id = created.body().data.id
    await expectStatus(
      admin.api.put(
        `/announcements/${id}`,
        draft({ title: 'Corte de agua (corregido)', publish: 'now' })
      ),
      200
    )
    const removed = await remove(client, tenant, admin.user, `/announcements/${id}`)
    removed.assertStatus(204)
    await expectStatus(admin.api.get(`/announcements/${id}`), 404)
    await expectStatus(owner1.api.get(`/resident/announcements/${id}`), 404)
  })

  test('attachments of an announcement reach only its audience', async ({ client, assert }) => {
    const { tenant, admin, towers, owner1, owner2 } = await setup(client)
    const created = await admin.api.post(
      '/announcements',
      draft({ audience: 'residents', buildingIds: [towers.t1.id], publish: 'now' })
    )
    const id = created.body().data.id

    const uploaded = await client
      .post(`/api/v1/announcements/${id}/attachments`)
      .loginAs(admin.user)
      .header('X-Tenant-Id', tenant.id)
      .file('file', PDF, { filename: 'Circular 12.pdf' })
    uploaded.assertStatus(201)
    const attachmentId = uploaded.body().data.id
    const row = await db.from('attachments').where('id', attachmentId).first()
    assert.match(row.file_key, new RegExp(`^${tenant.slug}/comunicados/\\d{4}/\\d{2}/`))

    const list = (await dataOf(owner1.api.get('/resident/announcements'))) as Array<{
      attachmentCount: number
    }>
    assert.equal(list[0]!.attachmentCount, 1)
    const detail = await dataOf(owner1.api.get(`/resident/announcements/${id}`))
    assert.equal(detail.attachments[0].fileName, 'Circular 12.pdf')

    await expectStatus(
      owner1.api.get(`/resident/announcements/attachments/${attachmentId}/url`),
      200
    )
    await expectStatus(
      owner2.api.get(`/resident/announcements/attachments/${attachmentId}/url`),
      404
    )
    // Finance routes do not reach announcement files
    await expectStatus(admin.api.get(`/finance/attachments/${attachmentId}/url`), 404)

    const removed = await remove(
      client,
      tenant,
      admin.user,
      `/announcements/attachments/${attachmentId}`
    )
    removed.assertStatus(204)
    const after = await dataOf(owner1.api.get(`/resident/announcements/${id}`))
    assert.lengthOf(after.attachments, 0)
  })
})
