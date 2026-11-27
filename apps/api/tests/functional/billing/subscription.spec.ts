import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import mail from '@adonisjs/mail/services/main'
import { DateTime } from 'luxon'
import Subscription from '#models/billing/subscription'
import type Tenant from '#models/tenants/tenant'
import { createMember } from '#tests/helpers'

async function trial(tenant: Tenant, endsIn: { days: number }) {
  return Subscription.create({
    tenantId: tenant.id,
    plan: 'completo',
    billingCycle: 'monthly',
    status: 'trialing',
    declaredUnits: 140,
    trialEndsAt: DateTime.now().plus(endsIn),
  })
}

test.group('Back-office · subscription', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.teardown(() => mail.restore())

  test('shows the trial with days left and the declared units', async ({ client, assert }) => {
    const { tenant, user } = await createMember('administrator')
    await trial(tenant, { days: 12 })

    const response = await client
      .get('/api/v1/subscription')
      .loginAs(user)
      .header('X-Tenant-Id', tenant.id)

    response.assertStatus(200)
    const data = response.body().data
    assert.equal(data.status, 'trialing')
    assert.equal(data.trialDaysLeft, 12)
    assert.isTrue(data.canWrite)
    assert.isFalse(data.locked)
    assert.equal(data.billableUnits, 140)
  })

  test('managed tenants without a subscription get 404 and are not restricted', async ({
    client,
  }) => {
    const { tenant, user } = await createMember('administrator')
    const as = <T extends { loginAs: any }>(request: T) =>
      request.loginAs(user).header('X-Tenant-Id', tenant.id)

    const response1 = await as(client.get('/api/v1/subscription'))
    response1.assertStatus(404)
    const response2 = await as(client.post('/api/v1/buildings').json({ name: 'Torre 1' }))
    response2.assertStatus(201)
  })

  test('an expired trial is read-only until the plan is activated', async ({ client, assert }) => {
    const { tenant, user } = await createMember('administrator')
    const subscription = await trial(tenant, { days: -1 })
    const as = <T extends { loginAs: any }>(request: T) =>
      request.loginAs(user).header('X-Tenant-Id', tenant.id)

    const blocked = await as(client.post('/api/v1/buildings').json({ name: 'Torre 1' }))
    blocked.assertStatus(402)
    assert.equal(blocked.body().errors[0].rule, 'subscription_inactive')

    const response3 = await as(client.get('/api/v1/buildings'))
    response3.assertStatus(200)
    const shown = await as(client.get('/api/v1/subscription'))
    assert.isTrue(shown.body().data.locked)
    assert.equal(shown.body().data.trialDaysLeft, 0)

    subscription.merge({
      status: 'active',
      currentPeriodEndsAt: DateTime.now().plus({ months: 1 }),
    })
    await subscription.save()
    const response4 = await as(client.post('/api/v1/buildings').json({ name: 'Torre 1' }))
    response4.assertStatus(201)
  })

  test('other back-office roles can see the plan but not its payments', async ({ client }) => {
    const { tenant } = await createMember('administrator')
    const { user: guard } = await createMember('security_guard', tenant)
    await trial(tenant, { days: 5 })

    const as = <T extends { loginAs: any }>(request: T) =>
      request.loginAs(guard).header('X-Tenant-Id', tenant.id)

    const response5 = await as(client.get('/api/v1/subscription'))
    response5.assertStatus(200)
    const denied = await as(
      client.post('/api/v1/billing/subscription/pay').json({ billingCycle: 'monthly' })
    )
    denied.assertStatus(403)
  })
})
