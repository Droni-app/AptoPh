import { test } from '@japa/runner'
import type { ApiClient } from '@japa/api-client'
import testUtils from '@adonisjs/core/services/test_utils'
import mail from '@adonisjs/mail/services/main'
import { DateTime, Settings } from 'luxon'
import type { EnrollmentRole } from '@aptoph/shared'
import ParkingReceiptMail from '#mails/gatehouse/parking_receipt_mail'
import Building from '#models/property/building'
import UnitOccupant from '#models/property/unit_occupant'
import Unit from '#models/property/unit'
import Vehicle from '#models/property/vehicle'
import Visit from '#models/gatehouse/visit'
import { createMember } from '#tests/helpers'
import {
  apiFor,
  dataOf,
  expectStatus,
  trialBalanceIsBalanced,
  unitCharges,
} from '../finance/helpers.js'

const ZONE = 'America/Bogota'

/** Freezes the clock of the API (luxon) at a local time of the conjunto */
function clock(iso: string) {
  const ms = DateTime.fromISO(iso, { zone: ZONE }).toMillis()
  Settings.now = () => ms
}

const settings = (overrides: Record<string, unknown> = {}) => ({
  enabled: true,
  vehicles: {
    car: { capacity: 1, hourlyRate: 3000, dailyCap: null },
    motorcycle: { capacity: 5, hourlyRate: 1000, dailyCap: 8000 },
    bicycle: { capacity: 10, hourlyRate: 0, dailyCap: null },
    other: { capacity: 0, hourlyRate: 0, dailyCap: null },
  },
  graceHours: 1,
  fractionMinutes: 30,
  vat: { enabled: true, rate: 19 },
  paymentMode: 'ask',
  cashAccountId: null,
  maxStayHours: 12,
  ...overrides,
})

/** A conjunto with a unit in a tower, a cash box for the gate and a guard */
async function setup(client: ApiClient) {
  const { tenant, user: admin } = await createMember('administrator')
  const building = await Building.create({ tenantId: tenant.id, name: 'Torre 1', sortOrder: 0 })
  const unit = await Unit.create({
    tenantId: tenant.id,
    buildingId: building.id,
    code: '101',
    type: 'apartment',
    ownershipCoefficient: '0.5',
    status: 'occupied',
  })
  const person = async (role: EnrollmentRole) => {
    const { user } = await createMember(role, tenant)
    return { user, api: apiFor(client, tenant, user) }
  }
  const adminApi = apiFor(client, tenant, admin)
  const box = await expectStatus(
    adminApi.post('/finance/cash-accounts', {
      name: 'Caja portería',
      type: 'cash',
      openingBalance: 0,
      openingDate: '2026-01-01',
    }),
    201
  )
  return {
    tenant,
    unit,
    cashAccountId: box.body().data.id as string,
    admin: { user: admin, api: adminApi },
    guard: await person('security_guard'),
    staff: await person('staff'),
    accountant: await person('accountant'),
  }
}

type Setup = Awaited<ReturnType<typeof setup>>

async function configure(s: Setup, overrides: Record<string, unknown> = {}) {
  await expectStatus(
    s.admin.api.put(
      '/visitor-parking/settings',
      settings({ cashAccountId: s.cashAccountId, ...overrides })
    ),
    200
  )
}

function enter(s: Setup, overrides: Record<string, unknown> = {}) {
  return s.guard.api.post('/visitor-parking/stays', {
    vehicleType: 'car',
    plate: 'ABC 123',
    unitId: s.unit.id,
    visitorName: 'Laura Visitante',
    authorization: 'call',
    authorizedByName: 'Camilo Residente',
    ...overrides,
  })
}

test.group('Visitor parking', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => () => {
    Settings.now = () => Date.now()
  })

  test('who can use it and who configures it', async ({ client, assert }) => {
    const s = await setup(client)
    for (const member of [s.staff, s.accountant]) {
      await expectStatus(member.api.get('/visitor-parking/summary'), 403)
    }
    await expectStatus(s.guard.api.put('/visitor-parking/settings', settings()), 403)

    // Off until the administration turns it on
    const off = await enter(s)
    off.assertStatus(409)

    // Charging at the gate needs the cash box where the money goes
    await expectStatus(s.admin.api.put('/visitor-parking/settings', settings()), 422)
    await configure(s)
    const read = await dataOf(s.guard.api.get('/visitor-parking/settings'))
    assert.equal(read.vehicles.car.hourlyRate, 3000)
    await expectStatus(enter(s), 201)
  })

  test('entries: plates, capacity and visits authorized from the portal', async ({
    client,
    assert,
  }) => {
    const s = await setup(client)
    await configure(s)

    await expectStatus(enter(s, { plate: null }), 422)
    await expectStatus(enter(s, { authorizedByName: null }), 422)
    await expectStatus(enter(s, { authorization: 'pre_authorized' }), 422)

    const first = await dataOf(enter(s))
    assert.equal(first.plate, 'ABC123')
    assert.isFalse(first.overCapacity)
    assert.equal(first.enteredBy.id, s.guard.user.id)
    assert.equal(first.tariff.hourlyRate, 3000)
    // The same vehicle cannot be inside twice
    await expectStatus(enter(s, { plate: 'abc-123' }), 422)

    // One spot for cars: the second one enters, flagged
    const resident = await Vehicle.create({
      tenantId: s.tenant.id,
      unitId: s.unit.id,
      plate: 'XYZ 987',
      type: 'car',
    })
    const visit = await Visit.create({
      tenantId: s.tenant.id,
      unitId: s.unit.id,
      visitorName: 'Pedro Pérez',
      vehiclePlate: 'xyz987',
      accessCode: 'K7P2Q9',
      type: 'guest',
      expectedAt: DateTime.now().plus({ hours: 1 }),
    })
    const lookup = await dataOf(s.guard.api.get('/visitor-parking/lookup', { q: 'k7p2q9' }))
    assert.deepEqual(
      lookup.visits.map((v: { id: string }) => v.id),
      [visit.id]
    )
    const byPlate = await dataOf(s.guard.api.get('/visitor-parking/lookup', { q: 'XYZ-987' }))
    assert.lengthOf(byPlate.visits, 1)
    assert.equal(byPlate.residentVehicle.plate, resident.plate)
    const inside = await dataOf(s.guard.api.get('/visitor-parking/lookup', { q: 'ABC123' }))
    assert.equal(inside.inside.id, first.id)

    const second = await dataOf(
      enter(s, {
        plate: 'XYZ987',
        visitorName: 'Pedro Pérez',
        visitId: visit.id,
        authorization: 'pre_authorized',
        authorizedByName: null,
      })
    )
    assert.isTrue(second.overCapacity)
    assert.equal(second.authorization, 'pre_authorized')
    await visit.refresh()
    assert.isNotNull(visit.checkedInAt)
    // A visit enters once
    await expectStatus(enter(s, { plate: 'QQQ111', visitId: visit.id }), 422)
    // A code that does not work today says why
    const used = await dataOf(s.guard.api.get('/visitor-parking/lookup', { q: 'K7P2Q9' }))
    assert.lengthOf(used.visits, 0)
    assert.equal(used.codeIssue.reason, 'used')
    await Visit.create({
      tenantId: s.tenant.id,
      unitId: s.unit.id,
      visitorName: 'Ana Mañana',
      accessCode: 'M4N2T8',
      type: 'guest',
      expectedAt: DateTime.now().plus({ days: 2 }),
    })
    const upcoming = await dataOf(s.guard.api.get('/visitor-parking/lookup', { q: 'm4n2t8' }))
    assert.lengthOf(upcoming.visits, 0)
    assert.include(upcoming.codeIssue, { reason: 'upcoming', visitorName: 'Ana Mañana' })
    const unknown = await dataOf(s.guard.api.get('/visitor-parking/lookup', { q: 'ZZZ000' }))
    assert.isNull(unknown.codeIssue)

    const summary = await dataOf(s.guard.api.get('/visitor-parking/summary'))
    assert.deepInclude(summary.byType, { type: 'car', capacity: 1, inside: 2 })
    assert.equal(summary.inside, 2)

    // Bicycles: a description instead of the plate
    await expectStatus(enter(s, { vehicleType: 'bicycle', plate: null }), 422)
    await expectStatus(
      enter(s, { vehicleType: 'bicycle', plate: null, vehicleDescription: 'Roja, GW' }),
      201
    )
  })

  test('the daily grace of a plate, paying at the gate and charging the unit', async ({
    client,
    assert,
  }) => {
    const { mails } = mail.fake()
    const s = await setup(client)
    await configure(s)

    // 10:00 → 11:40: 100 min, 60 free, 40 → 60 billed = $3.000 (IVA included)
    clock('2026-11-20T10:00')
    const morning = await dataOf(enter(s))
    clock('2026-11-20T11:40')
    const list = await dataOf(s.guard.api.get('/visitor-parking/stays'))
    assert.equal(list[0].quote.total, 3000)
    await expectStatus(s.guard.api.post(`/visitor-parking/stays/${morning.id}/exit`, {}), 422)
    const paid = await dataOf(
      s.guard.api.post(`/visitor-parking/stays/${morning.id}/exit`, {
        paymentMode: 'gate',
        paymentMethod: 'cash',
        receiptEmail: 'laura@example.com',
      })
    )
    assert.equal(paid.status, 'exited')
    assert.equal(paid.number, 1)
    assert.equal(paid.exitedBy.id, s.guard.user.id)
    assert.equal(paid.settlement, 'gate')
    assert.deepInclude(paid.quote, { minutes: 100, graceMinutes: 60, total: 3000, vat: 479 })
    assert.isNotNull(paid.receiptSentAt)
    const [receipt] = mails.queued((m) => m instanceof ParkingReceiptMail) as ParkingReceiptMail[]
    assert.include(receipt!.content.title, 'N.º 1')
    const vatRow = receipt!.content.totals.find((row) => row.label === 'IVA (19 %)')
    assert.match(vatRow!.value, /^\$\s479$/)

    // Same plate again that day: the grace is used up. 70 min → 90 = $4.500
    clock('2026-11-20T14:00')
    const afternoon = await dataOf(enter(s))
    clock('2026-11-20T15:10')
    const charged = await dataOf(
      s.guard.api.post(`/visitor-parking/stays/${afternoon.id}/exit`, { paymentMode: 'unit' })
    )
    assert.deepInclude(charged.quote, { graceMinutes: 0, billedMinutes: 90, total: 4500 })
    const charges = await unitCharges(s.admin.api, s.unit.id)
    assert.lengthOf(charges, 1)
    assert.equal(charges[0]!.amount, '4500.00')
    assert.equal(charges[0]!.concept.type, 'visitor_parking')

    // Spends the night: 22:00 → 02:00. The 20th has no grace left (120 min),
    // the 21st gets a new hour free (120 − 60 = 60)
    clock('2026-11-20T22:00')
    const night = await dataOf(enter(s))
    clock('2026-11-21T02:00')
    const overnight = await dataOf(
      s.guard.api.post(`/visitor-parking/stays/${night.id}/exit`, {
        paymentMode: 'gate',
        paymentMethod: 'bank_transfer',
      })
    )
    assert.deepEqual(
      overnight.quote.days.map((d: { date: string; amount: number }) => [d.date, d.amount]),
      [
        ['2026-11-20', 6000],
        ['2026-11-21', 3000],
      ]
    )
    assert.equal(overnight.quote.total, 9000)
    await expectStatus(s.guard.api.post(`/visitor-parking/stays/${night.id}/exit`, {}), 409)

    assert.isTrue(await trialBalanceIsBalanced(s.admin.api))
    const accounts = (await dataOf(
      s.admin.api.get('/finance/reports/trial-balance', { from: '2026-01-01', to: '2026-12-31' })
    )) as { rows: Array<{ code: string; credit: string; debit: string }> }
    const vat = accounts.rows.find((row) => row.code === '240805')
    assert.exists(vat, 'VAT payable account')

    const history = await dataOf(s.admin.api.get('/visitor-parking/stays', { status: 'exited' }))
    assert.deepEqual(
      history.map((row: { number: number }) => row.number),
      [3, 2, 1]
    )
    const summary = await dataOf(s.admin.api.get('/visitor-parking/summary'))
    assert.equal(summary.today.exits, 1)
    assert.equal(summary.today.collectedAtGate, 9000)
  })

  test('exemptions keep the grace and need a reason', async ({ client, assert }) => {
    mail.fake()
    const s = await setup(client)
    await configure(s, { paymentMode: 'gate' })

    clock('2026-11-20T08:00')
    const stay = await dataOf(enter(s))
    clock('2026-11-20T10:00')
    await expectStatus(
      s.guard.api.post(`/visitor-parking/stays/${stay.id}/exit`, { exempt: true }),
      422
    )
    const exempt = await dataOf(
      s.guard.api.post(`/visitor-parking/stays/${stay.id}/exit`, {
        exempt: true,
        exemptReason: 'Técnico del ascensor',
      })
    )
    assert.equal(exempt.settlement, 'exempt')
    assert.equal(exempt.quote.total, 0)
    assert.equal(exempt.exemptReason, 'Técnico del ascensor')

    // The plate still has its free hour today
    const again = await dataOf(enter(s))
    clock('2026-11-20T10:45')
    const free = await dataOf(
      s.guard.api.post(`/visitor-parking/stays/${again.id}/exit`, { receiptEmail: null })
    )
    assert.equal(free.settlement, 'free')
    assert.equal(free.quote.graceMinutes, 45)

    // A receipt can be sent later
    const sent = await dataOf(
      s.guard.api.post(`/visitor-parking/stays/${free.id}/receipt`, { email: 'x@example.com' })
    )
    assert.equal(sent.receiptEmail, 'x@example.com')
  })

  test('corrections while inside, overstays and other conjuntos', async ({ client, assert }) => {
    const s = await setup(client)
    const other = await setup(client)
    await configure(s)

    clock('2026-11-20T06:00')
    const stay = await dataOf(enter(s))
    const fixed = await dataOf(
      s.guard.api.patch(`/visitor-parking/stays/${stay.id}`, { plate: 'abc 124' })
    )
    assert.equal(fixed.plate, 'ABC124')

    clock('2026-11-20T19:00')
    const overstays = await dataOf(s.guard.api.get('/visitor-parking/stays', { overstay: true }))
    assert.lengthOf(overstays, 1)
    assert.isTrue(overstays[0].isOverstay)
    const summary = await dataOf(s.guard.api.get('/visitor-parking/summary'))
    assert.equal(summary.overstays, 1)

    await expectStatus(other.guard.api.get(`/visitor-parking/stays/${stay.id}`), 404)
    await expectStatus(other.guard.api.post(`/visitor-parking/stays/${stay.id}/exit`, {}), 404)
    await expectStatus(enter(s, { unitId: other.unit.id, plate: 'ZZZ999' }), 422)
  })

  test('an entry announced at the gate shows up in the portal of the unit', async ({
    client,
    assert,
  }) => {
    const s = await setup(client)
    await configure(s, {
      vehicles: { ...settings().vehicles, car: { capacity: 2, hourlyRate: 0, dailyCap: null } },
    })
    const { user } = await createMember('resident', s.tenant)
    await UnitOccupant.create({
      tenantId: s.tenant.id,
      unitId: s.unit.id,
      userId: user.id,
      fullName: user.fullName,
      relationship: 'owner',
      isPrimaryContact: true,
      isBillingResponsible: true,
    })
    const portal = apiFor(client, s.tenant, user)

    const stay = await dataOf(enter(s, { plate: 'xyz-987', visitorDocument: '123' }))
    let visits = await dataOf(portal.get('/resident/visits'))
    assert.lengthOf(visits, 1)
    assert.include(visits[0], {
      id: stay.visitId,
      visitorName: 'Laura Visitante',
      vehiclePlate: 'XYZ987',
      status: 'inside',
      fromGate: true,
      canCancel: false,
    })

    // A correction reaches the visit; the exit checks it out
    await expectStatus(
      s.guard.api.patch(`/visitor-parking/stays/${stay.id}`, { visitorName: 'Laura Gómez' }),
      200
    )
    await expectStatus(s.guard.api.post(`/visitor-parking/stays/${stay.id}/exit`, {}), 200)
    visits = await dataOf(portal.get('/resident/visits'))
    assert.include(visits[0], { visitorName: 'Laura Gómez', status: 'completed' })
  })
})
