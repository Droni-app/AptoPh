import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import type { ApiClient } from '@japa/api-client'
import UnitOccupant from '#models/property/unit_occupant'
import type Tenant from '#models/tenants/tenant'
import type User from '#models/auth/user'
import { dataOf, expectStatus, financeSetup, memberApi, trialBalanceIsBalanced } from './helpers.js'

/** A resident (owner, primary contact) of `unitId` */
async function residentOf(client: ApiClient, tenant: Tenant, unitId: string) {
  const member = await memberApi(client, tenant, 'resident')
  await UnitOccupant.create({
    tenantId: tenant.id,
    unitId,
    userId: member.user.id,
    fullName: 'Laura Gómez',
    documentType: 'CC',
    documentNumber: '52123456',
    relationship: 'owner',
    isPrimaryContact: true,
  })
  return member
}

function raw(client: ApiClient, tenant: Tenant, user: User, path: string) {
  return client
    .get(`/api/v1${path}`)
    .loginAs(user)
    .header('X-Tenant-Id', tenant.id) as unknown as Promise<any>
}

const isPdf = (response: any) => {
  response.assertStatus(200)
  response.assertHeader('content-type', 'application/pdf')
  const body: Buffer = Buffer.isBuffer(response.body())
    ? response.body()
    : Buffer.from(response.text(), 'binary')
  // One letter page: the footer must not push a second one
  const pages = body.toString('latin1').match(/\/Type \/Page\b(?!s)/g) ?? []
  return body.subarray(0, 4).toString() === '%PDF' && pages.length === 1
}

test.group('Finance · recibo de caja y paz y salvo', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('a confirmed payment downloads its receipt; residents only their own', async ({
    client,
    assert,
  }) => {
    const { tenant, user, api, units, bankId } = await financeSetup(client)
    await api.post('/finance/periods/generate', { period: '2026-01' })
    const resident = await residentOf(client, tenant, units.a.id)
    const neighbour = await residentOf(client, tenant, units.b.id)

    const payment = await dataOf(
      api.post('/finance/payments', {
        unitId: units.a.id,
        amount: 1_250_000,
        paidOn: '2026-01-08',
        method: 'bank_transfer',
        reference: 'TRF-77',
        cashAccountId: bankId,
      })
    )
    const receipt = await raw(client, tenant, user, `/finance/payments/${payment.id}/receipt`)
    assert.isTrue(isPdf(receipt))
    assert.include(receipt.header('content-disposition'), 'recibo-de-caja-000001.pdf')

    assert.isTrue(
      isPdf(await raw(client, tenant, resident.user, `/resident/payments/${payment.id}/receipt`))
    )
    const notTheirs = await raw(
      client,
      tenant,
      neighbour.user,
      `/resident/payments/${payment.id}/receipt`
    )
    notTheirs.assertStatus(404)

    // A report still in review has no receipt
    const reported = await dataOf(
      resident.api.post(`/resident/units/${units.a.id}/payments`, {
        amount: 10_000,
        paidOn: '2026-01-09',
        method: 'bank_transfer',
      })
    )
    const noReceipt = await raw(client, tenant, user, `/finance/payments/${reported.id}/receipt`)
    noReceipt.assertStatus(409)

    // A reversed receipt still downloads (stamped ANULADO)
    await expectStatus(
      api.post(`/finance/payments/${payment.id}/reverse`, { reason: 'Cheque devuelto' }),
      200
    )
    assert.isTrue(isPdf(await raw(client, tenant, user, `/finance/payments/${payment.id}/receipt`)))
  })

  test('the paz y salvo needs the unit up to date; anyone verifies its code', async ({
    client,
    assert,
  }) => {
    const { tenant, user, api, units, bankId } = await financeSetup(client)
    await api.post('/finance/periods/generate', { period: '2026-01' })

    const owing = await dataOf(api.get(`/finance/units/${units.a.id}/clearance`))
    assert.isFalse(owing.eligible)
    assert.equal(owing.overdue, '500000.00')
    const refused = await api.post(`/finance/units/${units.a.id}/clearances`)
    refused.assertStatus(409)
    assert.include(JSON.stringify(refused.body()), '500.000')

    await api.post('/finance/payments', {
      unitId: units.a.id,
      amount: 500_000,
      paidOn: '2026-01-08',
      method: 'cash',
      cashAccountId: bankId,
    })
    const created = await api.post(`/finance/units/${units.a.id}/clearances`)
    created.assertStatus(201)
    const certificate = created.body().data
    assert.equal(certificate.number, 1)
    assert.match(certificate.code, /^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{2}$/)
    assert.isTrue(
      isPdf(await raw(client, tenant, user, `/finance/clearances/${certificate.id}/pdf`))
    )

    const status = await dataOf(api.get(`/finance/units/${units.a.id}/clearance`))
    assert.isTrue(status.eligible)
    assert.lengthOf(status.certificates, 1)

    // Public check, with or without dashes and in lower case
    const check = await client.get(
      `/api/v1/public/clearances/${certificate.code.replace(/-/g, '').toLowerCase()}`
    )
    check.assertStatus(200)
    assert.equal(check.body().data.number, 1)
    assert.include(check.body().data.unit, '101')
    assert.isTrue(check.body().data.current)
    const unknown = await client.get('/api/v1/public/clearances/ABCD-EFGH-JK')
    unknown.assertStatus(404)

    // Residents: the owner asks for it; it lists for them and downloads
    const resident = await residentOf(client, tenant, units.a.id)
    const mine = await dataOf(resident.api.get(`/resident/units/${units.a.id}/clearance`))
    assert.isTrue(mine.canIssue)
    const own = await resident.api.post(`/resident/units/${units.a.id}/clearances`)
    own.assertStatus(201)
    assert.equal(own.body().data.number, 2)
    assert.equal(own.body().data.holderName, 'Laura Gómez (CC 52123456)')
    assert.isTrue(
      isPdf(
        await raw(client, tenant, resident.user, `/resident/clearances/${own.body().data.id}/pdf`)
      )
    )
    const other = await residentOf(client, tenant, units.b.id)
    const foreign = await raw(
      client,
      tenant,
      other.user,
      `/resident/clearances/${own.body().data.id}/pdf`
    )
    foreign.assertStatus(404)
  })
})

function importFile(
  client: ApiClient,
  tenant: Tenant,
  user: User,
  path: string,
  csv: string,
  fields: Record<string, string> = {}
) {
  let request = client
    .post(`/api/v1${path}`)
    .loginAs(user)
    .header('X-Tenant-Id', tenant.id)
    .file('file', Buffer.from(csv, 'utf8'), { filename: 'extracto-noviembre.csv' })
  for (const [name, value] of Object.entries(fields)) request = request.field(name, value)
  return request as unknown as Promise<any>
}

test.group('Finance · conciliación bancaria', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('imports a statement and reconciles it by reference', async ({ client, assert }) => {
    const finance = await financeSetup(client, { fees: false })
    const { tenant, user, api, units, bankId } = finance
    const resident = await residentOf(client, tenant, units.c.id)

    // Already registered by the administration, with the bank's reference
    const receipt = await dataOf(
      api.post('/finance/payments', {
        unitId: units.b.id,
        amount: 180_000,
        paidOn: '2026-11-03',
        method: 'bank_transfer',
        reference: 'TRF-9001',
        cashAccountId: bankId,
      })
    )
    // Reported by the resident of 103, waiting for review
    const report = await dataOf(
      resident.api.post(`/resident/units/${units.c.id}/payments`, {
        amount: 200_000,
        paidOn: '2026-11-04',
        method: 'bank_transfer',
      })
    )

    const csv = [
      'Banco de prueba;;;;',
      'Cuenta de ahorros;123-456;;;',
      'Fecha;Descripción;Referencia;Débito;Crédito',
      '03/11/2026;TRANSFERENCIA PEREZ;101;;350.000',
      '03/11/2026;PAGO PSE;TRF-9001;;180.000',
      '05/11/2026;CONSIGNACION;103;;200.000',
      '06/11/2026;COMISION MANEJO;;12.000;',
      ';Saldo final;;;2.718.000',
    ].join('\n')

    const preview = await importFile(client, tenant, user, '/finance/bank-statements/preview', csv)
    preview.assertStatus(200)
    const { mapping, total, sample } = preview.body().data
    assert.equal(mapping.headerRow, 2)
    assert.equal(total, 4)
    assert.equal(sample[0].amount, '350000.00')
    assert.equal(sample[3].amount, '-12000.00')

    const created = await importFile(client, tenant, user, '/finance/bank-statements', csv, {
      cashAccountId: bankId,
      mapping: JSON.stringify(mapping),
    })
    created.assertStatus(201)
    const statement = created.body().data
    assert.equal(statement.linesCount, 4)
    assert.equal(statement.startsOn, '2026-11-03')
    const byRef = (ref: string | null) =>
      statement.lines.find((line: { reference: string | null }) => line.reference === ref)
    assert.deepInclude(byRef('101').suggestion, { action: 'register', confidence: 'high' })
    assert.equal(byRef('101').suggestion.unit.id, units.a.id)
    assert.deepInclude(byRef('TRF-9001').suggestion, { action: 'link', confidence: 'high' })
    assert.equal(byRef('TRF-9001').suggestion.payment.id, receipt.id)
    assert.deepInclude(byRef('103').suggestion, { action: 'confirm', confidence: 'high' })
    assert.equal(byRef('103').suggestion.payment.id, report.id)
    assert.isNull(byRef(null).suggestion)

    // The same file again: nothing new
    const again = await importFile(client, tenant, user, '/finance/bank-statements', csv, {
      cashAccountId: bankId,
      mapping: JSON.stringify(mapping),
    })
    again.assertStatus(422)

    const applied = await dataOf(
      api.post(`/finance/bank-statements/${statement.id}/apply-suggestions`)
    )
    assert.equal(applied.applied, 3)
    assert.lengthOf(applied.failed, 0)
    assert.equal(applied.statement.pending, 1)

    // The report was confirmed into the bank, and 101 got a new receipt
    const confirmed = await dataOf(api.get(`/finance/payments/${report.id}`))
    assert.equal(confirmed.status, 'confirmed')
    assert.equal(confirmed.cashAccount.id, bankId)
    const registered = applied.statement.lines.find((line: any) => line.reference === '101')
    assert.equal(registered.status, 'reconciled')
    assert.equal(registered.payment.unit, '101')
    const newReceipt = await dataOf(api.get(`/finance/payments/${registered.payment.id}`))
    assert.equal(newReceipt.amount, '350000.00')
    assert.equal(newReceipt.reference, '101')
    assert.equal(newReceipt.paidAt.slice(0, 10), '2026-11-03')

    // The bank fee is ignored with a note
    const fee = applied.statement.lines.find((line: any) => line.reference === null)
    const ignored = await api.post(`/finance/bank-statement-lines/${fee.id}/reconcile`, {
      action: 'ignore',
      note: 'Comisión del banco',
    })
    ignored.assertStatus(200)
    assert.equal(ignored.body().data.statement.pending, 0)
    assert.equal(ignored.body().data.statement.ignored, 1)

    // A receipt is reconciled with one movement at most
    const link = applied.statement.lines.find((line: any) => line.reference === 'TRF-9001')
    await expectStatus(api.post(`/finance/bank-statement-lines/${link.id}/undo`), 200)
    const twice = await api.post(`/finance/bank-statement-lines/${registered.id}/undo`)
    twice.assertStatus(200)
    const wrong = await api.post(`/finance/bank-statement-lines/${link.id}/reconcile`, {
      action: 'link',
      paymentId: registered.payment.id,
    })
    wrong.assertStatus(422)
    assert.equal(wrong.body().errors[0].field, 'paymentId')

    // With reconciled movements the statement cannot be removed
    const reconciled = await client
      .delete(`/api/v1/finance/bank-statements/${statement.id}`)
      .loginAs(user)
      .header('X-Tenant-Id', tenant.id)
    reconciled.assertStatus(409)

    const list = await dataOf(api.get('/finance/bank-statements'))
    assert.lengthOf(list, 1)
    assert.equal(list[0].reconciled, 1)
    assert.isTrue(await trialBalanceIsBalanced(api))
  })

  test('reads Excel statements with a single amount column', async ({ client, assert }) => {
    const { default: ExcelJS } = await import('exceljs')
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Movimientos')
    sheet.addRow(['FECHA', 'DESCRIPCION', 'VALOR'])
    sheet.addRow([new Date(Date.UTC(2026, 10, 10)), 'ABONO TRANSFERENCIA 102', 480000])
    sheet.addRow([new Date(Date.UTC(2026, 10, 11)), 'GMF 4X1000', -1920])
    const bytes = Buffer.from(await workbook.xlsx.writeBuffer())

    const { tenant, user, bankId, units } = await financeSetup(client, { fees: false })
    const preview = await client
      .post('/api/v1/finance/bank-statements/preview')
      .loginAs(user)
      .header('X-Tenant-Id', tenant.id)
      .file('file', bytes, { filename: 'extracto.xlsx' })
    preview.assertStatus(200)
    const data = preview.body().data
    assert.equal(data.mapping.amount, 2)
    assert.equal(data.mapping.dateFormat, 'ymd')
    assert.deepEqual(
      data.sample.map((line: any) => [line.postedOn, line.amount]),
      [
        ['2026-11-10', '480000.00'],
        ['2026-11-11', '-1920.00'],
      ]
    )
    const created = await client
      .post('/api/v1/finance/bank-statements')
      .loginAs(user)
      .header('X-Tenant-Id', tenant.id)
      .file('file', bytes, { filename: 'extracto.xlsx' })
      .field('cashAccountId', bankId)
      .field('mapping', JSON.stringify(data.mapping))
    created.assertStatus(201)
    // "102" in the description names the unit, with less certainty than a reference
    const line = created.body().data.lines[0]
    assert.deepInclude(line.suggestion, { action: 'register', confidence: 'medium' })
    assert.equal(line.suggestion.unit.id, units.b.id)
  })

  test('only the administration and accounting import statements', async ({ client }) => {
    const { tenant, bankId } = await financeSetup(client, { fees: false })
    const council = await memberApi(client, tenant, 'council_member')
    const response = await importFile(
      client,
      tenant,
      council.user,
      '/finance/bank-statements',
      'Fecha;Valor\n01/11/2026;1000',
      {
        cashAccountId: bankId,
        mapping: JSON.stringify({
          headerRow: 0,
          date: 0,
          amount: 1,
          description: null,
          reference: null,
          credit: null,
          debit: null,
          dateFormat: 'dmy',
        }),
      }
    )
    response.assertStatus(403)
    const list = await council.api.get('/finance/bank-statements')
    list.assertStatus(200)
  })
})
