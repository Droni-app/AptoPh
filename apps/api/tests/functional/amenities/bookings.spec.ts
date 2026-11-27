import { test } from '@japa/runner'
import type { ApiClient } from '@japa/api-client'
import testUtils from '@adonisjs/core/services/test_utils'
import drive from '@adonisjs/drive/services/main'
import mail from '@adonisjs/mail/services/main'
import { DateTime } from 'luxon'
import Charge from '#models/finance/charge'
import UnitOccupant from '#models/property/unit_occupant'
import type Unit from '#models/property/unit'
import type Tenant from '#models/tenants/tenant'
import type User from '#models/auth/user'
import { createMember } from '#tests/helpers'
import {
  apiFor,
  dataOf,
  expectStatus,
  financeSetup,
  trialBalanceIsBalanced,
  unitCharges,
} from '../finance/helpers.js'

const ZONE = 'America/Bogota'
const PDF = Buffer.from('%PDF-1.4\n%%EOF\n')

/** A local day `n` days from now, at `hour` */
const day = (n: number) => DateTime.now().setZone(ZONE).plus({ days: n }).startOf('day')
const at = (n: number, hour: number, minute = 0) => day(n).set({ hour, minute }).toISO()!
/** A day `n`+ days ahead that is not a Monday (some areas close on Mondays) */
const date = (n: number) => {
  let d = day(n)
  while (d.weekday === 1) d = d.plus({ days: 1 })
  return d.toISODate()!
}

async function resident(client: ApiClient, tenant: Tenant, unit: Unit) {
  const { user } = await createMember('resident', tenant)
  await UnitOccupant.create({
    tenantId: tenant.id,
    unitId: unit.id,
    userId: user.id,
    fullName: user.fullName,
    relationship: 'owner',
    isPrimaryContact: true,
  })
  return { user, api: apiFor(client, tenant, user) }
}

async function setup(client: ApiClient) {
  const finance = await financeSetup(client, { fees: false })
  const { tenant, units } = finance
  return {
    ...finance,
    admin: { user: finance.user, api: finance.api },
    ana: await resident(client, tenant, units.a),
    beto: await resident(client, tenant, units.b),
  }
}

type Setup = Awaited<ReturnType<typeof setup>>

const area = (overrides: Record<string, unknown> = {}) => ({
  name: 'Zona BBQ',
  description: 'Asador y mesas',
  capacity: 20,
  bookingMode: 'hours',
  bookingFee: null,
  externalFee: null,
  depositAmount: null,
  paymentMode: 'statement',
  requiresApproval: false,
  allowDelinquent: true,
  allowGuests: false,
  allowExternal: false,
  terms: null,
  color: '#ea580c',
  rules: { opensAt: '10:00', closesAt: '21:00', slotMinutes: 60, minHours: 2, maxHours: 4 },
  ...overrides,
})

async function createArea(s: Setup, overrides: Record<string, unknown> = {}) {
  const response = await s.admin.api.post('/amenities', area(overrides))
  response.assertStatus(201)
  return response.body().data as { id: string; name: string }
}

function remove(client: ApiClient, tenant: Tenant, user: User, path: string) {
  return client
    .delete(`/api/v1${path}`)
    .loginAs(user)
    .header('X-Tenant-Id', tenant.id) as unknown as Promise<any>
}

function upload(client: ApiClient, tenant: Tenant, user: User, bookingId: string) {
  return client
    .post(`/api/v1/resident/bookings/${bookingId}/attachments`)
    .loginAs(user)
    .header('X-Tenant-Id', tenant.id)
    .file('file', PDF, { filename: 'soporte.pdf' }) as unknown as Promise<any>
}

test.group('Common areas · configuration', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('the administration creates areas; the rules must make sense', async ({
    client,
    assert,
  }) => {
    mail.fake()
    const s = await setup(client)
    const bbq = await createArea(s, { allowExternal: true, externalFee: 90_000 })

    await expectStatus(s.admin.api.post('/amenities', area()), 422) // same name
    await expectStatus(
      s.admin.api.post('/amenities', area({ name: 'Salón', bookingMode: 'shifts', rules: {} })),
      422
    )
    await expectStatus(
      s.admin.api.post(
        '/amenities',
        area({ name: 'Cancha', rules: { opensAt: '20:00', closesAt: '08:00' } })
      ),
      422
    )
    await expectStatus(
      s.admin.api.post(
        '/amenities',
        area({
          name: 'Salón',
          bookingMode: 'shifts',
          rules: {
            shifts: [
              { id: 'a', name: 'Mañana', startsAt: '08:00', endsAt: '14:00' },
              { id: 'b', name: 'Tarde', startsAt: '13:00', endsAt: '18:00' },
            ],
          },
        })
      ),
      422
    )
    // Money received before means someone verifies it
    const salon = await dataOf(
      s.admin.api.post(
        '/amenities',
        area({ name: 'Salón', paymentMode: 'prepaid', requiresApproval: false })
      )
    )
    assert.isTrue(salon.requiresApproval)

    // Residents see the areas, not what third parties pay; nor can they change them
    const seen = await dataOf(s.ana.api.get('/resident/amenities'))
    assert.lengthOf(seen, 2)
    assert.isNull(seen.find((row: { id: string }) => row.id === bbq.id).externalFee)
    await expectStatus(s.ana.api.post('/amenities', area({ name: 'Otra' })), 403)
    await expectStatus(s.ana.api.get('/bookings/calendar', { from: date(1), to: date(7) }), 403)

    // The guard sees the calendar but does not manage it
    const { user: guard } = await createMember('security_guard', s.tenant)
    const gate = apiFor(client, s.tenant, guard)
    await expectStatus(gate.get('/bookings/calendar', { from: date(1), to: date(7) }), 200)
    await expectStatus(gate.post('/amenities', area({ name: 'Otra' })), 403)
  })
})

test.group('Common areas · bookings', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => {
    drive.fake()
    return () => drive.restore()
  })

  test('by the hour: blocks, opening hours, cleaning time and availability', async ({
    client,
    assert,
  }) => {
    mail.fake()
    const s = await setup(client)
    const bbq = await createArea(s, {
      rules: {
        opensAt: '10:00',
        closesAt: '21:00',
        slotMinutes: 60,
        minHours: 2,
        maxHours: 4,
        bufferMinutes: 30,
      },
    })
    const n = DateTime.fromISO(date(5)).diff(day(0), 'days').days
    const book = (who: Setup['ana'], unit: Unit, from: number, to: number, minute = 0) =>
      who.api.post('/resident/bookings', {
        amenityId: bbq.id,
        bookingType: 'resident',
        unitId: unit.id,
        startsAt: at(n, from, minute),
        endsAt: at(n, to, minute),
        guestsCount: 8,
      })

    const first = await book(s.ana, s.units.a, 12, 14)
    first.assertStatus(201)
    // No approval and no fee: confirmed at once
    assert.equal(first.body().data.status, 'approved')
    assert.equal(first.body().data.number, 1)

    // Cleaning time after it: 14:00 is still taken
    const clash = await book(s.beto, s.units.b, 14, 16)
    clash.assertStatus(409)
    await expectStatus(book(s.beto, s.units.b, 14, 16, 30), 422) // not on the hour
    await expectStatus(book(s.beto, s.units.b, 8, 10), 422) // before it opens
    await expectStatus(book(s.beto, s.units.b, 15, 20), 422) // longer than 4 hours
    await expectStatus(book(s.beto, s.units.b, 15, 16), 422) // shorter than 2 hours
    await expectStatus(book(s.beto, s.units.b, 15, 17), 201)
    // Someone else's unit
    await expectStatus(book(s.beto, s.units.a, 18, 20), 404)

    const availability = await dataOf(
      s.beto.api.get(`/resident/amenities/${bbq.id}/availability`, { from: date(5), to: date(5) })
    )
    assert.lengthOf(availability.busy, 2)
    assert.notProperty(availability.busy[0], 'unit')
    assert.equal(
      DateTime.fromISO(availability.busy[0].blockedUntil).diff(
        DateTime.fromISO(availability.busy[0].endsAt),
        'minutes'
      ).minutes,
      30
    )
    // Others' bookings stay private
    await expectStatus(s.beto.api.get(`/resident/bookings/${first.body().data.id}`), 404)
  })

  test('shifts paid in advance: receipt, approval with its accounting and the deposit', async ({
    client,
    assert,
  }) => {
    mail.fake()
    const s = await setup(client)
    const salon = await createArea(s, {
      name: 'Salón social',
      capacity: 60,
      bookingMode: 'shifts',
      bookingFee: 80_000,
      depositAmount: 200_000,
      paymentMode: 'prepaid',
      requiresApproval: true,
      terms: 'Se entrega limpio.',
      rules: {
        shifts: [
          { id: 'manana', name: 'Mañana', startsAt: '08:00', endsAt: '13:00' },
          { id: 'tarde', name: 'Tarde', startsAt: '13:00', endsAt: '18:00' },
          { id: 'noche', name: 'Noche', startsAt: '18:00', endsAt: '23:00' },
        ],
      },
    })
    const request = {
      amenityId: salon.id,
      bookingType: 'resident',
      unitId: s.units.a.id,
      date: date(10),
      shiftIds: ['noche', 'tarde'],
      guestsCount: 30,
      paymentReference: 'Transferencia 5521',
    }
    const quote = await dataOf(s.ana.api.post('/resident/bookings/quote', request))
    assert.equal(quote.fee, '160000.00')
    assert.equal(quote.deposit, '200000.00')
    assert.equal(quote.payNow, '360000.00')
    assert.equal(DateTime.fromISO(quote.startsAt).setZone(ZONE).hour, 13)

    await expectStatus(
      s.ana.api.post('/resident/bookings', { ...request, shiftIds: ['manana', 'noche'] }),
      422
    )
    await expectStatus(s.ana.api.post('/resident/bookings', request), 422) // the terms
    const created = await dataOf(
      s.ana.api.post('/resident/bookings', { ...request, acceptTerms: true })
    )
    assert.equal(created.status, 'pending')
    assert.equal(created.feeAmount, '160000.00')

    // The administration hears about it
    const office = await s.admin.api.get('/notifications', { app: 'backoffice' })
    assert.equal(office.body().data[0].type, 'booking.requested')

    // Without the receipt it cannot be approved
    await expectStatus(
      s.admin.api.post(`/bookings/${created.id}/approve`, { cashAccountId: s.bankId }),
      409
    )
    await expectStatus(upload(client, s.tenant, s.ana.user, created.id), 201)
    await expectStatus(s.admin.api.post(`/bookings/${created.id}/approve`, {}), 422) // where the money went
    const approved = await dataOf(
      s.admin.api.post(`/bookings/${created.id}/approve`, {
        cashAccountId: s.bankId,
        method: 'bank_transfer',
      })
    )
    assert.equal(approved.status, 'approved')
    assert.isNotNull(approved.chargeId)
    assert.isNotNull(approved.paymentId)
    assert.equal(approved.depositStatus, 'held')
    assert.equal(approved.attachments.length, 1)
    // Paid in advance: the charge is born paid
    const [charge] = await unitCharges(s.api, s.units.a.id)
    assert.equal(charge!.amount, '160000.00')
    assert.equal(charge!.status, 'paid')
    assert.isTrue(await trialBalanceIsBalanced(s.api))
    // Paid and approved: only the administration cancels it now
    assert.isFalse(approved.canCancel === true && approved.paymentId === null)
    await expectStatus(
      remove(client, s.tenant, s.ana.user, `/resident/bookings/${created.id}`),
      409
    )

    const portal = await s.ana.api.get('/notifications', { app: 'web' })
    assert.equal(portal.body().data[0].type, 'booking.approved')

    // After the event: part of the deposit pays for damages
    await expectStatus(
      s.admin.api.post(`/bookings/${created.id}/deposit`, {
        outcome: 'retained',
        retainedAmount: 50_000,
        cashAccountId: s.bankId,
      }),
      422
    )
    const settled = await dataOf(
      s.admin.api.post(`/bookings/${created.id}/deposit`, {
        outcome: 'retained',
        retainedAmount: 50_000,
        cashAccountId: s.bankId,
        note: 'Mancha en el piso de madera',
      })
    )
    assert.equal(settled.depositStatus, 'retained')
    assert.equal(settled.depositRetained, '50000.00')
    assert.isTrue(await trialBalanceIsBalanced(s.api))
    await expectStatus(
      s.admin.api.post(`/bookings/${created.id}/deposit`, {
        outcome: 'returned',
        cashAccountId: s.bankId,
      }),
      409
    )
  })

  test('by days, charged to the statement; units in arrears cannot book', async ({
    client,
    assert,
  }) => {
    mail.fake()
    const s = await setup(client)
    const kiosk = await createArea(s, {
      name: 'Kiosko',
      bookingMode: 'days',
      bookingFee: 50_000,
      requiresApproval: true,
      allowDelinquent: false,
      rules: { opensAt: '08:00', closesAt: '22:00', maxDays: 2 },
    })
    // Apartment A owes a fee already due
    await Charge.create({
      tenantId: s.tenant.id,
      unitId: s.units.a.id,
      chargeConceptId: s.concept('ordinary_fee'),
      period: day(-40).startOf('month'),
      amount: '120000.00',
      balance: '120000.00',
      dueOn: day(-20),
      status: 'pending',
      sourceType: 'manual',
      discountAmount: '0.00',
    })
    const request = (unitId: string, days = 2) => ({
      amenityId: kiosk.id,
      bookingType: 'resident',
      unitId,
      date: date(8),
      days,
    })
    const owing = await s.ana.api.post('/resident/bookings', request(s.units.a.id))
    owing.assertStatus(422)
    assert.include(JSON.stringify(owing.body()), 'saldo vencido')
    await expectStatus(s.beto.api.post('/resident/bookings', request(s.units.b.id, 3)), 422)

    const booked = await dataOf(s.beto.api.post('/resident/bookings', request(s.units.b.id)))
    assert.equal(booked.feeAmount, '100000.00')
    const start = DateTime.fromISO(booked.startsAt).setZone(ZONE)
    const end = DateTime.fromISO(booked.endsAt).setZone(ZONE)
    assert.equal(start.hour, 8)
    assert.equal(end.hour, 22)
    assert.equal(end.diff(start.startOf('day'), 'days').days | 0, 1)

    // Approved: the fee goes to the statement with the next fee
    const approved = await dataOf(s.admin.api.post(`/bookings/${booked.id}/approve`, {}))
    assert.isNotNull(approved.chargeId)
    assert.isNull(approved.paymentId)
    let [charge] = await unitCharges(s.api, s.units.b.id)
    assert.equal(charge!.status, 'pending')

    // The resident cancels before it starts: the charge is voided
    const cancelled = await dataOf(
      remove(client, s.tenant, s.beto.user, `/resident/bookings/${booked.id}`)
    )
    assert.equal(cancelled.status, 'cancelled')
    ;[charge] = await unitCharges(s.api, s.units.b.id)
    assert.equal(charge!.status, 'cancelled')
    assert.isTrue(await trialBalanceIsBalanced(s.api))
    const office = await s.admin.api.get('/notifications', { app: 'backoffice' })
    assert.equal(office.body().data[0].type, 'booking.cancelled')
  })

  test('guests, third parties and maintenance blocks', async ({ client, assert }) => {
    mail.fake()
    const s = await setup(client)
    const salon = await createArea(s, {
      name: 'Salón social',
      bookingFee: 20_000,
      requiresApproval: true,
      rules: { opensAt: '08:00', closesAt: '23:00', maxHours: 8 },
    })
    const n = DateTime.fromISO(date(6)).diff(day(0), 'days').days
    const slot = (from: number, to: number) => ({ startsAt: at(n, from), endsAt: at(n, to) })
    const guest = {
      amenityId: salon.id,
      bookingType: 'guest',
      unitId: s.units.a.id,
      holder: { name: 'Lucía Méndez', phone: '3105550101' },
      ...slot(10, 12),
    }
    await expectStatus(s.ana.api.post('/resident/bookings', guest), 422) // not allowed yet
    await expectStatus(
      s.ana.api.post('/resident/bookings', {
        ...guest,
        bookingType: 'external',
        unitId: null,
      }),
      422
    )

    await s.admin.api.put(
      `/amenities/${salon.id}`,
      area({
        name: 'Salón social',
        bookingFee: 20_000,
        externalFee: 300_000,
        allowGuests: true,
        allowExternal: true,
        requiresApproval: true,
        rules: { opensAt: '08:00', closesAt: '23:00', maxHours: 8 },
      })
    )
    const forGuest = await dataOf(s.ana.api.post('/resident/bookings', guest))
    assert.equal(forGuest.bookingType, 'guest')
    assert.equal(forGuest.holder.name, 'Lucía Méndez')
    assert.equal(forGuest.feeAmount, '40000.00')

    // A third party: only the administration registers it, and it pays in advance
    const external = {
      amenityId: salon.id,
      bookingType: 'external',
      holder: { name: 'Fundación Manos Unidas', document: '900123456' },
      ...slot(14, 18),
    }
    await expectStatus(s.ana.api.post('/resident/bookings', external), 422)
    const third = await dataOf(
      s.admin.api.post('/bookings', { ...external, approve: { cashAccountId: s.bankId } })
    )
    assert.equal(third.status, 'approved')
    assert.equal(third.feeAmount, '1200000.00')
    assert.isNull(third.unit)
    assert.isTrue(await trialBalanceIsBalanced(s.api))

    // A maintenance block closes the agenda
    await expectStatus(
      s.ana.api.post('/resident/bookings', {
        amenityId: salon.id,
        bookingType: 'block',
        ...slot(19, 22),
      }),
      422
    )
    const block = await dataOf(
      s.admin.api.post('/bookings', {
        amenityId: salon.id,
        bookingType: 'block',
        notes: 'Pintura',
        ...slot(19, 23),
      })
    )
    assert.equal(block.status, 'approved')
    const clash = await s.beto.api.post('/resident/bookings', {
      amenityId: salon.id,
      bookingType: 'resident',
      unitId: s.units.b.id,
      ...slot(20, 22),
    })
    clash.assertStatus(409)
    assert.include(JSON.stringify(clash.body()), 'mantenimiento')

    const calendar = await dataOf(
      s.admin.api.get('/bookings/calendar', { from: date(6), to: date(6) })
    )
    assert.lengthOf(calendar, 3)
    const stats = await dataOf(s.admin.api.get('/bookings/stats'))
    assert.equal(stats.pending, 1)

    // Rejected: the slot is free again and the unit is told why
    await expectStatus(s.admin.api.post(`/bookings/${forGuest.id}/reject`, { reason: 'x' }), 422)
    await expectStatus(
      s.admin.api.post(`/bookings/${forGuest.id}/reject`, { reason: 'Hay evento del conjunto' }),
      200
    )
    const portal = await s.ana.api.get('/notifications', { app: 'web' })
    assert.equal(portal.body().data[0].type, 'booking.rejected')
    await expectStatus(
      s.beto.api.post('/resident/bookings', {
        amenityId: salon.id,
        bookingType: 'resident',
        unitId: s.units.b.id,
        ...slot(10, 12),
      }),
      201
    )
  })

  test('limits per unit, notice and cancellation deadline', async ({ client, assert }) => {
    mail.fake()
    const s = await setup(client)
    const gym = await createArea(s, {
      name: 'Gimnasio',
      bookingMode: 'hours',
      rules: {
        opensAt: '05:00',
        closesAt: '22:00',
        maxHours: 2,
        minNoticeHours: 24,
        maxDaysAhead: 10,
        maxActivePerUnit: 1,
        cancelHours: 48,
      },
    })
    const book = (n: number, hour: number) =>
      s.ana.api.post('/resident/bookings', {
        amenityId: gym.id,
        bookingType: 'resident',
        unitId: s.units.a.id,
        startsAt: at(n, hour),
        endsAt: at(n, hour + 1),
      })
    await expectStatus(
      s.ana.api.post('/resident/bookings', {
        amenityId: gym.id,
        bookingType: 'resident',
        unitId: s.units.a.id,
        startsAt: DateTime.now().plus({ hours: 2 }).startOf('hour').toISO(),
        endsAt: DateTime.now().plus({ hours: 3 }).startOf('hour').toISO(),
      }),
      422
    ) // less than 24 hours ahead
    await expectStatus(book(30, 6), 422) // more than 10 days ahead
    const soon = await dataOf(book(2, 6))
    // Inside the 48-hour cancellation window: only the administration cancels
    assert.isFalse(soon.canCancel)
    await expectStatus(book(5, 6), 422) // one active booking per unit

    const cancelled = await dataOf(
      s.admin.api.post(`/bookings/${soon.id}/cancel`, { reason: 'Mantenimiento de máquinas' })
    )
    assert.equal(cancelled.status, 'cancelled')
    const portal = await s.ana.api.get('/notifications', { app: 'web' })
    assert.equal(portal.body().data[0].type, 'booking.cancelled')
    await expectStatus(book(5, 6), 201)
  })
})
