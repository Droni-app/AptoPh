import { test } from '@japa/runner'
import type { ApiClient } from '@japa/api-client'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import mail from '@adonisjs/mail/services/main'
import { DateTime } from 'luxon'
import { formatCop, quote } from '@aptoph/shared'
import BillingMail from '#mails/billing/billing_mail'
import BillingCharge from '#models/billing/billing_charge'
import Subscription from '#models/billing/subscription'
import type Tenant from '#models/tenants/tenant'
import { runBillingTick } from '#services/billing/billing_scheduler'
import { EmailQuotaService } from '#services/announcements/email_quota'
import { checkoutUrl, wompi } from '#services/billing/wompi'
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

/** Pays the plan with the saved method: the charge (no checkout) */
async function payPlan(api: Api) {
  const result = await dataOf(api.post('/billing/subscription/pay'))
  return result.charge
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
    await expectStatus(saveCard(api), 200)

    const pending = await payPlan(api)
    assert.equal(pending.status, 'pending')
    // The amount is computed by the API: 120 units × 500, one month
    assert.equal(pending.amount, quote(120).total)
    assert.match(pending.reference, /^APH-PLAN-\d{6}-[0-9A-F]{10}$/)
    // A second payment while one is in process is refused
    await expectStatus(api.post('/billing/subscription/pay'), 409)

    fake.settle()
    const approved = await dataOf(api.get(`/billing/charges/${pending.id}`))
    assert.equal(approved.status, 'approved')

    const subscription = await subscriptionOf(tenant)
    assert.equal(subscription.status, 'active')
    assert.equal(subscription.billingCycle, 'monthly')
    assert.isTrue(subscription.autoRenew)
    const end = subscription.currentPeriodEndsAt!
    assert.approximately(end.diff(DateTime.now().plus({ months: 1 }), 'minutes').minutes, 0, 2)
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
    await expectStatus(api.post('/billing/subscription/pay'), 409)
  })

  test('Wompi events are verified, recorded once and decide through the API', async ({
    client,
    assert,
  }) => {
    mail.fake()
    const { tenant, api } = await setup(client)
    await saveCard(api)
    const charge = await payPlan(api)
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
    const charge = await payPlan(api)
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
    const charge = await payPlan(api)
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
    assert.equal(on.nextChargeAmount, quote(120).total)

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
    const charge = await payPlan(api)
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

  test('manual payment: the plan is paid with PSE in the checkout, without a saved method', async ({
    client,
    assert,
  }) => {
    const { mails } = mail.fake()
    const { tenant, api } = await setup(client)
    const result = await dataOf(api.post('/billing/subscription/pay'))
    assert.equal(result.charge.amount, quote(120).total)
    assert.isNull(result.charge.paymentMethod)
    const url = new URL(result.checkoutUrl)
    assert.equal(url.origin, 'https://checkout.wompi.co')
    assert.equal(url.searchParams.get('reference'), result.charge.reference)
    // Local (http): Wompi rejects a non-https return, so it is left out
    assert.isNull(url.searchParams.get('redirect-url'))
    const production = new URL(
      checkoutUrl({
        reference: result.charge.reference,
        amountInCents: result.charge.amount * 100,
        redirectUrl: `https://admin.aptoph.com/plan?pago=${result.charge.id}`,
      })
    )
    assert.equal(
      production.searchParams.get('redirect-url'),
      `https://admin.aptoph.com/plan?pago=${result.charge.id}`
    )
    assert.equal(await statusOf(tenant), 'trialing')

    // PSE empresarial: the bank takes a while; a second attempt is refused meanwhile
    const transaction = fake.checkoutPayment(result.charge.reference, result.charge.amount * 100)
    await client.post('/api/v1/webhooks/wompi').json(signedEvent(transaction))
    const busy = await api.post('/billing/subscription/pay')
    busy.assertStatus(409)
    assert.include(busy.body().message, 'PSE')

    fake.settle('APPROVED')
    await client
      .post('/api/v1/webhooks/wompi')
      .json(signedEvent((await fake.getTransaction(transaction.id))!))
    const subscription = await subscriptionOf(tenant)
    assert.equal(subscription.status, 'active')
    assert.equal(subscription.billingCycle, 'monthly')
    // Without a saved method it is not renewed automatically
    assert.isFalse(subscription.autoRenew)
    assert.isNull(subscription.nextRenewalAt)
    const receipt = receipts(mails)
    assert.lengthOf(receipt, 1)
    assert.deepInclude(receipt[0]!.content.rows, { label: 'Medio de pago', value: 'PSE · Wompi' })
    const overview = await dataOf(api.get('/billing'))
    assert.equal(overview.charges[0].paymentMethod, 'PSE · Wompi')
  })

  test('manual payment: an abandoned checkout does not block a new attempt', async ({
    client,
    assert,
  }) => {
    mail.fake()
    const { tenant, api } = await setup(client)
    const first = await dataOf(api.post('/billing/subscription/pay'))
    // Opens the checkout again in another tab
    const second = await dataOf(api.post('/billing/subscription/pay'))
    assert.notEqual(second.charge.reference, first.charge.reference)
    assert.equal(await chargeStatus(api, first.charge.id), 'expired')

    // The first tab gets paid anyway: the payment is not lost
    const late = fake.checkoutPayment(first.charge.reference, first.charge.amount * 100)
    fake.settle('APPROVED')
    await client
      .post('/api/v1/webhooks/wompi')
      .json(signedEvent((await fake.getTransaction(late.id))!))
    assert.equal(await chargeStatus(api, first.charge.id), 'approved')
    assert.equal(await statusOf(tenant), 'active')
  })

  test('manual payment: reminders 7 and 3 days before, with the amount', async ({
    client,
    assert,
  }) => {
    const { mails } = mail.fake()
    const { tenant } = await setup(client)
    const due = () => receipts(mails).filter((m) => m.content.title === 'Es hora de pagar tu plan')
    await Subscription.query()
      .where('tenant_id', tenant.id)
      .update({
        status: 'active',
        autoRenew: false,
        currentPeriodEndsAt: DateTime.now().plus({ days: 6 }).toJSDate(),
      })
    await runBillingTick()
    await runBillingTick()
    assert.lengthOf(due(), 1)
    const text = due()[0]!.content.paragraphs.join(' ')
    assert.include(text, 'PSE')
    assert.include(text, 'débito')
    assert.notInclude(text, 'año')
    assert.deepInclude(due()[0]!.content.rows, {
      label: 'Pago mensual',
      value: formatCop(quote(120).total),
    })

    // The last reminder, 3 days before (only once as well)
    await Subscription.query()
      .where('tenant_id', tenant.id)
      .update({ currentPeriodEndsAt: DateTime.now().plus({ days: 2 }).toJSDate() })
    await runBillingTick()
    await runBillingTick()
    assert.lengthOf(due(), 2)
    // No charges: the payment is manual
    assert.lengthOf(await BillingCharge.query().where('tenant_id', tenant.id), 0)
  })

  test('manual payment: unpaid at the end, grace days and then read-only', async ({
    client,
    assert,
  }) => {
    const { mails } = mail.fake()
    const { tenant, api } = await setup(client)
    await Subscription.query()
      .where('tenant_id', tenant.id)
      .update({
        status: 'active',
        autoRenew: false,
        currentPeriodEndsAt: DateTime.now().minus({ hours: 1 }).toJSDate(),
      })
    await runBillingTick()
    await runBillingTick()
    const subscription = await subscriptionOf(tenant)
    assert.equal(subscription.status, 'past_due')
    assert.isTrue(subscription.canWrite())
    const overdue = receipts(mails).filter((m) => m.content.title === 'Tu plan venció')
    assert.lengthOf(overdue, 1)
    await expectStatus(api.post('/buildings', { name: 'Torre 1' }), 201)

    await Subscription.query()
      .where('tenant_id', tenant.id)
      .update({ currentPeriodEndsAt: DateTime.now().minus({ days: 8 }).toJSDate() })
    await expectStatus(api.post('/buildings', { name: 'Torre 2' }), 402)
  })

  test('the next period can be paid from 7 days before the end', async ({ client, assert }) => {
    mail.fake()
    const { tenant, api } = await setup(client)
    const setEnd = (days: number) =>
      Subscription.query()
        .where('tenant_id', tenant.id)
        .update({
          status: 'active',
          autoRenew: false,
          currentPeriodEndsAt: DateTime.now().plus({ days }).startOf('second').toJSDate(),
        })
    await setEnd(10)
    await expectStatus(api.post('/billing/subscription/pay'), 409)
    await setEnd(5)
    const paid = await subscriptionOf(tenant)
    const end = paid.currentPeriodEndsAt!
    const result = await dataOf(api.post('/billing/subscription/pay'))
    const charge = await BillingCharge.findOrFail(result.charge.id)
    // No days lost: the new period starts when the paid one ends
    assert.equal(charge.periodStartsAt!.toMillis(), end.toMillis())
  })
})
