import { test } from '@japa/runner'
import type { ApiClient } from '@japa/api-client'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime, Settings } from 'luxon'
import type { EnrollmentRole } from '@aptoph/shared'
import Building from '#models/property/building'
import Unit from '#models/property/unit'
import UnitOccupant from '#models/property/unit_occupant'
import Vehicle from '#models/property/vehicle'
import { createMember } from '#tests/helpers'
import {
  apiFor,
  dataOf,
  expectStatus,
  trialBalanceIsBalanced,
  unitCharges,
} from '../finance/helpers.js'

const ZONE = 'America/Bogota'

/** Freezes the clock of the API (luxon) at a local day of the conjunto */
function clock(day: string) {
  const ms = DateTime.fromISO(`${day}T10:00`, { zone: ZONE }).toMillis()
  Settings.now = () => ms
}

const settings = (overrides: Record<string, unknown> = {}) => ({
  mode: 'mixed',
  maxSpotsPerUnit: 2,
  rates: {
    car: { communal: 62_000, private: 5000 },
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
  ...overrides,
})

/** A conjunto with two apartments (one with a private spot in the structure) */
async function setup(client: ApiClient) {
  const { tenant, user: admin } = await createMember('administrator')
  const building = await Building.create({ tenantId: tenant.id, name: 'Torre 1', sortOrder: 0 })
  const apartment = (code: string) =>
    Unit.create({
      tenantId: tenant.id,
      buildingId: building.id,
      code,
      type: 'apartment',
      ownershipCoefficient: '0.4',
      status: 'occupied',
    })
  const a101 = await apartment('101')
  const a102 = await apartment('102')
  // Private spot of 101 in the structure (deed and coefficient)
  await Unit.create({
    tenantId: tenant.id,
    buildingId: building.id,
    code: 'PQ-1',
    type: 'parking',
    ownershipCoefficient: '0.02',
    status: 'occupied',
    parentUnitId: a101.id,
  })
  const person = async (role: EnrollmentRole) => {
    const { user } = await createMember(role, tenant)
    return { user, api: apiFor(client, tenant, user) }
  }
  const resident = await person('resident')
  await UnitOccupant.create({
    tenantId: tenant.id,
    unitId: a102.id,
    userId: resident.user.id,
    fullName: resident.user.fullName,
    relationship: 'owner',
    isPrimaryContact: true,
    isBillingResponsible: true,
  })
  const s = {
    tenant,
    a101,
    a102,
    admin: { user: admin, api: apiFor(client, tenant, admin) },
    guard: await person('security_guard'),
    council: await person('council_member'),
    resident,
  }
  return s
}

type Setup = Awaited<ReturnType<typeof setup>>

async function configure(s: Setup, overrides: Record<string, unknown> = {}) {
  await expectStatus(s.admin.api.put('/parking/settings', settings(overrides)), 200)
}

const car = (s: Setup, unit: Unit, plate: string, extra: Record<string, unknown> = {}) =>
  Vehicle.create({ tenantId: s.tenant.id, unitId: unit.id, plate, type: 'car', ...extra })

test.group('Parking of the conjunto', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => () => {
    Settings.now = () => Date.now()
  })

  test('who manages it and who consults it', async ({ client, assert }) => {
    const s = await setup(client)
    await configure(s)

    await expectStatus(s.guard.api.get('/parking/spots'), 200)
    await expectStatus(s.council.api.get('/parking/summary'), 200)
    await expectStatus(s.resident.api.get('/parking/spots'), 403)
    await expectStatus(s.guard.api.get('/parking/settings'), 403)
    await expectStatus(s.guard.api.post('/parking/spots', { code: 'X' }), 403)
    await expectStatus(s.council.api.put('/parking/settings', settings()), 403)

    const saved = await dataOf(s.admin.api.get('/parking/settings'))
    assert.equal(saved.mode, 'mixed')
    assert.equal(saved.rates.car.communal, 62_000)
  })

  test('spots: one by one, in a row and from the structure', async ({ client, assert }) => {
    const s = await setup(client)
    await configure(s)

    const imported = await dataOf(s.admin.api.post('/parking/spots/import'))
    assert.equal(imported.created, 1)
    // Imported once
    const again = await dataOf(s.admin.api.post('/parking/spots/import'))
    assert.equal(again.created, 0)

    const batch = await expectStatus(
      s.admin.api.post('/parking/spots/batch', {
        prefix: 'C-',
        from: 1,
        to: 12,
        digits: 2,
        vehicleType: 'car',
        ownership: 'communal',
        location: 'Sótano 1',
      }),
      201
    )
    assert.equal(batch.body().data.created, 12)
    await expectStatus(
      s.admin.api.post('/parking/spots/batch', {
        prefix: 'C-',
        from: 10,
        to: 14,
        digits: 2,
        vehicleType: 'car',
        ownership: 'communal',
      }),
      422
    )
    await expectStatus(
      s.admin.api.post('/parking/spots', {
        code: 'c-01',
        vehicleType: 'car',
        ownership: 'communal',
      }),
      422
    )
    // A private spot needs its owner
    await expectStatus(
      s.admin.api.post('/parking/spots', { code: 'P-9', vehicleType: 'car', ownership: 'private' }),
      422
    )
    const moto = await dataOf(
      s.admin.api.post('/parking/spots', {
        code: 'M-1',
        vehicleType: 'motorcycle',
        ownership: 'communal',
        isCovered: true,
      })
    )
    assert.isTrue(moto.isCovered)

    const summary = await dataOf(s.admin.api.get('/parking/summary'))
    assert.deepInclude(summary.byType, {
      type: 'car',
      private: 1,
      communal: 12,
      assigned: 0,
      free: 12,
    })
    const owned = await dataOf(s.admin.api.get('/parking/spots', { ownership: 'private' }))
    assert.equal(owned[0].ownerUnit.code, '101')
    const search = await dataOf(s.admin.api.get('/parking/spots', { search: 'sótano' }))
    assert.lengthOf(search, 12)
  })

  test('assigning: maximum per unit, requirements and one holder per spot', async ({
    client,
    assert,
  }) => {
    clock('2026-03-10')
    const s = await setup(client)
    await configure(s, { maxSpotsPerUnit: 1 })
    await s.admin.api.post('/parking/spots/import')
    await s.admin.api.post('/parking/spots/batch', {
      prefix: 'C-',
      from: 1,
      to: 3,
      vehicleType: 'car',
      ownership: 'communal',
    })
    const spots = await dataOf(s.admin.api.get('/parking/spots', { ownership: 'communal' }))
    const [c1, c2] = spots

    // 101 already has its private spot
    const full = await dataOf(
      s.admin.api.get('/parking/eligibility', { unitId: s.a101.id, vehicleType: 'car' })
    )
    assert.lengthOf(full.errors, 1)
    await expectStatus(
      s.admin.api.post('/parking/assignments', {
        spotId: c1.id,
        unitId: s.a101.id,
        startsOn: '2026-03-10',
      }),
      422
    )

    // 102: no vehicle yet, the admin can still assign
    const check = await dataOf(
      s.admin.api.get('/parking/eligibility', { unitId: s.a102.id, vehicleType: 'car' })
    )
    assert.lengthOf(check.errors, 0)
    assert.isTrue(check.warnings.some((w: string) => w.includes('registrado')))
    const moto = await Vehicle.create({
      tenantId: s.tenant.id,
      unitId: s.a102.id,
      plate: 'ABC12D',
      type: 'motorcycle',
    })
    await expectStatus(
      s.admin.api.post('/parking/assignments', {
        spotId: c1.id,
        unitId: s.a102.id,
        vehicleId: moto.id,
        startsOn: '2026-03-10',
      }),
      422
    )
    const vehicle = await car(s, s.a102, 'XYZ987', {
      soatExpiresOn: DateTime.fromISO('2026-01-31'),
    })
    const expired = await dataOf(
      s.admin.api.get('/parking/eligibility', { unitId: s.a102.id, vehicleType: 'car' })
    )
    assert.isTrue(expired.warnings.some((w: string) => w.includes('SOAT')))
    assert.isFalse(expired.vehicles.find((v: { id: string }) => v.id === vehicle.id).documentsOk)

    const created = await expectStatus(
      s.admin.api.post('/parking/assignments', {
        spotId: c1.id,
        unitId: s.a102.id,
        vehicleId: vehicle.id,
        startsOn: '2026-03-10',
      }),
      201
    )
    const assignment = created.body().data
    assert.isNotEmpty(created.body().warnings)
    assert.equal(assignment.status, 'active')
    // Six months: the lottery period
    assert.equal(assignment.endsOn, '2026-09-09')
    assert.equal(assignment.monthlyRate, 62_000)
    // The spot has one holder, the unit reached its maximum
    await expectStatus(
      s.admin.api.post('/parking/assignments', {
        spotId: c1.id,
        unitId: s.a101.id,
        startsOn: '2026-03-10',
      }),
      422
    )
    await expectStatus(
      s.admin.api.post('/parking/assignments', {
        spotId: c2.id,
        unitId: s.a102.id,
        startsOn: '2026-03-10',
      }),
      422
    )
    // Assigned spots cannot be removed nor turned private
    await expectStatus(
      s.admin.api.patch(`/parking/spots/${c1.id}`, {
        ownership: 'private',
        ownerUnitId: s.a101.id,
      }),
      409
    )

    // The guard: by plate, without rates
    const found = await dataOf(s.guard.api.get('/parking/lookup', { q: 'xyz-987' }))
    assert.equal(found.vehicle.unit.code, '102')
    assert.deepEqual(
      found.spots.map((spot: { code: string }) => spot.code),
      [c1.code]
    )
    assert.isNull(found.spots[0].assignment.monthlyRate)
    const byCode = await dataOf(s.guard.api.get('/parking/lookup', { q: c1.code }))
    assert.equal(byCode.spots[0].assignment.unit.code, '102')

    // The resident sees it in the portal
    const unit = await dataOf(s.resident.api.get(`/resident/units/${s.a102.id}`))
    assert.deepInclude(unit.parkingSpots[0], {
      code: c1.code,
      ownership: 'communal',
      vehiclePlate: 'XYZ987',
      endsOn: '2026-09-09',
    })

    // Past the end of the period, it ends by itself
    clock('2026-09-10')
    const after = await dataOf(s.admin.api.get('/parking/assignments', { unitId: s.a102.id }))
    assert.equal(after[0].status, 'ended')
    assert.equal(after[0].endedOn, '2026-09-09')
  })

  test('the monthly charge: prorated, private spots and cancelling', async ({ client, assert }) => {
    clock('2026-01-16')
    const s = await setup(client)
    await configure(s, { requirements: { ...settings().requirements, documents: false } })
    await s.admin.api.post('/parking/spots/import')
    const spot = await dataOf(
      s.admin.api.post('/parking/spots', { code: 'C-1', vehicleType: 'car', ownership: 'communal' })
    )
    const vehicle = await car(s, s.a102, 'XYZ987')
    const assigned = await expectStatus(
      s.admin.api.post('/parking/assignments', {
        spotId: spot.id,
        unitId: s.a102.id,
        vehicleId: vehicle.id,
        startsOn: '2026-01-16',
      }),
      201
    )
    const assignment = assigned.body().data

    await expectStatus(s.admin.api.post('/finance/periods/generate', { period: '2026-01' }), 200)
    const parking = async (unit: Unit) => {
      const all = await unitCharges(s.admin.api, unit.id)
      return all.filter((c) => c.concept.type === 'parking')
    }
    // 16 of 31 days of $62.000
    let charges = await parking(s.a102)
    assert.lengthOf(charges, 1)
    assert.equal(Number(charges[0]!.amount), 32_000)
    assert.include(charges[0]!.description, '16 de 31 días')
    // The private spot of 101: $5.000
    const owned = await parking(s.a101)
    assert.equal(Number(owned[0]!.amount), 5000)

    clock('2026-02-14')
    await s.admin.api.post('/finance/periods/generate', { period: '2026-02' })
    charges = await parking(s.a102)
    assert.lengthOf(charges, 2)
    // Generating again adds nothing
    await s.admin.api.post('/finance/periods/generate', { period: '2026-02' })
    assert.lengthOf(await parking(s.a102), 2)

    // Cancelled on the 14th: February is lowered to 14 of 28 days
    await expectStatus(
      s.admin.api.post(`/parking/assignments/${assignment.id}/end`, {
        status: 'cancelled',
        reason: 'debt',
        note: '',
      }),
      422
    )
    const ended = await dataOf(
      s.admin.api.post(`/parking/assignments/${assignment.id}/end`, {
        status: 'cancelled',
        reason: 'unused',
        note: 'No lo usa hace dos meses',
      })
    )
    assert.include(ended, { status: 'cancelled', endReason: 'unused', endedOn: '2026-02-14' })
    charges = await parking(s.a102)
    const february = charges.find((c) => c.period.startsWith('2026-02'))!
    assert.equal(Number(february.balance), 31_000)
    // March: nothing for 102
    clock('2026-03-02')
    await s.admin.api.post('/finance/periods/generate', { period: '2026-03' })
    assert.lengthOf(await parking(s.a102), 2)
    await trialBalanceIsBalanced(s.admin.api)

    // The spot is free again
    const summary = await dataOf(s.admin.api.get('/parking/summary'))
    assert.deepInclude(summary.byType, {
      type: 'car',
      private: 1,
      communal: 1,
      assigned: 0,
      free: 1,
    })
  })

  test('a rejected assignment is never charged', async ({ client, assert }) => {
    clock('2026-04-01')
    const s = await setup(client)
    await configure(s, { requirements: { ...settings().requirements, documents: false } })
    const spot = await dataOf(
      s.admin.api.post('/parking/spots', { code: 'C-1', vehicleType: 'car', ownership: 'communal' })
    )
    const assignment = await dataOf(
      s.admin.api.post('/parking/assignments', {
        spotId: spot.id,
        unitId: s.a102.id,
        startsOn: '2026-04-01',
      })
    )
    await s.admin.api.post('/finance/periods/generate', { period: '2026-04' })
    const rejected = await dataOf(
      s.admin.api.post(`/parking/assignments/${assignment.id}/end`, {
        status: 'rejected',
        reason: 'resident_resigned',
        note: 'La unidad no lo quiso',
      })
    )
    assert.equal(rejected.status, 'rejected')
    const all = await unitCharges(s.admin.api, s.a102.id)
    const charges = all.filter((c) => c.concept.type === 'parking')
    assert.equal(charges[0]!.status, 'cancelled')
    await expectStatus(
      s.admin.api.post(`/parking/assignments/${assignment.id}/end`, {
        status: 'cancelled',
        reason: 'other',
        note: 'Otra vez',
      }),
      409
    )
  })

  test('vehicles of third parties, only when allowed', async ({ client, assert }) => {
    const s = await setup(client)
    await configure(s)
    const thirdParty = {
      plate: 'JKT482',
      type: 'car',
      ownerType: 'third_party',
      ownerName: 'Leasing Bancolombia',
      ownerDocumentType: 'NIT',
      ownerDocumentNumber: '890903938',
      ownerRelationship: 'leasing',
      soatExpiresOn: '2027-03-01',
    }
    await expectStatus(
      s.resident.api.post(`/resident/units/${s.a102.id}/vehicles`, thirdParty),
      422
    )
    await configure(s, { allowThirdPartyVehicles: true })
    await expectStatus(
      s.resident.api.post(`/resident/units/${s.a102.id}/vehicles`, {
        ...thirdParty,
        ownerName: null,
      }),
      422
    )
    const vehicle = await dataOf(
      s.resident.api.post(`/resident/units/${s.a102.id}/vehicles`, thirdParty)
    )
    assert.include(vehicle, {
      ownerType: 'third_party',
      ownerName: 'Leasing Bancolombia',
      soatExpiresOn: '2027-03-01',
    })
    // Back to the resident's own: the owner data is cleared
    const own = await dataOf(
      s.resident.api.patch(`/resident/vehicles/${vehicle.id}`, { ownerType: 'resident' })
    )
    assert.isNull(own.ownerName)
    const unit = await dataOf(s.resident.api.get(`/resident/units/${s.a102.id}`))
    assert.isTrue(unit.allowThirdPartyVehicles)
  })

  test('other conjuntos', async ({ client }) => {
    const s = await setup(client)
    const other = await setup(client)
    await configure(s)
    const spot = await dataOf(
      s.admin.api.post('/parking/spots', { code: 'C-1', vehicleType: 'car', ownership: 'communal' })
    )
    await expectStatus(other.admin.api.patch(`/parking/spots/${spot.id}`, { code: 'X' }), 404)
    await expectStatus(
      other.admin.api.post('/parking/assignments', {
        spotId: spot.id,
        unitId: other.a102.id,
        startsOn: '2026-04-01',
      }),
      422
    )
    await expectStatus(
      s.admin.api.post('/parking/assignments', {
        spotId: spot.id,
        unitId: other.a102.id,
        startsOn: '2026-04-01',
      }),
      422
    )
  })
})
