import { test } from '@japa/runner'
import type { ApiClient } from '@japa/api-client'
import testUtils from '@adonisjs/core/services/test_utils'
import drive from '@adonisjs/drive/services/main'
import db from '@adonisjs/lucid/services/db'
import mail from '@adonisjs/mail/services/main'
import { DateTime } from 'luxon'
import type { EnrollmentRole } from '@aptoph/shared'
import NotificationMail from '#mails/notifications/notification_mail'
import Building from '#models/property/building'
import Unit from '#models/property/unit'
import UnitOccupant from '#models/property/unit_occupant'
import type Tenant from '#models/tenants/tenant'
import type User from '#models/auth/user'
import { createMember } from '#tests/helpers'
import { apiFor, dataOf, expectStatus } from '../finance/helpers.js'

const PDF = Buffer.from('%PDF-1.4\n%%EOF\n')

/**
 * A conjunto with two towers and a resident in each, the administration, two
 * staff members, the council and roles without access to PQRS.
 */
async function setup(client: ApiClient) {
  const { tenant, user: admin } = await createMember('administrator')
  const [t1, t2] = await Promise.all(
    ['Torre 1', 'Torre 2'].map((name, i) =>
      Building.create({ tenantId: tenant.id, name, sortOrder: i })
    )
  )
  const person = async (role: EnrollmentRole) => {
    const { user } = await createMember(role, tenant)
    return { user, api: apiFor(client, tenant, user) }
  }
  const resident = async (building: Building, code: string) => {
    const member = await person('resident')
    const unit = await Unit.create({
      tenantId: tenant.id,
      buildingId: building.id,
      code,
      type: 'apartment',
      ownershipCoefficient: '0.1',
      status: 'occupied',
    })
    await UnitOccupant.create({
      tenantId: tenant.id,
      unitId: unit.id,
      userId: member.user.id,
      fullName: member.user.fullName,
      relationship: 'owner',
      isPrimaryContact: true,
    })
    return { ...member, unit }
  }
  return {
    tenant,
    towers: { t1: t1!, t2: t2! },
    admin: { user: admin, api: apiFor(client, tenant, admin) },
    staff: await person('staff'),
    otherStaff: await person('staff'),
    council: await person('council_member'),
    accountant: await person('accountant'),
    guard: await person('security_guard'),
    resident1: await resident(t1!, '101'),
    resident2: await resident(t2!, '201'),
  }
}

type Api = ReturnType<typeof apiFor>

async function file(api: Api, unitId: string | null, overrides: Record<string, unknown> = {}) {
  const response = await api.post('/resident/tickets', {
    unitId,
    type: 'maintenance',
    subject: 'Filtración en el baño',
    description: 'Hay una mancha de humedad que crece en el techo.',
    ...overrides,
  })
  response.assertStatus(201)
  return response.body().data as { id: string; number: number }
}

function upload(client: ApiClient, tenant: Tenant, user: User, ticketId: string) {
  return client
    .post(`/api/v1/tickets/${ticketId}/attachments`)
    .loginAs(user)
    .header('X-Tenant-Id', tenant.id)
    .file('file', PDF, { filename: 'informe.pdf' }) as unknown as Promise<any>
}

function remove(client: ApiClient, tenant: Tenant, user: User, path: string) {
  return client
    .delete(`/api/v1${path}`)
    .loginAs(user)
    .header('X-Tenant-Id', tenant.id) as unknown as Promise<any>
}

const numbers = async (api: Api, qs: Record<string, unknown> = {}) =>
  ((await dataOf(api.get('/tickets', qs))) as Array<{ number: number }>).map((row) => row.number)

test.group('Back-office tickets', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => {
    drive.fake()
    return () => drive.restore()
  })

  test('who can see the bandeja and what each role sees', async ({ client, assert }) => {
    mail.fake()
    const s = await setup(client)
    const first = await file(s.resident1.api, s.resident1.unit.id)
    const second = await file(s.resident2.api, s.resident2.unit.id, { type: 'complaint' })

    for (const member of [s.accountant, s.guard, s.resident1]) {
      await expectStatus(member.api.get('/tickets'), 403)
    }
    assert.deepEqual(await numbers(s.admin.api), [second.number, first.number])
    assert.deepEqual(await numbers(s.council.api), [second.number, first.number])

    // Staff only see what is assigned to them
    assert.deepEqual(await numbers(s.staff.api), [])
    await expectStatus(s.staff.api.get(`/tickets/${first.id}`), 404)
    await expectStatus(
      s.admin.api.patch(`/tickets/${first.id}`, { assignedToId: s.staff.user.id }),
      200
    )
    assert.deepEqual(await numbers(s.staff.api), [first.number])
    await expectStatus(s.staff.api.get(`/tickets/${first.id}`), 200)
    await expectStatus(s.staff.api.get(`/tickets/${second.id}`), 404)
    assert.deepEqual(await numbers(s.otherStaff.api), [])

    // The council only reads
    await expectStatus(
      s.council.api.post(`/tickets/${first.id}/comments`, { body: 'Hola', isInternal: false }),
      403
    )
    await expectStatus(s.council.api.patch(`/tickets/${first.id}`, { status: 'closed' }), 403)
  })

  test('assigning, answering and internal notes', async ({ client, assert }) => {
    const filed = mail.fake()
    const s = await setup(client)
    const ticket = await file(s.resident1.api, s.resident1.unit.id)
    // A new ticket goes to the administration (bell and email)
    filed.mails.assertQueued(NotificationMail, ({ content }) =>
      content.title.startsWith(`Nueva solicitud #${ticket.number}`)
    )
    const { mails } = mail.fake()

    const assigned = await dataOf(
      s.admin.api.patch(`/tickets/${ticket.id}`, {
        assignedToId: s.staff.user.id,
        priority: 'high',
      })
    )
    assert.equal(assigned.assignedTo.id, s.staff.user.id)
    assert.equal(assigned.priority, 'high')
    assert.equal(assigned.status, 'open')
    assert.equal(assigned.createdBy.email, s.resident1.user.email)
    const [assignment] = mails.queued((message) => message instanceof NotificationMail)
    assert.include((assignment as NotificationMail).content.title, `#${ticket.number}`)
    assert.include((assignment as NotificationMail).content.url, `/pqrs?id=${ticket.id}`)

    // Staff cannot prioritize nor reassign, only work on the ticket
    await expectStatus(s.staff.api.patch(`/tickets/${ticket.id}`, { priority: 'low' }), 403)
    await expectStatus(
      s.staff.api.patch(`/tickets/${ticket.id}`, { assignedToId: s.otherStaff.user.id }),
      403
    )
    // Only active administration and staff of this conjunto can be assigned
    const assignees = (await dataOf(s.admin.api.get('/tickets/assignees'))) as Array<{
      id: string
    }>
    assert.sameMembers(
      assignees.map((a) => a.id),
      [s.admin.user.id, s.staff.user.id, s.otherStaff.user.id]
    )
    const outsider = await createMember('staff')
    await expectStatus(
      s.admin.api.patch(`/tickets/${ticket.id}`, { assignedToId: outsider.user.id }),
      422
    )
    await expectStatus(
      s.admin.api.patch(`/tickets/${ticket.id}`, { assignedToId: s.council.user.id }),
      422
    )

    // An internal note: no email, the resident does not see it, the status stays
    const note = await s.staff.api.post(`/tickets/${ticket.id}/comments`, {
      body: 'El apartamento de arriba también reporta humedad.',
      isInternal: true,
    })
    note.assertStatus(201)
    assert.isTrue(note.body().data.isInternal)
    assert.lengthOf(
      mails.queued((message) => message instanceof NotificationMail),
      1,
      'only the assignment email so far'
    )

    // The first public reply moves it to «En trámite» and emails the resident
    const reply = await s.staff.api.post(`/tickets/${ticket.id}/comments`, {
      body: 'El jueves pasa el técnico.\n\nGracias por avisar.',
      isInternal: false,
    })
    reply.assertStatus(201)
    const detail = await dataOf(s.admin.api.get(`/tickets/${ticket.id}`))
    assert.equal(detail.status, 'in_progress')
    assert.lengthOf(detail.comments, 2)
    const emails = mails.queued(
      (message) => message instanceof NotificationMail
    ) as NotificationMail[]
    assert.lengthOf(emails, 2)
    assert.deepEqual(emails[1]!.content.paragraphs, [
      'El jueves pasa el técnico.',
      'Gracias por avisar.',
    ])
    assert.include(emails[1]!.content.url, `/pqrs/${ticket.id}`)

    const seen = await dataOf(s.resident1.api.get(`/resident/tickets/${ticket.id}`))
    assert.deepEqual(
      seen.comments.map((c: { body: string }) => c.body),
      ['El jueves pasa el técnico.\n\nGracias por avisar.']
    )

    // The resident's answer shows up in the back-office as theirs
    await expectStatus(
      s.resident1.api.post(`/resident/tickets/${ticket.id}/comments`, { body: 'Gracias' }),
      201
    )
    const after = await dataOf(s.staff.api.get(`/tickets/${ticket.id}`))
    assert.isTrue(after.comments[2].isFromRequester)
    assert.isFalse(after.comments[1].isFromRequester)
  })

  test('resolving, closing and reopening', async ({ client, assert }) => {
    mail.fake()
    const s = await setup(client)
    const ticket = await file(s.resident1.api, s.resident1.unit.id)
    // Counted from here: the new ticket already emailed the administration
    const { mails } = mail.fake()

    const resolved = await s.admin.api.post(`/tickets/${ticket.id}/comments`, {
      body: 'Listo, ya quedó arreglado.',
      isInternal: false,
      status: 'resolved',
    })
    resolved.assertStatus(201)
    let detail = await dataOf(s.admin.api.get(`/tickets/${ticket.id}`))
    assert.equal(detail.status, 'resolved')
    assert.isNotNull(detail.resolvedAt)
    // One email with the reply and the new status
    assert.lengthOf(
      mails.queued((message) => message instanceof NotificationMail),
      1
    )

    detail = await dataOf(s.admin.api.patch(`/tickets/${ticket.id}`, { status: 'closed' }))
    assert.equal(detail.status, 'closed')
    assert.lengthOf(
      mails.queued((message) => message instanceof NotificationMail),
      2
    )

    // A closed ticket takes internal notes but not replies, unless it is reopened
    await expectStatus(
      s.admin.api.post(`/tickets/${ticket.id}/comments`, { body: 'Hola', isInternal: false }),
      409
    )
    await expectStatus(
      s.admin.api.post(`/tickets/${ticket.id}/comments`, { body: 'Archivado', isInternal: true }),
      201
    )
    await expectStatus(
      s.admin.api.post(`/tickets/${ticket.id}/comments`, {
        body: 'La reabrimos para revisar de nuevo.',
        isInternal: false,
        status: 'in_progress',
      }),
      201
    )
    detail = await dataOf(s.admin.api.get(`/tickets/${ticket.id}`))
    assert.equal(detail.status, 'in_progress')
    assert.isNull(detail.resolvedAt)
  })

  test('filters, overdue tickets and stats', async ({ client, assert }) => {
    mail.fake()
    const s = await setup(client)
    const leak = await file(s.resident1.api, s.resident1.unit.id)
    const noise = await file(s.resident2.api, s.resident2.unit.id, {
      type: 'complaint',
      subject: 'Ruido en la noche',
    })
    const lamp = await file(s.resident2.api, null, { subject: 'Luminaria del parqueadero' })

    // The leak was filed 10 days ago with medium priority (7 days): overdue
    await db
      .from('tickets')
      .where('id', leak.id)
      .update({ created_at: DateTime.now().minus({ days: 10 }).toJSDate() })
    await expectStatus(
      s.admin.api.patch(`/tickets/${noise.id}`, { assignedToId: s.admin.user.id }),
      200
    )
    await expectStatus(s.admin.api.patch(`/tickets/${lamp.id}`, { status: 'resolved' }), 200)

    assert.deepEqual(await numbers(s.admin.api, { type: 'complaint' }), [noise.number])
    assert.deepEqual(await numbers(s.admin.api, { buildingId: s.towers.t1.id }), [leak.number])
    assert.deepEqual(await numbers(s.admin.api, { status: 'active' }), [noise.number, leak.number])
    assert.deepEqual(await numbers(s.admin.api, { status: 'resolved' }), [lamp.number])
    assert.deepEqual(await numbers(s.admin.api, { overdue: true }), [leak.number])
    assert.deepEqual(await numbers(s.admin.api, { assignedTo: 'me' }), [noise.number])
    assert.deepEqual(await numbers(s.admin.api, { assignedTo: 'none' }), [lamp.number, leak.number])
    assert.deepEqual(await numbers(s.admin.api, { search: `#${lamp.number}` }), [lamp.number])
    assert.deepEqual(await numbers(s.admin.api, { search: 'ruido' }), [noise.number])
    assert.deepEqual(await numbers(s.admin.api, { search: '101' }), [leak.number])
    const today = DateTime.now().setZone('America/Bogota').toISODate()!
    assert.deepEqual(await numbers(s.admin.api, { from: today }), [lamp.number, noise.number])
    await expectStatus(s.admin.api.get('/tickets', { from: 'ayer' }), 422)

    const rows = (await dataOf(s.admin.api.get('/tickets'))) as Array<{
      number: number
      isOverdue: boolean
    }>
    assert.isTrue(rows.find((row) => row.number === leak.number)!.isOverdue)

    const stats = await dataOf(s.admin.api.get('/tickets/stats'))
    assert.deepEqual(stats, {
      open: 2,
      inProgress: 0,
      resolved: 1,
      closed: 0,
      overdue: 1,
      unassigned: 1,
      mine: 1,
    })
    // Staff counts only cover their tickets
    const staffStats = await dataOf(s.staff.api.get('/tickets/stats'))
    assert.equal(staffStats.open, 0)
  })

  test('attachments follow who can see the ticket', async ({ client, assert }) => {
    mail.fake()
    const s = await setup(client)
    const ticket = await file(s.resident1.api, s.resident1.unit.id)
    await expectStatus(
      s.admin.api.patch(`/tickets/${ticket.id}`, { assignedToId: s.staff.user.id }),
      200
    )

    const uploaded = await expectStatus(upload(client, s.tenant, s.staff.user, ticket.id), 201)
    const id = uploaded.body().data.id
    const withFile = await dataOf(s.admin.api.get(`/tickets/${ticket.id}`))
    assert.lengthOf(withFile.attachments, 1)

    await expectStatus(s.council.api.get(`/tickets/attachments/${id}/url`), 200)
    await expectStatus(s.otherStaff.api.get(`/tickets/attachments/${id}/url`), 404)
    await expectStatus(upload(client, s.tenant, s.council.user, ticket.id), 403)
    await expectStatus(
      remove(client, s.tenant, s.otherStaff.user, `/tickets/attachments/${id}`),
      404
    )
    await expectStatus(remove(client, s.tenant, s.staff.user, `/tickets/attachments/${id}`), 204)
    const withoutFile = await dataOf(s.admin.api.get(`/tickets/${ticket.id}`))
    assert.lengthOf(withoutFile.attachments, 0)
  })

  test('tickets of another conjunto do not exist', async ({ client }) => {
    mail.fake()
    const s = await setup(client)
    const other = await setup(client)
    const ticket = await file(s.resident1.api, s.resident1.unit.id)

    await expectStatus(other.admin.api.get(`/tickets/${ticket.id}`), 404)
    await expectStatus(other.admin.api.patch(`/tickets/${ticket.id}`, { status: 'closed' }), 404)
    await expectStatus(
      other.admin.api.post(`/tickets/${ticket.id}/comments`, { body: 'Hola', isInternal: false }),
      404
    )
    await expectStatus(
      s.admin.api.patch(`/tickets/${ticket.id}`, { assignedToId: other.staff.user.id }),
      422
    )
  })
})
