import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import Enrollment from '#models/enrollment'
import Tenant from '#models/tenant'
import User from '#models/user'

const PASSWORD = 'secret-password'

async function createResident() {
  const user = await User.create({
    fullName: 'Rosa Residente',
    email: 'rosa@example.com',
    password: PASSWORD,
  })
  const tenant = await Tenant.create({
    name: 'Conjunto Prueba',
    slug: 'conjunto-prueba',
    status: 'active',
  })
  await Enrollment.createMany([
    { tenantId: tenant.id, userId: user.id, role: 'resident', status: 'active' },
    { tenantId: tenant.id, userId: user.id, role: 'council_member', status: 'active' },
  ])
  return { user, tenant }
}

test.group('Auth · login and logout', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('returns an access token and the profile; the token opens the API', async ({
    client,
    assert,
  }) => {
    const { user, tenant } = await createResident()

    const response = await client
      .post('/api/v1/auth/login')
      .json({ email: 'Rosa@Example.com ', password: PASSWORD, device: 'Portal web' })

    response.assertStatus(200)
    const { data } = response.body()
    assert.match(data.token, /^oat_/)
    assert.equal(data.type, 'bearer')
    assert.equal(data.user.id, user.id)
    assert.notProperty(data.user, 'password')
    assert.isAbove(new Date(data.expiresAt!).getTime(), Date.now() + 29 * 24 * 3600 * 1000)

    const row = await db.from('auth_access_tokens').where('tokenable_id', user.id).firstOrFail()
    assert.equal(row.name, 'Portal web')

    const profile = await client
      .get('/api/v1/account/profile')
      .header('Authorization', `Bearer ${data.token}`)
    profile.assertStatus(200)
    profile.assertBodyContains({ data: { email: 'rosa@example.com' } })

    const current = await client
      .get('/api/v1/tenant')
      .header('Authorization', `Bearer ${data.token}`)
      .header('X-Tenant-Id', tenant.id)
    current.assertStatus(200)
  })

  test('rejects a wrong password and an unknown email with the same message', async ({
    client,
  }) => {
    await createResident()

    for (const email of ['rosa@example.com', 'nadie@example.com']) {
      const response = await client
        .post('/api/v1/auth/login')
        .json({ email, password: 'wrong-password' })
      response.assertStatus(400)
      response.assertBodyContains({
        errors: [{ message: 'El correo o la contraseña no son correctos' }],
      })
    }
  })

  test('validates the payload', async ({ client }) => {
    const response = await client
      .post('/api/v1/auth/login')
      .json({ email: 'no-es-correo' } as never)
    response.assertStatus(422)
  })

  test('blocked users cannot sign in', async ({ client }) => {
    const { user } = await createResident()
    user.status = 'blocked'
    await user.save()

    const response = await client
      .post('/api/v1/auth/login')
      .json({ email: 'rosa@example.com', password: PASSWORD })
    response.assertStatus(403)
  })

  test('logout revokes only the token used', async ({ client }) => {
    await createResident()
    const login = async () => {
      const response = await client
        .post('/api/v1/auth/login')
        .json({ email: 'rosa@example.com', password: PASSWORD })
      return response.body().data.token
    }
    const first = await login()
    const second = await login()

    const logout = await client
      .post('/api/v1/auth/logout')
      .header('Authorization', `Bearer ${first}`)
    logout.assertStatus(204)

    const revoked = await client
      .get('/api/v1/account/profile')
      .header('Authorization', `Bearer ${first}`)
    revoked.assertStatus(401)

    const other = await client
      .get('/api/v1/account/profile')
      .header('Authorization', `Bearer ${second}`)
    other.assertStatus(200)
  })

  test('the API rejects requests without a token', async ({ client }) => {
    const response = await client.get('/api/v1/account/profile')
    response.assertStatus(401)
  })
})

test.group('Tenant middleware', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('denies access to a tenant without an active enrollment', async ({ client }) => {
    const { user } = await createResident()
    const other = await Tenant.create({ name: 'Otro conjunto', slug: 'otro', status: 'active' })

    const response = await client
      .get('/api/v1/tenant')
      .loginAs(user)
      .header('X-Tenant-Id', other.id)

    response.assertStatus(403)
  })

  test('requires the X-Tenant-Id header', async ({ client }) => {
    const { user } = await createResident()
    const response = await client.get('/api/v1/tenant').loginAs(user)
    response.assertStatus(400)
  })

  test('denies access to a suspended tenant', async ({ client }) => {
    const { user, tenant } = await createResident()
    tenant.status = 'suspended'
    await tenant.save()

    const response = await client
      .get('/api/v1/tenant')
      .loginAs(user)
      .header('X-Tenant-Id', tenant.id)

    response.assertStatus(403)
  })
})
