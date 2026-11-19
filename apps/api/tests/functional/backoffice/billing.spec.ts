import { test } from '@japa/runner'
import type { ApiClient } from '@japa/api-client'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import mail from '@adonisjs/mail/services/main'
import { DateTime } from 'luxon'
import { quote } from '@aptoph/shared'
import BillingMail from '#mails/billing_mail'
import BillingCharge from '#models/billing_charge'
import Subscription from '#models/subscription'
import type Tenant from '#models/tenant'
import { runBillingTick } from '#services/billing_scheduler'
import { EmailQuotaService } from '#services/email_quota'
import { wompi } from '#services/wompi'
import { FakeWompi, signedEvent } from '#tests/fake_wompi'
import { createMember, resetRateLimits } from '#tests/helpers'
import { apiFor, dataOf, expectStatus } from '../finance/helpers.js'

async function setup(client: ApiClient, subscription: Partial<Subscription> = {}) {
  const { tenant, user } = await createMember('administrator')
  await Subscription.create({
    tenantId: tenant.id,
    plan: 'completo',
    billingCycle: 'monthly',
    status: 'trialing',
    declaredUnits: 120,
    trialEndsAt: DateTime.now().plus({ days: 10 }),
    ...subscription,
  })
  return { tenant, user, api: apiFor(client, tenant, user) }
}

type Api = ReturnType<typeof apiFor>

/** What the browser does: shows Wompi's contracts and saves the tokenized card */
async function saveCard(api: Api, token = 'tok_test_4242') {
  const config = await dataOf(api.get('/billing/config'))
  return api.put('/billing/payment-method', {
    type: 'CARD',
    token,
    acceptanceToken: config.acceptance.acceptanceToken,
    personalAuthToken: config.acceptance.personalAuthToken,
    expMonth: 12,
    expYear: 29,
  })
}

const subscriptionOf = (tenant: Tenant) => Subscription.findByOrFail('tenant_id', tenant.id)
async function statusOf(tenant: Tenant) {
  const subscription = await subscriptionOf(tenant)
  return subscription.status
}
async function chargeStatus(api: Api, id: string) {
  const charge = await dataOf(api.get(`/billing/charges/${id}`))
  return charge.status
}
const receipts = (mails: ReturnType<typeof mail.fake>['mails']) =>
  mails.queued((message) => message instanceof BillingMail) as BillingMail[]

test.group('Back-office · billing (Wompi)', (group) => {
  let fake: FakeWompi
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(async () => {
    fake = new FakeWompi()
    wompi.swap(fake)
    await resetRateLimits()
    return () => {
      wompi.restore()
      mail.restore()
    }
  })

  test('only the administration manages payments, also while the plan is locked', async ({
    client,
    assert,
  }) => {
    const { tenant, api } = await setup(client, {
      trialEndsAt: DateTime.now().minus({ days: 2 }),
    })
    const { user: council } = await createMember('council_member', tenant)
    const councilApi = apiFor(client, tenant, council)
    await expectStatus(councilApi.get('/billing'), 403)
    await expectStatus(councilApi.get('/billing/config'), 403)

    const config = await dataOf(api.get('/billing/config'))
    assert.equal(config.environment, 'sandbox')
    assert.equal(config.publicKey, 'pub_test_fake')
    assert.equal(config.acceptance.policyUrl, 'https://wompi.co/terminos.pdf')
    // Locked trial: the plan can still be paid
    const saved = await saveCard(api)
    saved.assertStatus(200)
    assert.equal(saved.body().data.paymentMethod.label, 'VISA ·· 4242')
    assert.equal(saved.body().data.paymentMethod.expiresOn, '12/29')
  })

  test('the public demo conjunto never reaches Wompi', async ({ client, assert }) => {
    const { tenant, api } = await setup(client)
    tenant.slug = 'demo'
    await tenant.save()
    await expectStatus(api.get('/billing/config'), 403)
    await expectStatus(api.post('/email-quota/packs', { packs: 1 }), 403)
    await expectStatus(api.post('/billing/tokens/nequi', { phoneNumber: '3991111111' }), 403)
    assert.equal(fake.transactions.size, 0)
  })

  test('saving a payment method uses Wompi tokens once and replaces the previous one', async ({
    client,
    assert,
  }) => {
    const { tenant, user, api } = await setup(client)
    const config = await dataOf(api.get('/billing/config'))
    const body = {
      type: 'NEQUI',
      token: 'nequi_test_3991111111',
      acceptanceToken: config.acceptance.acceptanceToken,
      personalAuthToken: config.acceptance.personalAuthToken,
    }
    const first = await dataOf(api.put('/billing/payment-method', body))
    assert.equal(first.paymentMethod.label, 'Nequi ·· 1111')
    // The same acceptance token cannot be used twice (as in Wompi)
    const reused = await api.put('/billing/payment-method', body)
    reused.assertStatus(422)
    assert.equal(reused.body().errors[0].field, 'token')

    await expectStatus(saveCard(api), 200)
    const methods = await db
      .from('billing_payment_methods')
      .where('tenant_id', tenant.id)
      .orderBy('created_at')
    assert.deepEqual(
      methods.map((m) => [m.type, m.status]),
      [
        ['NEQUI', 'removed'],
        ['CARD', 'active'],
      ]
    )
    assert.equal(methods[1].customer_email, user.email)
    // Nequi sources are cancelled in Wompi; card sources cannot be
    assert.lengthOf(fake.voided, 1)
    // Only Wompi's id and display data are stored
    assert.notProperty(methods[1], 'number')
    assert.notProperty(methods[1], 'cvc')
  })

  test('paying the plan activates it once Wompi approves, exactly once', async ({
    client,
    assert,
  }) => {
    const { mails } = mail.fake()
    const { tenant, api } = await setup(client)
    await expectStatus(api.post('/billing/subscription/pay', { billingCycle: 'monthly' }), 422)
    await expectStatus(saveCard(api), 200)

    const pending = await dataOf(api.post('/billing/subscription/pay', { billingCycle: 'annual' }))
    assert.equal(pending.status, 'pending')
    // The amount is computed by the API: 120 units, annual
    assert.equal(pending.amount, quote(120, 'annual').total)
    assert.match(pending.reference, /^APH-PLAN-\d{6}-[0-9A-F]{10}$/)
    // A second payment while one is in process is refused
    await expectStatus(api.post('/billing/subscription/pay', { billingCycle: 'annual' }), 409)

    fake.settle()
    const approved = await dataOf(api.get(`/billing/charges/${pending.id}`))
    assert.equal(approved.status, 'approved')

    const subscription = await subscriptionOf(tenant)
    assert.equal(subscription.status, 'active')
    assert.equal(subscription.billingCycle, 'annual')
    assert.isTrue(subscription.autoRenew)
    const end = subscription.currentPeriodEndsAt!
    assert.approximately(end.diff(DateTime.now().plus({ years: 1 }), 'minutes').minutes, 0, 2)
    assert.equal(subscription.nextRenewalAt!.toMillis(), end.minus({ hours: 24 }).toMillis())
    assert.lengthOf(receipts(mails), 1)

    // Repeated refreshes and events never extend it twice nor resend the receipt
    await dataOf(api.get(`/billing/charges/${pending.id}`))
    const transaction = [...fake.transactions.values()][0]!
    await client.post('/api/v1/webhooks/wompi').json(signedEvent(transaction))
    await runBillingTick()
    const again = await subscriptionOf(tenant)
    assert.equal(again.currentPeriodEndsAt!.toMillis(), end.toMillis())
    assert.lengthOf(receipts(mails), 1)

    // Already paid: no other payment until the renewal
    await expectStatus(api.post('/billing/subscription/pay', { billingCycle: 'annual' }), 409)
  })

  test('Wompi events are verified, recorded once and decide through the API', async ({
    client,
    assert,
  }) => {
    mail.fake()
    const { tenant, api } = await setup(client)
    await saveCard(api)
    const charge = await dataOf(api.post('/billing/subscription/pay', { billingCycle: 'monthly' }))
    fake.settle()
    const transaction = (await fake.findTransactionByReference(charge.reference))!

    const forged = signedEvent(transaction, { secret: 'test_events_wrong' })
    await expectStatus(client.post('/api/v1/webhooks/wompi').json(forged), 401)
    assert.equal(await statusOf(tenant), 'trialing')

    const otherEnvironment = signedEvent(transaction, { environment: 'prod' })
    await expectStatus(client.post('/api/v1/webhooks/wompi').json(otherEnvironment), 200)
    assert.equal(await statusOf(tenant), 'trialing')

    const event = signedEvent(transaction)
    await expectStatus(client.post('/api/v1/webhooks/wompi').json(event), 200)
    assert.equal(await statusOf(tenant), 'active')
    const duplicate = await client.post('/api/v1/webhooks/wompi').json(event)
    assert.isTrue((duplicate as any).body().duplicate)
    const events = await db.from('wompi_events').where('reference', charge.reference)
    assert.lengthOf(events, 1)
    assert.isNotNull(events[0].processed_at)
  })

  test('a transaction that does not match the charge is never applied', async ({
    client,
    assert,
  }) => {
    mail.fake()
    const { tenant, api } = await setup(client)
    await saveCard(api)
    const charge = await dataOf(api.post('/billing/subscription/pay', { billingCycle: 'monthly' }))
    // Wompi reports another amount for this reference
    const transaction = [...fake.transactions.values()][0]!
    transaction.amountInCents = 100
    fake.settle()
    const result = await dataOf(api.get(`/billing/charges/${charge.id}`))
    assert.equal(result.status, 'error')
    assert.equal(await statusOf(tenant), 'trialing')
  })

  test('renewals: notice, charge before the end and new period from the old end', async ({
    client,
    assert,
  }) => {
    const { mails } = mail.fake()
    const { tenant, api } = await setup(client)
    await saveCard(api)
    const end = DateTime.now().plus({ hours: 20 })
    const subscription = await subscriptionOf(tenant)
    subscription.merge({
      status: 'active',
      currentPeriodEndsAt: end,
      autoRenew: true,
      nextRenewalAt: end.minus({ hours: 24 }),
    })
    await subscription.save()

    await runBillingTick()
    await runBillingTick()
    const notices = receipts(mails).filter((m) => m.content.title === 'Tu plan se renueva pronto')
    assert.lengthOf(notices, 1)
    const charges = await BillingCharge.query().where('tenant_id', tenant.id)
    assert.lengthOf(charges, 1)
    assert.isTrue(charges[0]!.automatic)
    assert.equal(charges[0]!.periodStartsAt!.toMillis(), end.toMillis())

    fake.settle()
    // Make the pending charge old enough for the scheduler to ask Wompi
    await db
      .from('billing_charges')
      .where('id', charges[0]!.id)
      .update({ created_at: DateTime.now().minus({ minutes: 5 }).toJSDate() })
    await runBillingTick()
    const renewed = await subscriptionOf(tenant)
    assert.equal(renewed.status, 'active')
    assert.equal(renewed.currentPeriodEndsAt!.toMillis(), end.plus({ months: 1 }).toMillis())
    assert.isTrue(renewed.autoRenew)
  })

  test('a declined renewal is retried, keeps a grace period and then locks', async ({
    client,
    assert,
  }) => {
    const { mails } = mail.fake()
    const { tenant, api } = await setup(client)
    fake.nextOutcome = 'DECLINED'
    await saveCard(api)
    const end = DateTime.now().plus({ hours: 2 })
    const subscription = await subscriptionOf(tenant)
    subscription.merge({
      status: 'active',
      currentPeriodEndsAt: end,
      autoRenew: true,
      nextRenewalAt: DateTime.now(),
    })
    await subscription.save()

    const failAttempt = async () => {
      await runBillingTick()
      fake.settle()
      await db
        .from('billing_charges')
        .where('tenant_id', tenant.id)
        .where('status', 'pending')
        .update({ created_at: DateTime.now().minus({ minutes: 5 }).toJSDate() })
      await runBillingTick()
    }

    await failAttempt()
    let current = await subscriptionOf(tenant)
    assert.equal(current.status, 'past_due')
    assert.equal(current.renewalAttempts, 1)
    assert.equal(current.nextRenewalAt!.toMillis(), end.plus({ days: 1 }).toMillis())
    assert.isTrue(current.canWrite())
    const failures = receipts(mails).filter(
      (m) => m.content.title === 'No pudimos cobrar la renovación'
    )
    assert.lengthOf(failures, 1)
    assert.include(failures[0]!.content.paragraphs.join(' '), 'Fondos insuficientes')

    // Retries 2, 3 and 4 (the last one ends the automatic attempts)
    for (const attempt of [2, 3, 4]) {
      await Subscription.query()
        .where('id', current.id)
        .update({ nextRenewalAt: DateTime.now().toJSDate() })
      await failAttempt()
      current = await subscriptionOf(tenant)
      assert.equal(current.renewalAttempts, attempt)
    }
    assert.isNull(current.nextRenewalAt)
    await runBillingTick()
    assert.lengthOf(await BillingCharge.query().where('tenant_id', tenant.id), 4)

    // After the grace days the back-office is read-only (402)
    await Subscription.query()
      .where('id', current.id)
      .update({ currentPeriodEndsAt: DateTime.now().minus({ days: 8 }).toJSDate() })
    await expectStatus(api.post('/buildings', { name: 'Torre 1' }), 402)

    // A new payment method and paying now reactivate it from today
    fake.nextOutcome = 'APPROVED'
    await saveCard(api)
    const charge = await dataOf(api.post('/billing/subscription/pay', { billingCycle: 'monthly' }))
    fake.settle()
    await dataOf(api.get(`/billing/charges/${charge.id}`))
    current = await subscriptionOf(tenant)
    assert.equal(current.status, 'active')
    assert.equal(current.renewalAttempts, 0)
    assert.isTrue(current.currentPeriodEndsAt! > DateTime.now().plus({ days: 27 }))
    await expectStatus(api.post('/buildings', { name: 'Torre 1' }), 201)
  })

  test('turning the renewal off keeps the paid period and stops charging', async ({
    client,
    assert,
  }) => {
    mail.fake()
    const { tenant, api } = await setup(client)
    await saveCard(api)
    const end = DateTime.now().plus({ days: 10 })
    await Subscription.query()
      .where('tenant_id', tenant.id)
      .update({ status: 'active', currentPeriodEndsAt: end.toJSDate() })
    const on = await dataOf(api.put('/billing/subscription/auto-renew', { enabled: true }))
    assert.isTrue(on.autoRenew)
    assert.isNotNull(on.nextChargeAt)
    assert.equal(on.nextChargeAmount, quote(120, 'monthly').total)

    const off = await dataOf(api.put('/billing/subscription/auto-renew', { enabled: false }))
    assert.isFalse(off.autoRenew)
    assert.isNull(off.nextChargeAt)
    await Subscription.query()
      .where('tenant_id', tenant.id)
      .update({ currentPeriodEndsAt: DateTime.now().plus({ hours: 1 }).toJSDate() })
    await runBillingTick()
    assert.lengthOf(await BillingCharge.query().where('tenant_id', tenant.id), 0)
    const stillActive = await subscriptionOf(tenant)
    assert.isTrue(stillActive.canWrite())

    // Removing the payment method also turns it off
    await expectStatus(api.put('/billing/subscription/auto-renew', { enabled: true }), 200)
    const { user: otherAdmin } = await createMember('administrator', tenant)
    await client
      .delete('/api/v1/billing/payment-method')
      .loginAs(otherAdmin)
      .header('X-Tenant-Id', tenant.id)
    const removed = await subscriptionOf(tenant)
    assert.isFalse(removed.autoRenew)
  })

  test('email packs: charged to the saved method, or paid in the Wompi checkout', async ({
    client,
    assert,
  }) => {
    mail.fake()
    const { tenant, api } = await setup(client)
    const limit = async () => {
      const quota = await new EmailQuotaService(tenant).of()
      return quota.limit
    }

    // Without a payment method: Wompi's checkout with the integrity signature
    const viaCheckout = await dataOf(api.post('/email-quota/packs', { packs: 2 }))
    assert.equal(viaCheckout.charge.amount, 20000)
    const url = new URL(viaCheckout.checkoutUrl)
    assert.equal(url.origin, 'https://checkout.wompi.co')
    assert.equal(url.searchParams.get('reference'), viaCheckout.charge.reference)
    assert.equal(url.searchParams.get('amount-in-cents'), '2000000')
    assert.match(url.searchParams.get('signature:integrity')!, /^[0-9a-f]{64}$/)
    assert.equal(await limit(), 3000)

    // The person pays there: a declined attempt and then an approved one
    const declined = fake.checkoutPayment(viaCheckout.charge.reference, 2000000)
    fake.settle('DECLINED')
    await client
      .post('/api/v1/webhooks/wompi')
      .json(signedEvent((await fake.getTransaction(declined.id))!))
    assert.equal(await chargeStatus(api, viaCheckout.charge.id), 'declined')
    const approved = fake.checkoutPayment(viaCheckout.charge.reference, 2000000)
    fake.settle('APPROVED')
    await client
      .post('/api/v1/webhooks/wompi')
      .json(signedEvent((await fake.getTransaction(approved.id))!))
    assert.equal(await chargeStatus(api, viaCheckout.charge.id), 'approved')
    assert.equal(await limit(), 9000)

    // With a payment method: charged right away
    await saveCard(api)
    const direct = await dataOf(api.post('/email-quota/packs', { packs: 1 }))
    assert.isNull(direct.checkoutUrl)
    assert.equal(direct.charge.paymentMethod, 'VISA ·· 4242')
    fake.settle()
    await dataOf(api.get(`/billing/charges/${direct.charge.id}`))
    assert.equal(await limit(), 12000)
    await expectStatus(api.post('/email-quota/packs', { packs: 0 }), 422)
  })

  test('a charge Wompi refuses ends with its reason and does not activate the plan', async ({
    client,
    assert,
  }) => {
    mail.fake()
    const { tenant, api } = await setup(client)
    await saveCard(api)
    fake.rejectNextTransaction = 'La fuente de pago no está disponible'
    const charge = await dataOf(api.post('/billing/subscription/pay', { billingCycle: 'monthly' }))
    assert.equal(charge.status, 'error')
    assert.equal(charge.statusMessage, 'La fuente de pago no está disponible')
    assert.equal(await statusOf(tenant), 'trialing')
    const overview = await dataOf(api.get('/billing'))
    assert.lengthOf(overview.charges, 1)
  })

  test('Nequi, DaviPlata and Bancolombia tokens go through the API', async ({ client, assert }) => {
    const { api } = await setup(client)
    const nequi = await dataOf(api.post('/billing/tokens/nequi', { phoneNumber: '3991111111' }))
    assert.equal(nequi.status, 'PENDING')
    await expectStatus(api.post('/billing/tokens/nequi', { phoneNumber: '12345' }), 422)
    const status = await dataOf(api.get(`/billing/tokens/nequi/${nequi.id}`))
    assert.equal(status.status, 'APPROVED')

    const davi = await dataOf(
      api.post('/billing/tokens/daviplata', {
        documentType: 'CC',
        documentNumber: '1234567890',
        phoneNumber: '3991111111',
      })
    )
    // The OTP links travel encrypted, never in clear
    assert.notInclude(davi.handle, 'wompi.co')
    const wrong = await api.post('/billing/tokens/daviplata/otp', {
      handle: davi.handle,
      code: '111111',
    })
    wrong.assertStatus(422)
    await expectStatus(
      api.post('/billing/tokens/daviplata/otp', { handle: 'forged', code: '574829' }),
      422
    )
    const ok = await dataOf(
      api.post('/billing/tokens/daviplata/otp', { handle: davi.handle, code: '574829' })
    )
    assert.equal(ok.status, 'APPROVED')

    const bancolombia = await dataOf(api.post('/billing/tokens/bancolombia'))
    assert.include(bancolombia.authorizationUrl, encodeURIComponent('/plan?medio=bancolombia'))
  })
})
