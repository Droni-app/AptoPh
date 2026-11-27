import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import {
  accountBalance,
  financeSetup,
  trialBalanceIsBalanced,
  dataOf,
  expectStatus,
} from './helpers.js'

test.group('Finance · vendors, bills and payments', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('a bill posts expense with VAT, withholdings and the net payable', async ({
    client,
    assert,
  }) => {
    const { api, bankId } = await financeSetup(client, { fees: false })
    const accounts = (await dataOf(api.get('/finance/accounts', { postable: true }))) as Array<{
      id: string
      code: string
    }>
    const account = (code: string) => accounts.find((row) => row.code === code)!.id

    const vendor = await api.post('/finance/vendors', {
      name: 'Ascensores S.A.S.',
      documentType: 'NIT',
      documentNumber: '900111222-3',
      defaultAccountId: account('514515'),
    })
    vendor.assertStatus(201)
    const duplicate = await api.post('/finance/vendors', {
      name: 'Otro',
      documentNumber: '900111222-3',
    })
    duplicate.assertStatus(422)

    const bill = await api.post('/finance/bills', {
      vendorId: vendor.body().data.id,
      number: 'FE-100',
      issuedOn: '2026-02-01',
      dueOn: '2026-02-15',
      description: 'Mantenimiento de ascensores febrero',
      lines: [{ accountId: account('514515'), amount: 1_000_000 }],
      taxAmount: 190_000,
      withholdingIncomeTax: 40_000,
      withholdingVat: 28_500,
    })
    bill.assertStatus(201)
    assert.equal(bill.body().data.total, '1190000.00')
    assert.equal(bill.body().data.netAmount, '1121500.00')
    assert.equal(await accountBalance(api, '514515'), '1190000.00')
    assert.equal(await accountBalance(api, '220505'), '1121500.00')
    assert.equal(await accountBalance(api, '236595'), '40000.00')
    assert.equal(await accountBalance(api, '236705'), '28500.00')

    const again = await api.post('/finance/bills', {
      vendorId: vendor.body().data.id,
      number: 'FE-100',
      issuedOn: '2026-02-01',
      dueOn: '2026-02-15',
      description: 'Duplicada',
      lines: [{ accountId: account('514515'), amount: 1 }],
    })
    again.assertStatus(422)

    // Paying more than owed is rejected; a partial payment leaves the rest
    const tooMuch = await api.post('/finance/vendor-payments', {
      vendorId: vendor.body().data.id,
      cashAccountId: bankId,
      paidOn: '2026-02-10',
      method: 'bank_transfer',
      amount: 2_000_000,
    })
    tooMuch.assertStatus(422)
    const payment = await api.post('/finance/vendor-payments', {
      vendorId: vendor.body().data.id,
      cashAccountId: bankId,
      paidOn: '2026-02-10',
      method: 'bank_transfer',
      amount: 1_000_000,
    })
    payment.assertStatus(201)
    assert.equal(payment.body().data.number, 1)
    const shown = await api.get(`/finance/bills/${bill.body().data.id}`)
    assert.equal(shown.body().data.status, 'partially_paid')
    assert.equal(shown.body().data.balance, '121500.00')

    await expectStatus(
      api.post(`/finance/bills/${bill.body().data.id}/cancel`, { reason: 'Error' }),
      409
    )
    const reversed = await api.post(`/finance/vendor-payments/${payment.body().data.id}/reverse`, {
      reason: 'Transferencia rechazada',
    })
    reversed.assertStatus(200)
    const cancelled = await api.post(`/finance/bills/${bill.body().data.id}/cancel`, {
      reason: 'Factura mal emitida',
    })
    cancelled.assertStatus(200)
    assert.equal(await accountBalance(api, '220505'), '0.00')
    assert.equal(await accountBalance(api, '514515'), '0.00')
    assert.isTrue(await trialBalanceIsBalanced(api))
  })

  test('a cash expense is recorded and paid in one step', async ({ client, assert }) => {
    const { api, bankId } = await financeSetup(client, { fees: false })
    const accounts = (await dataOf(api.get('/finance/accounts', { postable: true }))) as Array<{
      id: string
      code: string
    }>
    const vendor = await api.post('/finance/vendors', { name: 'Ferretería' })
    const bill = await api.post('/finance/bills', {
      vendorId: vendor.body().data.id,
      issuedOn: '2026-02-03',
      dueOn: '2026-02-03',
      description: 'Bombillos',
      lines: [{ accountId: accounts.find((a) => a.code === '514595')!.id, amount: 85_000 }],
      payNow: { cashAccountId: bankId, paidOn: '2026-02-03', method: 'cash' },
    })
    bill.assertStatus(201)
    assert.equal(bill.body().data.status, 'paid')
    assert.equal(await accountBalance(api, '11200501'), '1915000.00')
    assert.isTrue(await trialBalanceIsBalanced(api))
  })
})

test.group('Finance · accounting', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('manual entries must balance and can be reversed', async ({ client, assert }) => {
    const { api } = await financeSetup(client, { fees: false })
    const accounts = (await dataOf(api.get('/finance/accounts'))) as Array<{
      id: string
      code: string
    }>
    const account = (code: string) => accounts.find((row) => row.code === code)!.id

    const unbalanced = await api.post('/finance/journal', {
      date: '2026-02-01',
      description: 'Descuadrada',
      lines: [
        { accountId: account('530505'), debit: 10_000 },
        { accountId: account('11200501'), credit: 9_000 },
      ],
    })
    unbalanced.assertStatus(422)
    const toGroup = await api.post('/finance/journal', {
      date: '2026-02-01',
      description: 'A una cuenta de grupo',
      lines: [
        { accountId: account('5305'), debit: 10_000 },
        { accountId: account('11200501'), credit: 10_000 },
      ],
    })
    toGroup.assertStatus(422)

    const entry = await api.post('/finance/journal', {
      date: '2026-02-01',
      description: 'Comisiones bancarias de enero',
      lines: [
        { accountId: account('530515'), debit: 12_500 },
        { accountId: account('11200501'), credit: 12_500 },
      ],
    })
    entry.assertStatus(201)
    assert.lengthOf(entry.body().data.lines, 2)
    assert.equal(await accountBalance(api, '530515'), '12500.00')

    await expectStatus(
      api.post(`/finance/journal/${entry.body().data.id}/reverse`, {
        reason: 'Era de febrero',
      }),
      200
    )
    assert.equal(await accountBalance(api, '530515'), '0.00')
    await expectStatus(
      api.post(`/finance/journal/${entry.body().data.id}/reverse`, { reason: 'Otra vez' }),
      409
    )
  })

  test('budget execution and the monthly reserve fund', async ({ client, assert }) => {
    const { api } = await financeSetup(client)
    const accounts = (await dataOf(api.get('/finance/accounts'))) as Array<{
      id: string
      code: string
    }>
    const account = (code: string) => accounts.find((row) => row.code === code)!.id
    const budget = await api.post('/finance/budgets', {
      year: 2026,
      name: 'Presupuesto 2026',
      reserveFundRate: 1,
      items: [
        { accountId: account('417005'), annualAmount: 12_000_000 },
        { accountId: account('513505'), annualAmount: 9_600_000 },
        { accountId: account('513530'), annualAmount: 2_400_000 },
      ],
    })
    budget.assertStatus(201)
    // (12.000.000 of expenses + 1 % reserve fund) ÷ 12; fee income is not "other income"
    assert.equal(budget.body().data.monthlyBase.monthly, '1010000.00')
    const id = budget.body().data.id
    assert.exists(budget.body().data.execution)
    // Saving a draft answers the full detail: the page replaces what it shows with it
    const saved = await expectStatus(
      api.put(`/finance/budgets/${id}`, {
        year: 2026,
        name: 'Presupuesto 2026',
        reserveFundRate: 1,
        items: budget
          .body()
          .data.items.map((item: { accountId: string; annualAmount: string }) => ({
            accountId: item.accountId,
            annualAmount: Number(item.annualAmount),
          })),
      }),
      200
    )
    assert.exists(saved.body().data.execution.expense.totals)
    const approved = await expectStatus(
      api.post(`/finance/budgets/${id}/approve`, {
        approvedOn: '2026-03-20',
        approvalReference: 'Acta 5',
      }),
      200
    )
    assert.exists(approved.body().data.execution)
    await expectStatus(
      api.put(`/finance/budgets/${id}`, {
        year: 2026,
        name: 'X',
        reserveFundRate: 1,
        items: [],
      }),
      409
    )

    await api.post('/finance/periods/generate', { period: '2026-01' })
    // 1 % of 12.000.000 of expenses, a twelfth per month
    assert.equal(await accountBalance(api, '539595'), '10000.00')
    assert.equal(await accountBalance(api, '330595'), '10000.00')
    await api.post('/finance/periods/generate', { period: '2026-01' })
    assert.equal(await accountBalance(api, '539595'), '10000.00')

    const shown = await api.get(`/finance/budgets/${id}`)
    const income = shown
      .body()
      .data.execution.income.rows.find((row: { code: string }) => row.code === '417005')
    assert.equal(income.actual, '1000000.00')

    const statement = await api.get('/finance/reports/income-statement', {
      from: '2026-01-01',
      to: '2026-12-31',
    })
    assert.equal(statement.body().data.result, '990000.00')
    const sheet = await api.get('/finance/reports/balance-sheet', { to: '2026-12-31' })
    assert.equal(sheet.body().data.assets.total, sheet.body().data.totalLiabilitiesAndEquity)
  })

  test('bills only go to expense, fixed or prepaid asset accounts', async ({ client }) => {
    const { api } = await financeSetup(client, { fees: false })
    const accounts = (await dataOf(api.get('/finance/accounts', { postable: true }))) as Array<{
      id: string
      code: string
    }>
    const account = (code: string) => accounts.find((row) => row.code === code)!.id
    const vendor = await dataOf(api.post('/finance/vendors', { name: 'Ferretería' }))
    const bill = (accountId: string) =>
      api.post('/finance/bills', {
        vendorId: (vendor as { id: string }).id,
        issuedOn: '2026-02-01',
        dueOn: '2026-02-15',
        description: 'Compra',
        lines: [{ accountId, amount: 100_000 }],
      })
    // The bank and the receivables are not expenses
    await expectStatus(bill(account('11200501')), 422)
    await expectStatus(bill(account('130505')), 422)
    await expectStatus(
      api.post('/finance/vendors', { name: 'Otro', defaultAccountId: account('11200501') }),
      422
    )
    await expectStatus(bill(account('514515')), 201)
  })
})
