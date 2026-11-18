import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import UnitOccupant from '#models/unit_occupant'
import {
  accountBalance,
  apiFor,
  financeSetup,
  memberApi,
  trialBalanceIsBalanced,
  unitCharges,
  dataOf,
  expectStatus,
} from './helpers.js'

test.group('Finance · payments', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('a payment goes to interest first, then the oldest charges; the rest is credit', async ({
    client,
    assert,
  }) => {
    const { api, units, bankId } = await financeSetup(client)
    await api.post('/finance/periods/generate', { period: '2026-01' })
    await api.post('/finance/periods/generate', { period: '2026-02' })
    // Unit A owes January 500.000, February 500.000 and 10.000 of interest

    const payment = await api.post('/finance/payments', {
      unitId: units.a.id,
      amount: 700_000,
      paidOn: '2026-02-08',
      method: 'bank_transfer',
      reference: 'TRF-1',
      cashAccountId: bankId,
    })
    payment.assertStatus(201)
    assert.equal(payment.body().data.number, 1)
    assert.equal(payment.body().data.status, 'confirmed')
    assert.equal(payment.body().data.unappliedAmount, '0.00')

    const charges = await unitCharges(api, units.a.id)
    const interest = charges.find((c) => c.concept.type === 'interest')!
    const january = charges.find(
      (c) => c.period === '2026-01-01' && c.concept.type === 'ordinary_fee'
    )!
    const february = charges.find(
      (c) => c.period === '2026-02-01' && c.concept.type === 'ordinary_fee'
    )!
    assert.equal(interest.balance, '0.00')
    assert.equal(january.balance, '0.00')
    assert.equal(february.balance, '310000.00')

    // Paying more than the debt leaves a credit balance (saldo a favor)
    const extra = await api.post('/finance/payments', {
      unitId: units.a.id,
      amount: 400_000,
      paidOn: '2026-02-09',
      method: 'pse',
      cashAccountId: bankId,
    })
    assert.equal(extra.body().data.unappliedAmount, '90000.00')
    assert.equal(await accountBalance(api, '280505'), '90000.00')

    // The credit pays the next month as soon as it is billed
    await api.post('/finance/periods/generate', { period: '2026-03' })
    const afterMarch = await unitCharges(api, units.a.id)
    const march = afterMarch.find((c) => c.period === '2026-03-01')!
    assert.equal(march.balance, '410000.00')
    assert.equal(await accountBalance(api, '280505'), '0.00')

    const statement = await api.get(`/finance/units/${units.a.id}/statement`)
    statement.assertStatus(200)
    assert.equal(statement.body().data.debt, '410000.00')
    assert.equal(statement.body().data.closing, '410000.00')
    assert.isTrue(await trialBalanceIsBalanced(api))
  })

  test('a reversal gives the charges their balance back', async ({ client, assert }) => {
    const { api, units, bankId } = await financeSetup(client)
    await api.post('/finance/periods/generate', { period: '2026-01' })
    const payment = await api.post('/finance/payments', {
      unitId: units.b.id,
      amount: 350_000,
      paidOn: '2026-01-05',
      method: 'cash',
      cashAccountId: bankId,
    })
    assert.equal(payment.body().data.unappliedAmount, '50000.00')

    const reversed = await api.post(`/finance/payments/${payment.body().data.id}/reverse`, {
      reason: 'Cheque devuelto',
    })
    reversed.assertStatus(200)
    assert.equal(reversed.body().data.status, 'reversed')
    const [charge] = await unitCharges(api, units.b.id)
    assert.equal(charge!.balance, '300000.00')
    assert.equal(charge!.status, 'pending')
    assert.equal(await accountBalance(api, '280505'), '0.00')
    assert.equal(await accountBalance(api, '11200501'), '2000000.00')
    await expectStatus(
      api.post(`/finance/payments/${payment.body().data.id}/reverse`, { reason: 'Otra vez' }),
      409
    )
    assert.isTrue(await trialBalanceIsBalanced(api))
  })

  test('early payment discount when the charge is paid in full on time', async ({
    client,
    assert,
  }) => {
    const { api, units, bankId } = await financeSetup(client)
    const settings = await dataOf(api.get('/finance/settings'))
    await api.put('/finance/settings', {
      ...settings,
      today: undefined,
      earlyDiscount: { enabled: true, rate: 5, day: 5 },
    })
    await api.post('/finance/periods/generate', { period: '2026-01' })

    const onTime = await api.post('/finance/payments', {
      unitId: units.a.id,
      amount: 475_000,
      paidOn: '2026-01-04',
      method: 'pse',
      cashAccountId: bankId,
    })
    assert.equal(onTime.body().data.unappliedAmount, '0.00')
    const [paid] = await unitCharges(api, units.a.id)
    assert.equal(paid!.status, 'paid')
    assert.equal(await accountBalance(api, '417505'), '25000.00')

    // Late: no discount
    await api.post('/finance/payments', {
      unitId: units.b.id,
      amount: 285_000,
      paidOn: '2026-01-07',
      method: 'pse',
      cashAccountId: bankId,
    })
    const [late] = await unitCharges(api, units.b.id)
    assert.equal(late!.balance, '15000.00')
    assert.isTrue(await trialBalanceIsBalanced(api))
  })

  test('residents report payments and see only their own statement', async ({ client, assert }) => {
    const { api, tenant, units, bankId } = await financeSetup(client)
    await api.post('/finance/periods/generate', { period: '2026-01' })
    const resident = await memberApi(client, tenant, 'resident')
    await UnitOccupant.create({
      tenantId: tenant.id,
      unitId: units.c.id,
      userId: resident.user.id,
      fullName: resident.user.fullName,
      relationship: 'owner',
      isPrimaryContact: true,
    })

    const statement = await resident.api.get(`/resident/units/${units.c.id}/statement`)
    statement.assertStatus(200)
    assert.equal(statement.body().data.debt, '200000.00')
    assert.lengthOf(statement.body().data.openCharges, 1)
    await expectStatus(resident.api.get(`/resident/units/${units.a.id}/statement`), 404)

    const reported = await resident.api.post(`/resident/units/${units.c.id}/payments`, {
      amount: 200_000,
      paidOn: '2026-01-06',
      method: 'bank_transfer',
      reference: 'Transferencia 991',
    })
    reported.assertStatus(201)
    assert.equal(reported.body().data.status, 'pending_review')
    await expectStatus(
      resident.api.post(`/resident/units/${units.a.id}/payments`, {
        amount: 1,
        paidOn: '2026-01-06',
        method: 'pse',
      }),
      404
    )

    // Nothing changes until the administration confirms it
    const [reportedCharge] = await unitCharges(api, units.c.id)
    assert.equal(reportedCharge!.balance, '200000.00')
    const confirmed = await api.post(`/finance/payments/${reported.body().data.id}/confirm`, {
      cashAccountId: bankId,
    })
    confirmed.assertStatus(200)
    assert.equal(confirmed.body().data.status, 'confirmed')
    const [confirmedCharge] = await unitCharges(api, units.c.id)
    assert.equal(confirmedCharge!.status, 'paid')
    await expectStatus(
      api.post(`/finance/payments/${reported.body().data.id}/reject`, { reason: 'No llegó' }),
      409
    )

    const mine = await resident.api.get('/resident/payments')
    assert.lengthOf(mine.body().data, 1)

    const other = await resident.api.post(`/resident/units/${units.c.id}/payments`, {
      amount: 50_000,
      paidOn: '2026-01-07',
      method: 'pse',
    })
    const rejected = await api.post(`/finance/payments/${other.body().data.id}/reject`, {
      reason: 'No aparece en el banco',
    })
    assert.equal(rejected.body().data.status, 'rejected')
    void apiFor
  })

  test('the books can be closed up to a date', async ({ client }) => {
    const { api, units, bankId } = await financeSetup(client)
    await api.post('/finance/periods/generate', { period: '2026-01' })
    const settings = await dataOf(api.get('/finance/settings'))
    await api.put('/finance/settings', { ...settings, today: undefined, lockedUntil: '2026-01-31' })
    const blocked = await api.post('/finance/payments', {
      unitId: units.a.id,
      amount: 100_000,
      paidOn: '2026-01-20',
      method: 'pse',
      cashAccountId: bankId,
    })
    blocked.assertStatus(422)
    blocked.assertBodyContains({ errors: [{ field: 'paidAt' }] })
  })
})
