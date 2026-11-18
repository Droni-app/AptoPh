import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Unit from '#models/unit'
import { createMember } from '#tests/helpers'

test.group('Back-office · buildings & units', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('administrator manages buildings, units and occupants', async ({ client, assert }) => {
    const { tenant, user } = await createMember('administrator')
    const as = <T extends { loginAs: any }>(request: T) =>
      request.loginAs(user).header('X-Tenant-Id', tenant.id)

    const building = await as(
      client.post('/api/v1/buildings').json({ name: 'Torre 1', floors: 12 })
    )
    building.assertStatus(201)
    const buildingId = building.body().data.id

    const unit = await as(
      client.post('/api/v1/units').json({
        buildingId,
        code: '302',
        type: 'apartment',
        floor: 3,
        privateArea: 72.5,
        ownershipCoefficient: 0.012345,
        status: 'occupied',
      })
    )
    unit.assertStatus(201)
    assert.equal(unit.body().data.privateArea, '72.50')
    assert.equal(unit.body().data.ownershipCoefficient, '0.012345')
    assert.equal(unit.body().data.building.name, 'Torre 1')
    const unitId = unit.body().data.id

    const occupant = await as(
      client.post(`/api/v1/units/${unitId}/occupants`).json({
        fullName: 'Pedro Pérez',
        relationship: 'owner',
        isPrimaryContact: true,
        startsOn: '2026-01-01',
      })
    )
    occupant.assertStatus(201)
    assert.equal(occupant.body().data.startsOn, '2026-01-01')

    const shown = await as(client.get(`/api/v1/units/${unitId}`))
    shown.assertStatus(200)
    assert.lengthOf(shown.body().data.occupants, 1)

    const list = await as(client.get('/api/v1/units').qs({ buildingId, search: '30' }))
    list.assertStatus(200)
    assert.equal(list.body().metadata.total, 1)
    assert.equal(list.body().data[0].occupantsCount, 1)

    const buildings = await as(client.get('/api/v1/buildings'))
    assert.equal(buildings.body().data[0].unitsCount, 1)

    const updated = await as(client.patch(`/api/v1/units/${unitId}`).json({ status: 'vacant' }))
    updated.assertStatus(200)
    assert.equal(updated.body().data.status, 'vacant')

    const dashboard = await as(client.get('/api/v1/dashboard'))
    dashboard.assertBodyContains({ data: { buildings: 1, units: 1, occupants: 1, staff: 1 } })
  })

  /**
   * Note: a constraint violation aborts the per-test global transaction, so each
   * violation is the last database operation of its test.
   */
  test('validates input', async ({ client }) => {
    const { tenant, user } = await createMember('administrator')
    const response = await client
      .post('/api/v1/units')
      .json({ code: '', ownershipCoefficient: 2 })
      .loginAs(user)
      .header('X-Tenant-Id', tenant.id)
    response.assertStatus(422)
  })

  test('reports duplicated unit codes as 422', async ({ client }) => {
    const { tenant, user } = await createMember('administrator')
    const building = await tenant.related('buildings').create({ name: 'Torre A' })
    await tenant.related('units').create({ code: '101', buildingId: building.id })

    const duplicate = await client
      .post('/api/v1/units')
      .json({ code: '101', buildingId: building.id })
      .loginAs(user)
      .header('X-Tenant-Id', tenant.id)
    duplicate.assertStatus(422)
  })

  test('refuses to delete a building that has units (409)', async ({ client }) => {
    const { tenant, user } = await createMember('administrator')
    const building = await tenant.related('buildings').create({ name: 'Torre A' })
    await tenant.related('units').create({ code: '101', buildingId: building.id })

    const inUse = await client
      .delete(`/api/v1/buildings/${building.id}`)
      .loginAs(user)
      .header('X-Tenant-Id', tenant.id)
    inUse.assertStatus(409)
  })

  test('soft-deletes units and frees their code', async ({ client, assert }) => {
    const { tenant, user } = await createMember('administrator')
    const unit = await tenant.related('units').create({ code: 'P-1', type: 'parking' })

    const deleted = await client
      .delete(`/api/v1/units/${unit.id}`)
      .loginAs(user)
      .header('X-Tenant-Id', tenant.id)
    deleted.assertStatus(204)

    await unit.refresh()
    assert.isNotNull(unit.deletedAt)

    const again = await client
      .post('/api/v1/units')
      .json({ code: 'P-1', type: 'parking' })
      .loginAs(user)
      .header('X-Tenant-Id', tenant.id)
    again.assertStatus(201)
  })
})

test.group('Back-office · permissions', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('workers can read but not write', async ({ client }) => {
    const { tenant, user } = await createMember('security_guard')

    const read = await client.get('/api/v1/units').loginAs(user).header('X-Tenant-Id', tenant.id)
    read.assertStatus(200)

    const write = await client
      .post('/api/v1/buildings')
      .json({ name: 'Torre X' })
      .loginAs(user)
      .header('X-Tenant-Id', tenant.id)
    write.assertStatus(403)
  })

  test('residents cannot use the back-office', async ({ client }) => {
    const { tenant, user } = await createMember('resident')
    const response = await client
      .get('/api/v1/dashboard')
      .loginAs(user)
      .header('X-Tenant-Id', tenant.id)
    response.assertStatus(403)
  })

  test('lists members filtered by group', async ({ client, assert }) => {
    const { tenant, user } = await createMember('administrator')
    await createMember('staff', tenant)
    await createMember('resident', tenant)

    const staff = await client
      .get('/api/v1/members')
      .qs({ group: 'staff' })
      .loginAs(user)
      .header('X-Tenant-Id', tenant.id)
    staff.assertStatus(200)
    assert.sameMembers(
      (staff.body().data as Array<{ role: string }>).map((member) => member.role),
      ['administrator', 'staff']
    )
  })
})

test.group('Tenant isolation', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('cannot read or modify another tenant records through the API', async ({ client }) => {
    const { tenant, user } = await createMember('administrator')
    const { tenant: otherTenant } = await createMember('administrator')
    const foreignUnit = await otherTenant.related('units').create({ code: 'X-1' })
    const foreignBuilding = await otherTenant.related('buildings').create({ name: 'Ajena' })

    const as = <T extends { loginAs: any }>(request: T) =>
      request.loginAs(user).header('X-Tenant-Id', tenant.id)

    const read = await as(client.get(`/api/v1/units/${foreignUnit.id}`))
    read.assertStatus(404)
    const update = await as(client.patch(`/api/v1/units/${foreignUnit.id}`).json({ code: 'hack' }))
    update.assertStatus(404)
    const remove = await as(client.delete(`/api/v1/buildings/${foreignBuilding.id}`))
    remove.assertStatus(404)

    const crossReference = await as(
      client.post('/api/v1/units').json({ code: '1', buildingId: foreignBuilding.id })
    )
    crossReference.assertStatus(422)
    crossReference.assertBodyContains({ errors: [{ field: 'buildingId' }] })
  })

  test('the database rejects cross-tenant references (composite FK)', async ({ assert }) => {
    const { tenant } = await createMember('administrator')
    const { tenant: otherTenant } = await createMember('administrator')
    const foreignBuilding = await otherTenant.related('buildings').create({ name: 'Ajena' })

    await assert.rejects(
      () => Unit.create({ tenantId: tenant.id, code: '1', buildingId: foreignBuilding.id }),
      /violates foreign key constraint/
    )
  })
})
