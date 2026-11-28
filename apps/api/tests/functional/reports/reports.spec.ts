import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { REPORTS } from '@aptoph/shared'
import AuditLog from '#models/tenants/audit_log'
import { dataOf, expectStatus, financeSetup, memberApi, type Finance } from '../finance/helpers.js'

type Result = {
  key: string
  title: string
  columns: Array<{ key: string; type: string }>
  rows: Array<Record<string, any>>
  totals: Record<string, any> | null
  summary: Array<{ label: string; value: any }>
  filters: Array<{ label: string; value: string }>
  notes: string[]
}

/** January billed ($1.000.000 by coefficient), unit 101 pays all of it, 102 pays half */
async function billed(s: Finance) {
  await expectStatus(s.api.post('/finance/periods/generate', { period: '2026-01' }), 200)
  await expectStatus(
    s.api.post('/finance/payments', {
      unitId: s.units.a.id,
      amount: 500_000,
      paidOn: '2026-01-10',
      method: 'bank_transfer',
      reference: 'TRF-1',
      cashAccountId: s.bankId,
    }),
    201
  )
  await expectStatus(
    s.api.post('/finance/payments', {
      unitId: s.units.b.id,
      amount: 150_000,
      paidOn: '2026-01-20',
      method: 'cash',
      cashAccountId: s.bankId,
    }),
    201
  )
}

const report = (s: Finance, key: string, qs: Record<string, unknown> = {}) =>
  dataOf(s.api.get(`/reports/${key}`, qs)) as Promise<Result>

test.group('Reports · access', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('each role reads only its reports', async ({ client }) => {
    const s = await financeSetup(client, { fees: false })
    const accountant = await memberApi(client, s.tenant, 'accountant')
    const council = await memberApi(client, s.tenant, 'council_member')
    const reviewer = await memberApi(client, s.tenant, 'fiscal_reviewer')
    const staff = await memberApi(client, s.tenant, 'staff')
    const guard = await memberApi(client, s.tenant, 'security_guard')
    const resident = await memberApi(client, s.tenant, 'resident')

    await expectStatus(accountant.api.get('/reports/collections'), 200)
    await expectStatus(accountant.api.get('/reports/withholdings'), 200)
    // Operations are not the accountant's
    await expectStatus(accountant.api.get('/reports/tickets'), 403)
    await expectStatus(accountant.api.get('/reports/census'), 403)
    await expectStatus(council.api.get('/reports/census'), 200)
    await expectStatus(reviewer.api.get('/reports/adjustments'), 200)
    await expectStatus(reviewer.api.get('/reports/members_access'), 200)
    for (const other of [staff, guard, resident]) {
      await expectStatus(other.api.get('/reports/options'), 403)
      await expectStatus(other.api.get('/reports/collections'), 403)
    }
    await expectStatus(s.api.get('/reports/nope'), 404)
  })

  test('the options list only the data of the conjunto', async ({ client, assert }) => {
    const s = await financeSetup(client, { fees: false })
    const other = await financeSetup(client, { fees: false })
    const options = await dataOf(s.api.get('/reports/options'))
    assert.lengthOf(options.cashAccounts, 1)
    assert.notInclude(
      options.cashAccounts.map((option: { value: string }) => option.value),
      other.bankId
    )
    assert.isAbove(options.concepts.length, 0)
    assert.isAbove(options.expenseAccounts.length, 0)
  })
})

test.group('Reports · catalog', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('every report runs with its default filters and every grouping', async ({
    client,
    assert,
  }) => {
    const s = await financeSetup(client)
    await billed(s)
    for (const definition of REPORTS) {
      const groupBy = definition.filters.find((filter) => filter.key === 'groupBy')
      const views =
        groupBy && groupBy.type === 'select'
          ? groupBy.options!.map((option) => option.value)
          : [undefined]
      for (const view of views) {
        const response = await s.api.get(
          `/reports/${definition.key}`,
          view ? { groupBy: view } : {}
        )
        assert.equal(response.status(), 200, `${definition.key} ${view ?? ''}: ${response.text()}`)
        const data = response.body().data as Result
        assert.equal(data.key, definition.key)
        assert.isArray(data.columns)
        for (const row of data.rows) {
          for (const column of data.columns)
            assert.property(row, column.key, `${definition.key}.${column.key}`)
        }
      }
    }
  })

  test('rejects bad filters', async ({ client }) => {
    const s = await financeSetup(client, { fees: false })
    await expectStatus(s.api.get('/reports/collections', { from: '2026-13-01' }), 422)
    await expectStatus(
      s.api.get('/reports/collections', { from: '2026-02-01', to: '2026-01-01' }),
      422
    )
    await expectStatus(s.api.get('/reports/collections', { method: 'bitcoin' }), 422)
    await expectStatus(s.api.get('/reports/collections', { cashAccountId: 'abc' }), 422)
    await expectStatus(s.api.get('/reports/collections', { groupBy: 'weekday' }), 422)
  })
})

test.group('Reports · collection and receivables', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('collections by receipt and grouped', async ({ client, assert }) => {
    const s = await financeSetup(client)
    await billed(s)
    const detail = await report(s, 'collections', { from: '2026-01-01', to: '2026-01-31' })
    assert.lengthOf(detail.rows, 2)
    assert.equal(detail.totals!.amount, '650000.00')
    assert.equal(detail.summary[0]!.value, '650000.00')
    assert.deepInclude(detail.filters, { label: 'Desde', value: '1 ene 2026' })

    const byMethod = await report(s, 'collections', {
      from: '2026-01-01',
      to: '2026-01-31',
      groupBy: 'method',
    })
    assert.deepEqual(
      byMethod.rows.map((row) => [row.group, row.amount]),
      [
        ['Transferencia', '500000.00'],
        ['Efectivo', '150000.00'],
      ]
    )
    const cash = await report(s, 'collections', {
      from: '2026-01-01',
      to: '2026-01-31',
      method: 'cash',
    })
    assert.lengthOf(cash.rows, 1)
    // Other months do not count
    const february = await report(s, 'collections', { from: '2026-02-01', to: '2026-02-28' })
    assert.lengthOf(february.rows, 0)
  })

  test('billed against collected', async ({ client, assert }) => {
    const s = await financeSetup(client)
    await billed(s)
    const result = await report(s, 'billing_collection', { from: '2026-01', to: '2026-02' })
    assert.lengthOf(result.rows, 2)
    const january = result.rows[0]!
    assert.equal(january.billed, '1000000.00')
    assert.equal(january.paid, '650000.00')
    assert.equal(january.balance, '350000.00')
    assert.equal(january.rate, 65)
    assert.equal(result.rows[1]!.billed, '0.00')
  })

  test('aging and delinquents from the open charges', async ({ client, assert }) => {
    const s = await financeSetup(client)
    await billed(s)
    const aging = await report(s, 'receivables_aging')
    // 101 paid everything; 102 and 103 owe
    assert.deepEqual(aging.rows.map((row) => row.unit).sort(), ['102', '103'])
    assert.equal(aging.totals!.total, '350000.00')
    assert.isNotNull(aging.rows.find((row) => row.unit === '102')!.lastPayment)

    const delinquents = await report(s, 'delinquents')
    assert.lengthOf(delinquents.rows, 2)
    assert.equal(delinquents.rows[0]!.months, 1)
    const big = await report(s, 'delinquents', { minAmount: 160000 })
    assert.deepEqual(
      big.rows.map((row) => row.unit),
      ['103']
    )
    const tower = await report(s, 'receivables_aging', { unitType: 'parking' })
    assert.lengthOf(tower.rows, 0)
  })

  test('cash flow and credit balances', async ({ client, assert }) => {
    const s = await financeSetup(client)
    await billed(s)
    await expectStatus(
      s.api.post('/finance/payments', {
        unitId: s.units.c.id,
        amount: 300_000,
        paidOn: '2026-01-25',
        method: 'pse',
        cashAccountId: s.bankId,
      }),
      201
    )
    const flow = await report(s, 'cash_flow', { from: '2026-01-01', to: '2026-01-31' })
    assert.equal(flow.rows[0]!.opening, '2000000.00')
    assert.equal(flow.rows[0]!.inflows, '950000.00')
    assert.equal(flow.rows[0]!.closing, '2950000.00')
    const detail = await report(s, 'cash_flow', {
      from: '2026-01-01',
      to: '2026-01-31',
      groupBy: 'detail',
    })
    assert.equal(detail.rows.at(-1)!.balance, '2950000.00')

    // 103 owed 200.000 and paid 300.000
    const credit = await report(s, 'credit_balances')
    assert.deepEqual(
      credit.rows.map((row) => [row.unit, row.credit]),
      [['103', '100000.00']]
    )
  })

  test('reversals and rejections show up for the fiscal reviewer', async ({ client, assert }) => {
    const s = await financeSetup(client)
    await billed(s)
    const payments = await dataOf(s.api.get('/finance/payments'))
    const first = payments.find((p: { number: number }) => p.number === 1)
    await expectStatus(
      s.api.post(`/finance/payments/${first.id}/reverse`, { reason: 'Consignación duplicada' }),
      200
    )
    const reviewer = await memberApi(client, s.tenant, 'fiscal_reviewer')
    const result = (await dataOf(
      reviewer.api.get('/reports/adjustments', { from: '2026-01-01', to: '2026-12-31' })
    )) as Result
    const row = result.rows.find((r) => r.kind === 'Recibo reversado')
    assert.exists(row)
    assert.equal(row!.reason, 'Consignación duplicada')
    assert.equal(row!.amount, '500000.00')
    assert.equal(row!.user, s.user.fullName)
  })
})

test.group('Reports · census', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('flags missing owners and the coefficient sum', async ({ client, assert }) => {
    const s = await financeSetup(client, { fees: false })
    const census = await report(s, 'census')
    assert.lengthOf(census.rows, 4)
    assert.equal(census.summary[1]!.value, 1)
    assert.lengthOf(
      census.notes.filter((note: string) => note.includes('deberían sumar')),
      0
    )
    const noOwner = await report(s, 'census', { issue: 'no_owner' })
    // The parking spot is an annex of 101: it does not need people
    assert.deepEqual(noOwner.rows.map((row) => row.unit).sort(), ['101', '102', '103'])

    await expectStatus(s.api.patch(`/units/${s.units.c.id}`, { ownershipCoefficient: 0.1 }), 200)
    const wrong = await report(s, 'census')
    assert.isTrue(wrong.notes.some((note: string) => note.includes('deberían sumar')))
  })
})

test.group('Reports · export', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('Excel and CSV, and the export is audited', async ({ client, assert }) => {
    const s = await financeSetup(client)
    await billed(s)
    const xlsx = await s.api.get('/reports/receivables_aging/export', { format: 'xlsx' })
    xlsx.assertStatus(200)
    assert.include(xlsx.header('content-type'), 'spreadsheetml')
    assert.include(xlsx.header('content-disposition'), 'receivables-aging-')

    const csv = await s.api.get('/reports/collections/export', {
      format: 'csv',
      from: '2026-01-01',
      to: '2026-01-31',
    })
    csv.assertStatus(200)
    const text = csv.text()
    assert.include(text, 'Fecha;Recibo;Unidad')
    assert.include(text, '500000,00')

    await expectStatus(s.api.get('/reports/collections/export', { format: 'pdf' }), 422)

    const exports = await AuditLog.query()
      .where('tenant_id', s.tenant.id)
      .where('action', 'exported')
    assert.lengthOf(exports, 2)
    assert.equal(exports[0]!.userId, s.user.id)
    assert.sameMembers(
      exports.map((log) => (log.changes as any).details.format),
      ['xlsx', 'csv']
    )
  })

  test('a role without the report cannot export it', async ({ client }) => {
    const s = await financeSetup(client, { fees: false })
    const accountant = await memberApi(client, s.tenant, 'accountant')
    await expectStatus(accountant.api.get('/reports/census/export'), 403)
    const staff = await memberApi(client, s.tenant, 'staff')
    await expectStatus(staff.api.get('/reports/collections/export'), 403)
  })
})
