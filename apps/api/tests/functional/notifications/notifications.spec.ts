import { test } from '@japa/runner'
import type { ApiClient } from '@japa/api-client'
import testUtils from '@adonisjs/core/services/test_utils'
import mail from '@adonisjs/mail/services/main'
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@aptoph/shared'
import NotificationMail from '#mails/notifications/notification_mail'
import Unit from '#models/property/unit'
import UnitOccupant from '#models/property/unit_occupant'
import type User from '#models/auth/user'
import PushDevice from '#models/notifications/push_device'
import { NotificationService } from '#services/notifications/notifications'
import { createMember } from '#tests/helpers'
import { apiFor, expectStatus } from '../finance/helpers.js'

/** A conjunto with its administrator and a resident of apartment 101 */
async function setup(client: ApiClient) {
  const { tenant, user: admin } = await createMember('administrator')
  const { user: resident } = await createMember('resident', tenant)
  const unit = await Unit.create({
    tenantId: tenant.id,
    code: '101',
    type: 'apartment',
    ownershipCoefficient: '0.1',
    status: 'occupied',
  })
  await UnitOccupant.create({
    tenantId: tenant.id,
    unitId: unit.id,
    userId: resident.id,
    fullName: resident.fullName,
    relationship: 'owner',
    isPrimaryContact: true,
  })
  return {
    tenant,
    unit,
    admin: { user: admin, api: apiFor(client, tenant, admin) },
    resident: { user: resident, api: apiFor(client, tenant, resident) },
  }
}

type Setup = Awaited<ReturnType<typeof setup>>

const removeDevice = (client: ApiClient, user: User, token: string) =>
  client
    .delete(`/api/v1/account/push-devices/${encodeURIComponent(token)}`)
    .loginAs(user) as unknown as Promise<any>

async function fileTicket(s: Setup) {
  const response = await s.resident.api.post('/resident/tickets', {
    unitId: s.unit.id,
    type: 'maintenance',
    subject: 'Filtración en el baño',
    description: 'Hay una mancha de humedad que crece en el techo.',
  })
  response.assertStatus(201)
  return response.body().data as { id: string; number: number }
}

const bell = (api: Setup['admin']['api'], app: 'web' | 'backoffice') =>
  api.get('/notifications', { app }).then((response) => {
    response.assertStatus(200)
    return response.body() as {
      data: Array<{ id: string; type: string; title: string; path: string; readAt: string | null }>
      unread: number
    }
  })

const unreadOf = async (api: Setup['admin']['api'], app: 'web' | 'backoffice') => {
  const { unread } = await bell(api, app)
  return unread
}

test.group('Notifications', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('the bell of each app: list, read and read all', async ({ client, assert }) => {
    mail.fake()
    const s = await setup(client)
    const ticket = await fileTicket(s)

    // The new ticket lands in the back-office bell of the administration
    const office = await bell(s.admin.api, 'backoffice')
    assert.equal(office.unread, 1)
    assert.equal(office.data[0]!.type, 'ticket.created')
    assert.equal(office.data[0]!.path, `/pqrs?id=${ticket.id}`)
    // …and not in the portal bell, nor in the resident's
    assert.equal(await unreadOf(s.admin.api, 'web'), 0)
    assert.equal(await unreadOf(s.resident.api, 'backoffice'), 0)

    // The administration answers: the resident sees it in the portal
    await expectStatus(
      s.admin.api.post(`/tickets/${ticket.id}/comments`, {
        body: 'El jueves pasa el técnico.',
        isInternal: false,
      }),
      201
    )
    const portal = await bell(s.resident.api, 'web')
    assert.isAtLeast(portal.unread, 1)
    const reply = portal.data.find((row) => row.type === 'ticket.reply')!
    assert.equal(reply.path, `/pqrs/${ticket.id}`)
    assert.isNull(reply.readAt)

    const unread = await s.resident.api.get('/notifications/unread', { app: 'web' })
    assert.equal(unread.body().unread, portal.unread)

    // Someone else's notification does not exist for you
    await expectStatus(s.admin.api.post(`/notifications/${reply.id}/read`), 404)

    const read = await s.resident.api.post(`/notifications/${reply.id}/read`)
    read.assertStatus(200)
    assert.isNotNull(read.body().data.readAt)
    assert.equal(read.body().unread, portal.unread - 1)

    await expectStatus(s.admin.api.post('/notifications/read-all', { app: 'backoffice' }), 200)
    assert.equal(await unreadOf(s.admin.api, 'backoffice'), 0)

    await expectStatus(s.resident.api.get('/notifications', { app: 'mobile' }), 422)
  })

  test('a notification belongs to its conjunto', async ({ client, assert }) => {
    mail.fake()
    const s = await setup(client)
    await fileTicket(s)
    const {
      data: [notification],
    } = await bell(s.admin.api, 'backoffice')

    // The same administrator in another conjunto sees an empty bell there
    const other = await createMember('administrator')
    const elsewhere = apiFor(client, other.tenant, s.admin.user)
    await other.tenant.related('enrollments').create({
      userId: s.admin.user.id,
      role: 'administrator',
      status: 'active',
    })
    assert.equal(await unreadOf(elsewhere, 'backoffice'), 0)
    await expectStatus(elsewhere.post(`/notifications/${notification!.id}/read`), 404)
  })

  test('preferences by category and channel', async ({ client, assert }) => {
    const { mails } = mail.fake()
    const s = await setup(client)

    const initial = await s.resident.api.get('/account/notification-preferences')
    initial.assertStatus(200)
    assert.deepEqual(initial.body().data, DEFAULT_NOTIFICATION_PREFERENCES)
    assert.isFalse(initial.body().pushAvailable)
    assert.equal(initial.body().devices, 0)

    // An incomplete matrix is refused
    await expectStatus(
      s.resident.api.put('/account/notification-preferences', {
        preferences: { tickets: { email: false, push: false } },
      }),
      422
    )

    const preferences = {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      tickets: { email: false, push: true },
    }
    const saved = await s.resident.api.put('/account/notification-preferences', { preferences })
    saved.assertStatus(200)
    assert.deepEqual(saved.body().data, preferences)

    // Without email for PQRS: the answer reaches the bell, not the inbox
    const ticket = await fileTicket(s)
    const before = mails.queued((message) => message instanceof NotificationMail).length
    await expectStatus(
      s.admin.api.post(`/tickets/${ticket.id}/comments`, {
        body: 'Ya quedó.',
        isInternal: false,
      }),
      201
    )
    assert.lengthOf(
      mails.queued((message) => message instanceof NotificationMail),
      before,
      'no email to the resident'
    )
    const portal = await bell(s.resident.api, 'web')
    assert.isTrue(portal.data.some((row) => row.type === 'ticket.reply'))
  })

  test('the email follows the event and carries the link to the profile', async ({ client }) => {
    const { mails } = mail.fake()
    const s = await setup(client)
    const ticket = await fileTicket(s)
    await expectStatus(
      s.admin.api.post(`/tickets/${ticket.id}/comments`, {
        body: 'El jueves pasa el técnico.',
        isInternal: false,
      }),
      201
    )
    mails.assertQueued(NotificationMail, ({ content }) => {
      return (
        content.title.includes(`#${ticket.number}`) &&
        content.url.endsWith(`/pqrs/${ticket.id}`) &&
        content.preferencesUrl.endsWith('/perfil#notificaciones')
      )
    })
  })

  test('the same event never notifies twice', async ({ client, assert }) => {
    const { mails } = mail.fake()
    const s = await setup(client)
    const service = new NotificationService(s.tenant)
    const input = {
      app: 'web' as const,
      category: 'finance' as const,
      type: 'charges.due_soon',
      title: 'Tu cuenta vence pronto',
      dedupeKey: `due:test:${s.unit.id}`,
      email: { paragraphs: ['Paga a tiempo.'] },
    }
    assert.equal(await service.notify([s.resident.user.id, s.resident.user.id], input), 1)
    assert.equal(await service.notify([s.resident.user.id], input), 0)
    assert.equal(await unreadOf(s.resident.api, 'web'), 1)
    assert.lengthOf(
      mails.queued((message) => message instanceof NotificationMail),
      1
    )
    // Without a key every call is a new notification
    await service.notify(await service.residentsOf([s.unit.id]), { ...input, dedupeKey: null })
    assert.equal(await unreadOf(s.resident.api, 'web'), 2)
  })

  test('phones of the mobile app', async ({ client, assert }) => {
    const s = await setup(client)
    const token = 'fcm-token-'.padEnd(64, 'x')

    await expectStatus(
      s.resident.api.post('/account/push-devices', { token: 'corto', platform: 'android' }),
      422
    )
    await expectStatus(
      s.resident.api.post('/account/push-devices', {
        token,
        platform: 'android',
        deviceName: 'Pixel 9',
        appVersion: '1.0.0',
      }),
      204
    )
    // Registering again keeps one row
    await expectStatus(
      s.resident.api.post('/account/push-devices', { token, platform: 'android' }),
      204
    )
    const prefs = await s.resident.api.get('/account/notification-preferences')
    assert.equal(prefs.body().devices, 1)

    // The phone signs in with another account: the token moves
    await expectStatus(
      s.admin.api.post('/account/push-devices', { token, platform: 'android' }),
      204
    )
    const device = await PushDevice.findByOrFail('token', token)
    assert.equal(device.userId, s.admin.user.id)

    // Someone else cannot remove it; its owner can
    await expectStatus(removeDevice(client, s.resident.user, token), 204)
    assert.exists(await PushDevice.findBy('token', token))
    await expectStatus(removeDevice(client, s.admin.user, token), 204)
    assert.notExists(await PushDevice.findBy('token', token))
  })
})
