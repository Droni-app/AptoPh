import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import Building from '#models/property/building'
import Ticket from '#models/tickets/ticket'
import TicketComment from '#models/tickets/ticket_comment'
import type Tenant from '#models/tenants/tenant'
import Unit from '#models/property/unit'
import UnitOccupant from '#models/property/unit_occupant'
import type User from '#models/auth/user'
import Vehicle from '#models/property/vehicle'
import Visit from '#models/gatehouse/visit'
import { createMember } from '#tests/helpers'

/**
 * Sends the request and asserts the status (keeps the await out of a member access)
 */
async function expectStatus(
  request: PromiseLike<{ assertStatus(status: number): void }>,
  status: number
) {
  const response = await request
  response.assertStatus(status)
  return response
}

async function createUnit(tenant: Tenant, building: Building, code: string) {
  return Unit.create({
    tenantId: tenant.id,
    buildingId: building.id,
    code,
    type: 'apartment',
    floor: 1,
    ownershipCoefficient: '0.001250',
    status: 'occupied',
  })
}

/**
 * Owner of 101 (`user`), a neighbour who owns 102, and a family member of 101
 * with an account who is not the primary contact.
 */
async function setup() {
  const { tenant, user } = await createMember('resident')
  const { user: neighbour } = await createMember('resident', tenant)
  const { user: relative } = await createMember('resident', tenant)
  const building = await Building.create({ tenantId: tenant.id, name: 'Torre 1', floors: 5 })
  const mine = await createUnit(tenant, building, '101')
  const theirs = await createUnit(tenant, building, '102')

  const occupy = (unit: Unit, who: User, overrides: Partial<UnitOccupant> = {}) =>
    UnitOccupant.create({
      tenantId: tenant.id,
      unitId: unit.id,
      userId: who.id,
      fullName: who.fullName,
      relationship: 'owner',
      isPrimaryContact: true,
      isBillingResponsible: true,
      ...overrides,
    })
  const owner = await occupy(mine, user)
  await occupy(theirs, neighbour)
  await occupy(mine, relative, {
    relationship: 'family_member',
    isPrimaryContact: false,
    isBillingResponsible: false,
  })

  const as = <T extends { loginAs: any }>(request: T, who: User = user) =>
    request.loginAs(who).header('X-Tenant-Id', tenant.id)

  return { tenant, user, neighbour, relative, mine, theirs, owner, as }
}

/** Tomorrow at `hour` in the conjunto's timezone, as ISO with offset */
const tomorrowAt = (hour: number) =>
  DateTime.now()
    .setZone('America/Bogota')
    .plus({ days: 1 })
    .set({ hour, minute: 0, second: 0, millisecond: 0 })
    .toISO({ suppressMilliseconds: true })!

test.group('Resident · vehicles and pets', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('adds, edits and removes a vehicle of their unit', async ({ client, assert }) => {
    const { mine, as } = await setup()

    const created = await as(client.post(`/api/v1/resident/units/${mine.id}/vehicles`)).json({
      plate: 'abc-123',
      type: 'car',
      brand: 'Mazda',
    })
    created.assertStatus(201)
    assert.equal(created.body().data.plate, 'ABC123')
    const id = created.body().data.id

    const updated = await as(client.patch(`/api/v1/resident/vehicles/${id}`)).json({
      color: 'Rojo',
    })
    updated.assertStatus(200)
    assert.equal(updated.body().data.color, 'Rojo')

    await expectStatus(as(client.delete(`/api/v1/resident/vehicles/${id}`)), 204)
    const detail = await as(client.get(`/api/v1/resident/units/${mine.id}`))
    assert.lengthOf(detail.body().data.vehicles, 0)
    const deleted = await Vehicle.findOrFail(id)
    assert.isNotNull(deleted.deletedAt)
  })

  test('plates are unique in the conjunto', async ({ client }) => {
    const { tenant, theirs, mine, as } = await setup()
    await Vehicle.create({ tenantId: tenant.id, unitId: theirs.id, plate: 'XYZ987', type: 'car' })

    const response = await as(client.post(`/api/v1/resident/units/${mine.id}/vehicles`)).json({
      plate: 'xyz 987',
      type: 'car',
    })
    response.assertStatus(422)
    response.assertBodyContains({ errors: [{ field: 'plate' }] })
  })

  test("cannot touch a neighbour's unit or vehicles", async ({ client }) => {
    const { tenant, theirs, as } = await setup()
    const vehicle = await Vehicle.create({
      tenantId: tenant.id,
      unitId: theirs.id,
      plate: 'NEI001',
      type: 'car',
    })

    await expectStatus(
      as(client.post(`/api/v1/resident/units/${theirs.id}/vehicles`)).json({
        plate: 'AAA111',
        type: 'car',
      }),
      404
    )
    await expectStatus(
      as(client.patch(`/api/v1/resident/vehicles/${vehicle.id}`)).json({ color: 'Azul' }),
      404
    )
    await expectStatus(as(client.delete(`/api/v1/resident/vehicles/${vehicle.id}`)), 404)
  })

  test('manages pets, including the potentially dangerous flag', async ({ client, assert }) => {
    const { mine, as } = await setup()
    const created = await as(client.post(`/api/v1/resident/units/${mine.id}/pets`)).json({
      name: 'Toby',
      species: 'dog',
      breed: 'Pitbull',
      isPotentiallyDangerous: true,
    })
    created.assertStatus(201)
    assert.isTrue(created.body().data.isPotentiallyDangerous)

    const id = created.body().data.id
    await expectStatus(
      as(client.patch(`/api/v1/resident/pets/${id}`)).json({ name: 'Toby II' }),
      200
    )
    await expectStatus(as(client.delete(`/api/v1/resident/pets/${id}`)), 204)
    const detail = await as(client.get(`/api/v1/resident/units/${mine.id}`))
    assert.lengthOf(detail.body().data.pets, 0)
  })
})

test.group('Resident · household', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('the owner adds, edits and removes a family member', async ({ client, assert }) => {
    const { mine, as } = await setup()

    const created = await as(client.post(`/api/v1/resident/units/${mine.id}/household`)).json({
      fullName: 'Lucía Pérez',
      relationship: 'family_member',
      documentType: 'TI',
      documentNumber: '1012345678',
    })
    created.assertStatus(201)
    const id = created.body().data.id
    assert.isTrue(created.body().data.editable)

    const detail = await as(client.get(`/api/v1/resident/units/${mine.id}`))
    const lucia = detail.body().data.household.find((m: { id: string }) => m.id === id)
    assert.equal(lucia.documentNumber, '1012345678')
    assert.isTrue(detail.body().data.canManageHousehold)

    await expectStatus(
      as(client.patch(`/api/v1/resident/household/${id}`)).json({
        relationship: 'domestic_worker',
      }),
      200
    )
    await expectStatus(as(client.delete(`/api/v1/resident/household/${id}`)), 204)

    const after = await as(client.get(`/api/v1/resident/units/${mine.id}`))
    assert.notInclude(
      after.body().data.household.map((m: { id: string }) => m.id),
      id
    )
  })

  test('owners and members with an account are managed by the administration', async ({
    client,
  }) => {
    const { owner, as } = await setup()
    const response = await as(client.patch(`/api/v1/resident/household/${owner.id}`)).json({
      fullName: 'Otro nombre',
    })
    response.assertStatus(403)
  })

  test('a family member who is not the primary contact cannot change the household', async ({
    client,
    assert,
  }) => {
    const { mine, relative, as } = await setup()
    const response = await as(
      client.post(`/api/v1/resident/units/${mine.id}/household`),
      relative
    ).json({ fullName: 'Alguien', relationship: 'other' })
    response.assertStatus(403)

    const detail = await as(client.get(`/api/v1/resident/units/${mine.id}`), relative)
    assert.isFalse(detail.body().data.canManageHousehold)
    // Without managing rights nobody's document travels
    for (const member of detail.body().data.household) assert.isNull(member.documentNumber)
  })

  test('only family members, domestic workers or others can be added', async ({ client }) => {
    const { mine, as } = await setup()
    const response = await as(client.post(`/api/v1/resident/units/${mine.id}/household`)).json({
      fullName: 'Nuevo dueño',
      relationship: 'owner',
    })
    response.assertStatus(422)
  })
})

test.group('Resident · visits and parcels', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('authorizes a visit with an access code and cancels it', async ({ client, assert }) => {
    const { mine, as } = await setup()
    const created = await as(client.post('/api/v1/resident/visits')).json({
      unitId: mine.id,
      visitorName: 'Andrea Gómez',
      type: 'guest',
      expectedAt: tomorrowAt(19),
    })
    created.assertStatus(201)
    const visit = created.body().data
    assert.match(visit.accessCode, /^[A-Z2-9]{6}$/)
    assert.equal(visit.status, 'expected')

    const list = await as(client.get('/api/v1/resident/visits'))
    assert.deepEqual(
      list.body().data.map((v: { id: string }) => v.id),
      [visit.id]
    )

    await expectStatus(as(client.delete(`/api/v1/resident/visits/${visit.id}`)), 204)
  })

  test('rejects past dates and visits that already arrived', async ({ client }) => {
    const { tenant, mine, as } = await setup()
    await expectStatus(
      as(client.post('/api/v1/resident/visits')).json({
        unitId: mine.id,
        visitorName: 'Tarde',
        type: 'guest',
        expectedAt: DateTime.now().minus({ days: 1 }).toISO(),
      }),
      422
    )

    const arrived = await Visit.create({
      tenantId: tenant.id,
      unitId: mine.id,
      visitorName: 'Ya llegó',
      type: 'guest',
      checkedInAt: DateTime.now(),
    })
    await expectStatus(as(client.delete(`/api/v1/resident/visits/${arrived.id}`)), 409)
  })

  test("never shows a neighbour's visits", async ({ client, assert }) => {
    const { tenant, theirs, as } = await setup()
    const visit = await Visit.create({
      tenantId: tenant.id,
      unitId: theirs.id,
      visitorName: 'Visita del vecino',
      type: 'guest',
      expectedAt: DateTime.now().plus({ hours: 3 }),
    })
    const list = await as(client.get('/api/v1/resident/visits'))
    assert.lengthOf(list.body().data, 0)
    await expectStatus(as(client.delete(`/api/v1/resident/visits/${visit.id}`)), 404)
  })
})

test.group('Resident · PQRS', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('files tickets with consecutive numbers', async ({ client, assert }) => {
    const { mine, as } = await setup()
    const file = (subject: string) =>
      as(client.post('/api/v1/resident/tickets')).json({
        unitId: mine.id,
        type: 'maintenance',
        subject,
        description: 'Descripción suficientemente larga del problema.',
      })
    const first = await file('Gotera en el baño')
    first.assertStatus(201)
    const second = await file('Puerta del parqueadero')
    assert.equal(second.body().data.number, first.body().data.number + 1)
    assert.equal(first.body().data.status, 'open')
  })

  test('hides internal notes and reopens a resolved ticket on reply', async ({
    client,
    assert,
  }) => {
    const { tenant, mine, user, as } = await setup()
    const { user: admin } = await createMember('administrator', tenant)
    const ticket = await Ticket.create({
      tenantId: tenant.id,
      number: 1,
      unitId: mine.id,
      createdById: user.id,
      type: 'claim',
      subject: 'Cobro duplicado',
      description: 'Me cobraron dos veces la cuota.',
      priority: 'medium',
      status: 'resolved',
      resolvedAt: DateTime.now(),
    })
    await TicketComment.createMany([
      {
        tenantId: tenant.id,
        ticketId: ticket.id,
        authorId: admin.id,
        body: 'Ya lo revisamos',
        isInternal: false,
      },
      {
        tenantId: tenant.id,
        ticketId: ticket.id,
        authorId: admin.id,
        body: 'Nota interna',
        isInternal: true,
      },
    ])

    const detail = await as(client.get(`/api/v1/resident/tickets/${ticket.id}`))
    assert.deepEqual(
      detail.body().data.comments.map((c: { body: string }) => c.body),
      ['Ya lo revisamos']
    )

    const reply = await as(client.post(`/api/v1/resident/tickets/${ticket.id}/comments`)).json({
      body: 'Sigue apareciendo el cobro',
    })
    reply.assertStatus(201)
    assert.isTrue(reply.body().data.isMine)
    await ticket.refresh()
    assert.equal(ticket.status, 'open')
  })

  test("cannot read a neighbour's ticket", async ({ client, assert }) => {
    const { tenant, theirs, neighbour, as } = await setup()
    const ticket = await Ticket.create({
      tenantId: tenant.id,
      number: 1,
      unitId: theirs.id,
      createdById: neighbour.id,
      type: 'complaint',
      subject: 'Ruido',
      description: 'Ruido en la noche.',
      priority: 'medium',
      status: 'open',
    })
    await expectStatus(as(client.get(`/api/v1/resident/tickets/${ticket.id}`)), 404)
    const list = await as(client.get('/api/v1/resident/tickets'))
    assert.lengthOf(list.body().data, 0)
  })
})
