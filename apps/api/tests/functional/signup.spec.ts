import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import mail from '@adonisjs/mail/services/main'
import { DateTime } from 'luxon'
import Enrollment from '#models/enrollment'
import Subscription from '#models/subscription'
import Tenant from '#models/tenant'
import User from '#models/user'
import WelcomeMail from '#mails/welcome_mail'

const form = (overrides: Record<string, string> = {}) => ({
  tenantName: 'Conjunto Álamos del Río',
  city: 'Medellín',
  units: '120',
  plan: 'completo',
  fullName: 'Laura Gómez',
  email: 'Laura@Example.com',
  phone: '300 123 4567',
  password: 'super-secret',
  acceptTerms: 'on',
  ...overrides,
})

test.group('Sign-up', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.teardown(() => mail.restore())

  test('renders the form with the price table and the units from the query string', async ({
    client,
  }) => {
    const response = await client.get('/registro').qs({ unidades: '80' })

    response.assertStatus(200)
    response.assertTextIncludes('Crea la cuenta de tu conjunto')
    response.assertTextIncludes('Hasta 200 unidades')
    response.assertTextIncludes('Más de 500 unidades')
    response.assertTextIncludes('value="80"')
    response.assertTextIncludes("name='_csrf'")
  })

  test('creates account, conjunto and trial, then hands off to the back-office', async ({
    client,
    assert,
  }) => {
    const { mails } = mail.fake()

    const response = await client.post('/registro').form(form()).withCsrfToken().redirects(0)

    response.assertStatus(302)
    const location = new URL(response.header('location')!)
    assert.equal(location.origin, 'http://localhost:5174')
    assert.equal(location.pathname, '/login')
    assert.equal(location.searchParams.get('auto'), '1')

    const user = await User.findByOrFail('email', 'laura@example.com')
    const tenant = await Tenant.findByOrFail('slug', 'conjunto-alamos-del-rio')
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
    const days = subscription.trialEndsAt!.diff(DateTime.now(), 'days').days
    assert.isAbove(days, 29.9)
    assert.isBelow(days, 30.1)

    mails.assertQueued(WelcomeMail, ({ message }) => {
      message.assertTo('laura@example.com', 'Laura Gómez')
      return true
    })
  })

  test('rejects an email that already has an account', async ({ client }) => {
    mail.fake()
    await User.create({
      fullName: 'Ya Existe',
      email: 'laura@example.com',
      password: 'x'.repeat(10),
    })

    const response = await client.post('/registro').form(form()).withCsrfToken()

    response.assertStatus(422)
    response.assertTextIncludes('Ya existe una cuenta con este correo')
    response.assertTextIncludes('value="Conjunto Álamos del Río"')
  })

  test('shows field errors and keeps the values', async ({ client, assert }) => {
    const response = await client
      .post('/registro')
      .form(form({ email: 'no-es-correo', password: '123', acceptTerms: '' }))
      .withCsrfToken()

    response.assertStatus(422)
    response.assertTextIncludes('Debe ser un correo electrónico válido')
    response.assertTextIncludes('Debe tener al menos 8 caracteres')
    response.assertTextIncludes('Debes aceptar para continuar')
    assert.isNull(await Tenant.findBy('slug', 'conjunto-alamos-del-rio'))
  })

  test('only self-serve plans can be started from the form', async ({ client }) => {
    const response = await client
      .post('/registro')
      .form(form({ plan: 'empresarial' }))
      .withCsrfToken()

    response.assertStatus(422)
  })

  test('adds a suffix when the slug is taken', async ({ client, assert }) => {
    mail.fake()
    await Tenant.create({ name: 'Otro', slug: 'conjunto-alamos-del-rio', status: 'active' })

    const response = await client.post('/registro').form(form()).withCsrfToken().redirects(0)

    response.assertStatus(302)
    assert.isNotNull(await Tenant.findBy('slug', 'conjunto-alamos-del-rio-2'))
  })

  test('requires the CSRF token', async ({ client, assert }) => {
    const response = await client.post('/registro').form(form()).redirects(0)

    assert.notInclude(response.header('location') ?? '', 'localhost:5174')
    assert.isNull(await User.findBy('email', 'laura@example.com'))
  })
})
