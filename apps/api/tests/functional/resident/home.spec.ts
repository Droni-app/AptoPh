import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import Building from '#models/property/building'
import Charge from '#models/finance/charge'
import ChargeConcept from '#models/finance/charge_concept'
import type Tenant from '#models/tenants/tenant'
import Unit from '#models/property/unit'
import UnitOccupant from '#models/property/unit_occupant'
import type User from '#models/auth/user'
import Vehicle from '#models/property/vehicle'
import { createMember } from '#tests/helpers'

async function createUnit(tenant: Tenant, building: Building, code: string) {
  return Unit.create({
    tenantId: tenant.id,
    buildingId: building.id,
    code,
    type: 'apartment',
    floor: Number(code[0]),
    privateArea: '64.10',
    ownershipCoefficient: '0.001250',
    status: 'occupied',
  })
}

async function occupy(
  tenant: Tenant,
  unit: Unit,
  user: User,
  overrides: Partial<UnitOccupant> = {}
) {
  return UnitOccupant.create({
    tenantId: tenant.id,
    unitId: unit.id,
    userId: user.id,
    fullName: user.fullName,
    relationship: 'owner',
    isPrimaryContact: true,
    isBillingResponsible: true,
    ...overrides,
  })
}

/**
 * A resident who owns Torre 1 · 101, with a neighbour in 102
 */
async function setup() {
  const { tenant, user } = await createMember('resident')
  const building = await Building.create({ tenantId: tenant.id, name: 'Torre 1', floors: 20 })
  const mine = await createUnit(tenant, building, '101')
  const neighbours = await createUnit(tenant, building, '102')
  await occupy(tenant, mine, user)

  const as = <T extends { loginAs: any }>(request: T, who: User = user) =>
    request.loginAs(who).header('X-Tenant-Id', tenant.id)

  return { tenant, user, building, mine, neighbours, as }
}

test.group('Resident · home and own units', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('home lists the conjunto and only the units the resident occupies', async ({
    client,
    assert,
  }) => {
    const { tenant, mine, as } = await setup()

    const response = await as(client.get('/api/v1/resident/home'))
    response.assertStatus(200)

    const { data } = response.body()
    assert.equal(data.tenant.name, tenant.name)
    assert.equal(data.tenant.buildingsCount, 1)
    assert.equal(data.tenant.unitsCount, 2)
    assert.lengthOf(data.units, 1)
    assert.equal(data.units[0].id, mine.id)
    assert.equal(data.units[0].building.name, 'Torre 1')
    assert.equal(data.units[0].relationship, 'owner')
    assert.deepEqual(data.units[0].balance, { pending: '0.00', overdue: '0.00', openCharges: 0 })
  })

  test('balance adds open charges and separates the overdue part', async ({ client, assert }) => {
    const { tenant, mine, as } = await setup()
    const concept = await ChargeConcept.create({
      tenantId: tenant.id,
      name: 'Cuota de administración',
      type: 'ordinary_fee',
      accruesInterest: true,
      isActive: true,
    })
    const today = DateTime.now().setZone(tenant.timezone).startOf('day')
    const charge = (values: Partial<Charge>) =>
      Charge.create({
        tenantId: tenant.id,
        unitId: mine.id,
        chargeConceptId: concept.id,
        period: today.startOf('month'),
        amount: '350000.00',
        balance: '350000.00',
        dueOn: today.plus({ days: 10 }),
        status: 'pending',
        ...values,
      })

    await charge({
      dueOn: today.minus({ days: 5 }),
      balance: '150000.00',
      status: 'partially_paid',
    })
    await charge({})
    await charge({ status: 'paid', balance: '0.00' })

    const home = await as(client.get('/api/v1/resident/home'))
    assert.deepEqual(home.body().data.units[0].balance, {
      pending: '500000.00',
      overdue: '150000.00',
      openCharges: 2,
    })

    const detail = await as(client.get(`/api/v1/resident/units/${mine.id}`))
    detail.assertStatus(200)
    const openCharges = detail.body().data.openCharges
    assert.lengthOf(openCharges, 2)
    assert.equal(openCharges[0].concept, 'Cuota de administración')
    assert.isTrue(openCharges[0].isOverdue)
    assert.isFalse(openCharges[1].isOverdue)
  })

  test('unit detail: contacts only for the members the viewer manages', async ({
    client,
    assert,
  }) => {
    const { tenant, mine, as } = await setup()
    await UnitOccupant.create({
      tenantId: tenant.id,
      unitId: mine.id,
      fullName: 'Lucía Familiar',
      documentType: 'CC',
      documentNumber: '1012345678',
      phone: '3001234567',
      relationship: 'family_member',
    })
    await Vehicle.create({ tenantId: tenant.id, unitId: mine.id, plate: 'ABC123', type: 'car' })

    const response = await as(client.get(`/api/v1/resident/units/${mine.id}`))
    response.assertStatus(200)

    const { data } = response.body()
    assert.equal(data.code, '101')
    assert.lengthOf(data.household, 2)
    assert.isTrue(data.household.find((m: any) => m.relationship === 'owner').isMe)
    const relative = data.household.find((m: any) => m.fullName === 'Lucía Familiar')
    // The owner manages family members without an account: their contact data is shown
    assert.isTrue(relative.editable)
    assert.equal(relative.documentNumber, '1012345678')
    // Occupants with their own account are managed by the administration
    const me = data.household.find((m: any) => m.isMe)
    assert.isFalse(me.editable)
    assert.isNull(me.documentNumber)
    assert.isNull(me.phone)
    assert.equal(data.vehicles[0].plate, 'ABC123')
  })

  test('a neighbour unit answers 404', async ({ client }) => {
    const { neighbours, as } = await setup()
    const response = await as(client.get(`/api/v1/resident/units/${neighbours.id}`))
    response.assertStatus(404)
  })

  test('an ended occupancy no longer grants access', async ({ client, assert }) => {
    const { tenant, user, neighbours, as } = await setup()
    await occupy(tenant, neighbours, user, {
      relationship: 'renter',
      endsOn: DateTime.now().minus({ months: 1 }),
    })

    const home = await as(client.get('/api/v1/resident/home'))
    assert.lengthOf(home.body().data.units, 1)

    const detail = await as(client.get(`/api/v1/resident/units/${neighbours.id}`))
    detail.assertStatus(404)
  })

  test('staff without the resident role cannot use the resident API', async ({ client }) => {
    const { tenant } = await setup()
    const { user: guard } = await createMember('security_guard', tenant)

    const response = await client
      .get('/api/v1/resident/home')
      .loginAs(guard)
      .header('X-Tenant-Id', tenant.id)
    response.assertStatus(403)
  })
})
