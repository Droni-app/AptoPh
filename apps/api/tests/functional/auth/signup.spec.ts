import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import mail from '@adonisjs/mail/services/main'
import { DateTime } from 'luxon'
import Enrollment from '#models/tenants/enrollment'
import Subscription from '#models/billing/subscription'
import Tenant from '#models/tenants/tenant'
import User from '#models/auth/user'
import WelcomeMail from '#mails/auth/welcome_mail'
import LegalAcceptance from '#models/legal/legal_acceptance'
import { LEGAL_DOCUMENTS } from '@aptoph/shared'

/**
 * Typed loosely on purpose (`as never`): some tests send invalid values on purpose
 */
const payload = (overrides: Record<string, unknown> = {}) =>
  ({
    tenantName: 'Conjunto Álamos del Río',
    city: 'Medellín',
    units: 120,
    plan: 'completo',
    fullName: 'Laura Gómez',
    email: 'Laura@Example.com',
    phone: '300 123 4567',
    password: 'super-secret',
    acceptTerms: true,
    ...overrides,
  }) as never

test.group('Sign-up', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.teardown(() => mail.restore())

  test('creates account, conjunto and trial, and signs the administrator in', async ({
    client,
    assert,
  }) => {
    const { mails } = mail.fake()

    const response = await client.post('/api/v1/auth/signup').json(payload())

    response.assertStatus(201)
    const { data } = response.body()
    assert.match(data.token, /^oat_/)

    const user = await User.findByOrFail('email', 'laura@example.com')
    const tenant = await Tenant.findByOrFail('slug', 'conjunto-alamos-del-rio')
    assert.equal(data.user.id, user.id)
    assert.equal(data.tenantId, tenant.id)
    assert.equal(tenant.status, 'trial')
    assert.equal(tenant.city, 'Medellín')

    const enrollment = await Enrollment.query()
      .where({ tenantId: tenant.id, userId: user.id })
      .firstOrFail()
    assert.equal(enrollment.role, 'administrator')
    assert.equal(enrollment.status, 'active')

    const subscription = await Subscription.findByOrFail('tenantId', tenant.id)
    assert.equal(subscription.status, 'trialing')
    assert.equal(subscription.plan, 'completo')
    assert.equal(subscription.declaredUnits, 120)

    // Evidence: terms, data policy and, for the conjunto, the data processing agreement
    const acceptances = await LegalAcceptance.query()
      .where({ userId: user.id, tenantId: tenant.id, context: 'signup' })
      .orderBy('document')
    assert.deepEqual(
      acceptances.map((a) => [a.document, a.version]),
      [
        ['data_processing', LEGAL_DOCUMENTS.data_processing.version],
        ['privacy', LEGAL_DOCUMENTS.privacy.version],
        ['terms', LEGAL_DOCUMENTS.terms.version],
      ]
    )
    const days = subscription.trialEndsAt!.diff(DateTime.now(), 'days').days
    assert.isAbove(days, 29.9)
    assert.isBelow(days, 30.1)

    // The token works right away for the new conjunto
    const current = await client
      .get('/api/v1/tenant')
      .header('Authorization', `Bearer ${data.token}`)
      .header('X-Tenant-Id', tenant.id)
    current.assertStatus(200)

    mails.assertQueued(WelcomeMail, ({ message }) => {
      message.assertTo('laura@example.com', 'Laura Gómez')
      return true
    })
  })

  test('rejects an email that already has an account', async ({ client, assert }) => {
    mail.fake()
    await User.create({
      fullName: 'Ya Existe',
      email: 'laura@example.com',
      password: 'x'.repeat(10),
    })

    const response = await client.post('/api/v1/auth/signup').json(payload())

    response.assertStatus(422)
    response.assertBodyContains({ errors: [{ field: 'email' }] })
    assert.isNull(await Tenant.findBy('slug', 'conjunto-alamos-del-rio'))
  })

  test('returns field errors', async ({ client, assert }) => {
    const response = await client
      .post('/api/v1/auth/signup')
      .json(payload({ email: 'no-es-correo', password: '123', acceptTerms: false }))

    response.assertStatus(422)
    const { errors } = response.body() as unknown as { errors: Array<{ field: string }> }
    const fields = errors.map((error) => error.field)
    assert.includeMembers(fields, ['email', 'password', 'acceptTerms'])
    assert.isNull(await Tenant.findBy('slug', 'conjunto-alamos-del-rio'))
  })

  test('the Empresarial plan no longer exists', async ({ client }) => {
    const response = await client.post('/api/v1/auth/signup').json(payload({ plan: 'empresarial' }))

    response.assertStatus(422)
  })

  test('adds a suffix when the slug is taken', async ({ client, assert }) => {
    mail.fake()
    await Tenant.create({ name: 'Otro', slug: 'conjunto-alamos-del-rio', status: 'active' })

    const response = await client.post('/api/v1/auth/signup').json(payload())

    response.assertStatus(201)
    assert.isNotNull(await Tenant.findBy('slug', 'conjunto-alamos-del-rio-2'))
  })
})
