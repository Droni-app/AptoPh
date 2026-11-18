import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import {
  accountBalance,
  financeSetup,
  memberApi,
  trialBalanceIsBalanced,
  unitCharges,
  dataOf,
  expectStatus,
} from './helpers.js'

test.group('Finance · setup and permissions', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('the first access creates the chart of accounts and the default concepts', async ({
    client,
    assert,
  }) => {
    const { api } = await financeSetup(client, { fees: false })
    const accounts = (await dataOf(api.get('/finance/accounts'))) as Array<{
      code: string
      systemKey: string | null
    }>
    assert.isAbove(accounts.length, 100)
    assert.equal(accounts.find((a) => a.systemKey === 'receivable.ordinary_fee')?.code, '130505')
    // The bank got its own auxiliary
    assert.isTrue(accounts.some((a) => a.code === '11200501'))

    const concepts = (await dataOf(api.get('/finance/concepts'))) as Array<{
      code: string
      receivableAccount: { code: string }
    }>
    assert.includeMembers(
      concepts.map((c) => c.code),
      [
        'ordinary_fee',
        'extraordinary_fee',
        'interest',
        'fine',
        'parking',
        'visitor_parking',
        'amenity_booking',
      ]
    )
    assert.equal(concepts.find((c) => c.code === 'interest')?.receivableAccount.code, '130515')
    assert.equal(await accountBalance(api, '370505'), '2000000.00')
  })

  test('council reads finance but cannot write; staff has no access', async ({ client }) => {
    const { tenant } = await financeSetup(client, { fees: false })
    const council = await memberApi(client, tenant, 'council_member')
    await expectStatus(council.api.get('/finance/summary'), 200)
    await expectStatus(council.api.post('/finance/periods/generate', { period: '2026-01' }), 403)

    const accountant = await memberApi(client, tenant, 'accountant')
    await expectStatus(accountant.api.post('/finance/periods/generate', { period: '2026-01' }), 200)

    const staff = await memberApi(client, tenant, 'staff')
    await expectStatus(staff.api.get('/finance/summary'), 403)
  })
})

test.group('Finance · fees and billing', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('the calculator splits by coefficient and merges annexes into the main unit', async ({
    client,
    assert,
  }) => {
    const { api, concept, units } = await financeSetup(client, { fees: false })
    const preview = await api.post('/finance/fee-schedules/preview', {
      conceptId: concept('ordinary_fee'),
      method: 'area',
      effectiveFrom: '2026-01',
      monthlyTotal: 1_000_000,
      mergeAnnexes: true,
      rounding: 1000,
      roundingMode: 'up',
    })
    preview.assertStatus(200)
    const rows = preview.body().data.rows as Array<{
      unitId: string
      amount: string
      includes: string[]
    }>
    // Areas 80 + 12 (annex) / 48 / 32 over 172 m²
    assert.deepEqual(
      rows.map((row) => [row.unitId, row.amount, row.includes]),
      [
        [units.a.id, '535000.00', ['P-01']],
        [units.b.id, '280000.00', []],
        [units.c.id, '187000.00', []],
      ]
    )
    assert.equal(preview.body().data.roundingDifference, '2000.00')
  })

  test('contribution modules: each unit pays its part of the modules it belongs to', async ({
    client,
    assert,
  }) => {
    const { api, concept, units } = await financeSetup(client, { fees: false })
    const tower = await api.post('/finance/modules', {
      name: 'Torre (ascensor)',
      units: [
        { unitId: units.a.id, share: 1 },
        { unitId: units.b.id, share: 1 },
      ],
    })
    tower.assertStatus(201)
    const general = await api.post('/finance/modules', {
      name: 'General',
      units: [
        { unitId: units.a.id, share: 50 },
        { unitId: units.b.id, share: 30 },
        { unitId: units.c.id, share: 20 },
      ],
    })
    const preview = await api.post('/finance/fee-schedules/preview', {
      conceptId: concept('ordinary_fee'),
      method: 'module',
      effectiveFrom: '2026-01',
      rounding: 1,
      roundingMode: 'nearest',
      modules: [
        { moduleId: tower.body().data.id, monthlyTotal: 200_000 },
        { moduleId: general.body().data.id, monthlyTotal: 1_000_000 },
      ],
    })
    preview.assertStatus(200)
    assert.deepEqual(
      (preview.body().data.rows as Array<{ amount: string }>).map((row) => row.amount),
      ['600000.00', '400000.00', '200000.00']
    )
  })

  test('billing a month is idempotent and posts the accrual', async ({ client, assert }) => {
    const { api, units } = await financeSetup(client)
    const preview = await api.get('/finance/periods/preview', { period: '2026-01' })
    assert.equal(preview.body().data.count, 3)
    assert.equal(preview.body().data.total, '1000000.00')

    const first = await api.post('/finance/periods/generate', { period: '2026-01' })
    first.assertStatus(200)
    assert.equal(first.body().data.created, 3)
    const again = await api.post('/finance/periods/generate', { period: '2026-01' })
    assert.equal(again.body().data.created, 0)

    const charges = await unitCharges(api, units.a.id)
    assert.lengthOf(charges, 1)
    assert.equal(charges[0]!.amount, '500000.00')
    assert.equal(charges[0]!.period, '2026-01-01')
    assert.equal(await accountBalance(api, '130505'), '1000000.00')
    assert.equal(await accountBalance(api, '417005'), '1000000.00')
    assert.isTrue(await trialBalanceIsBalanced(api))
  })

  test('new fees cannot start in a month already billed', async ({ client }) => {
    const { api, concept } = await financeSetup(client)
    await api.post('/finance/periods/generate', { period: '2026-01' })
    const response = await api.post('/finance/fee-schedules', {
      conceptId: concept('ordinary_fee'),
      method: 'equal',
      effectiveFrom: '2026-01',
      monthlyTotal: 900_000,
      rounding: 100,
      roundingMode: 'nearest',
    })
    response.assertStatus(422)
    response.assertBodyContains({ errors: [{ field: 'effectiveFrom' }] })
  })

  test('late interest accrues on overdue capital, never on interest', async ({
    client,
    assert,
  }) => {
    const { api, units } = await financeSetup(client)
    await api.post('/finance/periods/generate', { period: '2026-01' })
    await api.post('/finance/periods/generate', { period: '2026-02' })
    await api.post('/finance/periods/generate', { period: '2026-03' })

    const chargesOfA = await unitCharges(api, units.a.id)
    const interest = chargesOfA.filter((row) => row.concept.type === 'interest')
    // February: 2 % of January; March: 2 % of January and of February
    assert.deepEqual(interest.map((row) => row.amount).sort(), ['10000.00', '10000.00', '10000.00'])
    assert.equal(await accountBalance(api, '130515'), '60000.00')
    assert.equal(await accountBalance(api, '421005'), '60000.00')
    assert.isTrue(await trialBalanceIsBalanced(api))
  })

  test('a closed period cannot be generated again', async ({ client }) => {
    const { api } = await financeSetup(client)
    const generated = await api.post('/finance/periods/generate', { period: '2026-01' })
    const periodId = generated.body().data.period.id
    await expectStatus(api.post(`/finance/periods/${periodId}/close`), 200)
    await expectStatus(api.post('/finance/periods/generate', { period: '2026-01' }), 409)
    await expectStatus(api.post(`/finance/periods/${periodId}/reopen`), 200)
    await expectStatus(api.post('/finance/periods/generate', { period: '2026-01' }), 200)
  })

  test('manual charges, cancellation and credit notes', async ({ client, assert }) => {
    const { api, units, concept } = await financeSetup(client, { fees: false })
    const created = await api.post('/finance/charges', {
      unitIds: [units.a.id, units.b.id],
      conceptId: concept('extraordinary_fee'),
      amount: 300_000,
      dueOn: '2026-02-28',
      period: '2026-02',
      description: 'Cuota 1 de 3 · fachada',
    })
    created.assertStatus(201)
    assert.equal(created.body().data.created, 2)

    const [chargeA] = await unitCharges(api, units.a.id)
    const [chargeB] = await unitCharges(api, units.b.id)
    const cancelled = await api.post(`/finance/charges/${chargeA!.id}/cancel`, {
      reason: 'Unidad exonerada por asamblea',
    })
    cancelled.assertStatus(200)
    assert.equal(cancelled.body().data.status, 'cancelled')
    await expectStatus(
      api.post(`/finance/charges/${chargeA!.id}/cancel`, { reason: 'Otra vez' }),
      409
    )

    const note = await api.post(`/finance/charges/${chargeB!.id}/credit-note`, {
      amount: 100_000,
      reason: 'Ajuste aprobado',
    })
    note.assertStatus(200)
    assert.equal(note.body().data.balance, '200000.00')
    assert.equal(note.body().data.status, 'partially_paid')
    await expectStatus(
      api.post(`/finance/charges/${chargeB!.id}/credit-note`, {
        amount: 300_000,
        reason: 'Demasiado',
      }),
      422
    )

    assert.equal(await accountBalance(api, '130510'), '200000.00')
    assert.equal(await accountBalance(api, '417010'), '200000.00')
    assert.isTrue(await trialBalanceIsBalanced(api))
  })
})
