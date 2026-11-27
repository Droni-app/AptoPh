import { test } from '@japa/runner'
import type { ApiClient } from '@japa/api-client'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { importExampleCsv, type ImportPlanRow } from '@aptoph/shared'
import Building from '#models/property/building'
import Unit from '#models/property/unit'
import UnitOccupant from '#models/property/unit_occupant'
import type Tenant from '#models/tenants/tenant'
import type User from '#models/auth/user'
import { createMember } from '#tests/helpers'
import { apiFor, dataOf } from '../finance/helpers.js'

function upload(client: ApiClient, tenant: Tenant, user: User, csv: string | Buffer) {
  return client
    .post('/api/v1/imports/property/preview')
    .loginAs(user)
    .header('X-Tenant-Id', tenant.id)
    .file('file', Buffer.isBuffer(csv) ? csv : Buffer.from(csv), { filename: 'conjunto.csv' })
}

const rowsOf = (response: { body(): unknown }) =>
  (response.body() as { data: { rows: ImportPlanRow[] } }).data.rows

test.group('Property import', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('the example file previews as new towers, units and people', async ({ client, assert }) => {
    const { tenant, user } = await createMember('administrator')
    const response = await upload(client, tenant, user, importExampleCsv())
    response.assertStatus(200)
    const rows = rowsOf(response)
    assert.lengthOf(rows, 5)
    assert.deepEqual(
      rows.map((row) => row.status),
      ['create', 'create', 'create', 'create', 'create']
    )
    const [maria, , vacant, , shop] = rows
    assert.deepEqual(maria!.input, {
      building: 'Torre 1',
      code: '101',
      type: 'apartment',
      floor: 1,
      privateArea: 62.5,
      coefficient: 1.25,
      status: 'occupied',
      fullName: 'María Gómez Ruiz',
      relationship: 'owner',
      documentType: 'CC',
      documentNumber: '52123456',
      phone: '3001234567',
      email: 'maria.gomez@ejemplo.com',
      isPrimaryContact: false,
      isBillingResponsible: false,
    })
    assert.equal(maria!.building.action, 'create')
    assert.equal(vacant!.person.action, 'none')
    assert.isNull(shop!.input!.building)
    assert.equal(shop!.input!.type, 'commercial')
    // Nothing was written
    assert.lengthOf(await Unit.query().where('tenant_id', tenant.id), 0)
  })

  test('importing a row upserts its tower, unit and person', async ({ client, assert }) => {
    const { tenant, user } = await createMember('administrator')
    const api = apiFor(client, tenant, user)
    const rows = rowsOf(await upload(client, tenant, user, importExampleCsv()))

    const first = await dataOf(api.post('/imports/property/rows', rows[0]! as never))
    assert.equal(first.row.status, 'unchanged')
    const unit = await Unit.findOrFail(first.unitId)
    assert.equal(unit.code, '101')
    assert.equal(unit.ownershipCoefficient, '0.012500')
    assert.equal(unit.privateArea, '62.50')
    const building = await Building.findOrFail(unit.buildingId)
    assert.equal(building.name, 'Torre 1')

    // The rest is planned again: the tower and the unit now exist
    const pending = rows.slice(1).map((row) => ({ line: row.line, input: row.input }))
    const planned = (await dataOf(
      api.post('/imports/property/plan', { rows: pending })
    )) as ImportPlanRow[]
    assert.equal(planned[0]!.building.action, 'unchanged')
    assert.equal(planned[0]!.unit.action, 'unchanged')
    assert.equal(planned[0]!.person.action, 'create')
    assert.equal(planned[1]!.unit.action, 'create')

    await dataOf(api.post('/imports/property/rows', planned[0]! as never))
    const people = await UnitOccupant.query().where('unit_id', unit.id).orderBy('full_name')
    assert.deepEqual(
      people.map((p) => [p.fullName, p.relationship, p.isBillingResponsible]),
      [
        ['Juan Pérez Díaz', 'renter', true],
        ['María Gómez Ruiz', 'owner', false],
      ]
    )
    assert.lengthOf(await Building.query().where('tenant_id', tenant.id), 1)
  })

  test('a second file updates what changed and keeps empty cells', async ({ client, assert }) => {
    const { tenant, user } = await createMember('administrator')
    const api = apiFor(client, tenant, user)
    for (const row of rowsOf(await upload(client, tenant, user, importExampleCsv())).slice(0, 2))
      await dataOf(api.post('/imports/property/rows', row as never))

    const csv = [
      'Torre;Apartamento;Coeficiente (%);Estado;Nombre;Relación;Cédula;Celular;Correo',
      // Same unit (case and spaces do not matter); new coefficient; María by her document
      'torre 1 ; 101 ;1,3;;María Gómez R.;Propietaria;52.123.456;3001112233;',
      // Nothing new
      'Torre 1;101;;;Juan Pérez Díaz;Arrendatario;;;',
    ].join('\n')
    const rows = rowsOf(await upload(client, tenant, user, csv))
    const [maria, juan] = rows
    assert.equal(maria!.status, 'update')
    assert.deepEqual(
      maria!.unit.changes.map((c) => [c.field, c.from, c.to]),
      [['coefficient', '1,25 %', '1,3 %']]
    )
    assert.deepEqual(
      maria!.person.changes.map((c) => [c.field, c.from, c.to]),
      [
        ['fullName', 'María Gómez Ruiz', 'María Gómez R.'],
        ['phone', '3001234567', '3001112233'],
      ]
    )
    assert.equal(juan!.status, 'unchanged')

    await dataOf(api.post('/imports/property/rows', maria! as never))
    const person = await UnitOccupant.query().where('document_number', '52123456').firstOrFail()
    assert.equal(person.fullName, 'María Gómez R.')
    // Empty cells keep what it had
    assert.equal(person.email, 'maria.gomez@ejemplo.com')
    const unit = await Unit.findOrFail(person.unitId)
    assert.equal(unit.status, 'occupied')
    assert.lengthOf(await UnitOccupant.query().where('unit_id', unit.id), 2)
  })

  test('rows with mistakes say what to fix', async ({ client, assert }) => {
    const { tenant, user } = await createMember('administrator')
    const csv = [
      'torre,unidad,tipo,piso,coeficiente,nombre,relacion,correo,contacto_principal',
      'Torre 1,,Apartamento,1,1,Ana,Propietario,,',
      'Torre 1,102,Castillo,uno,150,Ana,,ana@,tal vez',
      'Torre 1,103,,,,,,solo@correo.com,',
      'Torre 1,104,,,,Ana,Propietario,ana@correo.com,Sí',
      'Torre 1,104,,,,Ana,Propietario,ana@correo.com,Sí',
    ].join('\n')
    const rows = rowsOf(await upload(client, tenant, user, csv))
    const fields = (row: ImportPlanRow) => row.errors.map((e) => e.field)
    assert.deepEqual(fields(rows[0]!), ['code'])
    assert.sameMembers(fields(rows[1]!), [
      'type',
      'floor',
      'coefficient',
      'relationship',
      'email',
      'isPrimaryContact',
    ])
    assert.deepEqual(fields(rows[2]!), ['fullName'])
    assert.equal(rows[3]!.status, 'create')
    assert.deepEqual(rows[4]!.warnings, ['La misma persona y unidad ya están en la fila 5'])
    assert.equal(rows[0]!.line, 2)
  })

  test('reads Excel files saved in Windows-1252 and rejects files without the unit column', async ({
    client,
    assert,
  }) => {
    const { tenant, user } = await createMember('administrator')
    const latin1 = Buffer.from(
      'torre;unidad;nombre;relacion\nTorre Ñ;101;José Núñez;Dueño\n',
      'latin1'
    )
    const [row] = rowsOf(await upload(client, tenant, user, latin1))
    assert.equal(row!.input!.building, 'Torre Ñ')
    assert.equal(row!.input!.fullName, 'José Núñez')
    assert.equal(row!.input!.relationship, 'owner')

    const wrong = await upload(client, tenant, user, 'nombre,correo\nAna,ana@correo.com\n')
    wrong.assertStatus(422)
    wrong.assertBodyContains({ errors: [{ field: 'file' }] })
  })

  test('only the administration imports', async ({ client }) => {
    const { tenant } = await createMember('administrator')
    const { user: council } = await createMember('council_member', tenant)
    const response = await upload(client, tenant, council, importExampleCsv())
    response.assertStatus(403)
  })

  test('units of other conjuntos are not touched', async ({ client, assert }) => {
    const { tenant, user } = await createMember('administrator')
    const { tenant: other } = await createMember('administrator')
    const building = await Building.create({ tenantId: other.id, name: 'Torre 1', sortOrder: 0 })
    await Unit.create({
      tenantId: other.id,
      buildingId: building.id,
      code: '101',
      type: 'apartment',
      status: 'vacant',
      ownershipCoefficient: '0.01',
    })
    const [row] = rowsOf(await upload(client, tenant, user, importExampleCsv()))
    assert.equal(row!.status, 'create')
    await dataOf(apiFor(client, tenant, user).post('/imports/property/rows', row! as never))
    const units = await db.from('units').where('code', '101').orderBy('tenant_id')
    assert.lengthOf(units, 2)
  })
})
