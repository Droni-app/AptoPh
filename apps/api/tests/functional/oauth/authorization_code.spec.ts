import { createHash, randomBytes } from 'node:crypto'
import { test } from '@japa/runner'
import type { ApiClient } from '@japa/api-client'
import testUtils from '@adonisjs/core/services/test_utils'
import Enrollment from '#models/enrollment'
import Tenant from '#models/tenant'
import User from '#models/user'

const CLIENT_ID = 'web'
const REDIRECT_URI = 'http://localhost:5173/auth/callback'
const PASSWORD = 'secret-password'

function pkcePair() {
  const verifier = randomBytes(32).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  return { verifier, challenge }
}

function authorizeParams(challenge: string, overrides: Record<string, string> = {}) {
  return {
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state: 'xyz-state',
    ...overrides,
  }
}

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

/**
 * Logs in through the hosted form and returns the authorization code
 */
async function loginAndGetCode(client: ApiClient, challenge: string) {
  const response = await client
    .post('/oauth/authorize')
    .form({ ...authorizeParams(challenge), email: 'rosa@example.com', password: PASSWORD })
    .withCsrfToken()
    .redirects(0)

  response.assertStatus(302)
  const location = new URL(response.header('location')!)
  return { location, code: location.searchParams.get('code')! }
}

test.group('OAuth · authorization code + PKCE', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('renders the hosted login page for a valid request', async ({ client }) => {
    const { challenge } = pkcePair()
    const response = await client.get('/oauth/authorize').qs(authorizeParams(challenge))

    response.assertStatus(200)
    response.assertTextIncludes('AptoPH Residentes')
    response.assertTextIncludes("name='_csrf'")
  })

  test('shows an error page (no redirect) for an unknown client', async ({ client }) => {
    const { challenge } = pkcePair()
    const response = await client
      .get('/oauth/authorize')
      .qs(authorizeParams(challenge, { client_id: 'unknown' }))
      .redirects(0)

    response.assertStatus(400)
    response.assertTextIncludes('no es válida')
  })

  test('shows an error page for a redirect_uri not registered for the client', async ({
    client,
  }) => {
    const { challenge } = pkcePair()
    const response = await client
      .get('/oauth/authorize')
      .qs(authorizeParams(challenge, { redirect_uri: 'https://evil.example.com/cb' }))
      .redirects(0)

    response.assertStatus(400)
  })

  test('redirects with invalid_request when PKCE is missing', async ({ client, assert }) => {
    const response = await client
      .get('/oauth/authorize')
      .qs(authorizeParams('', { code_challenge_method: 'plain' }))
      .redirects(0)

    response.assertStatus(302)
    const location = new URL(response.header('location')!)
    assert.equal(location.searchParams.get('error'), 'invalid_request')
    assert.equal(location.searchParams.get('state'), 'xyz-state')
  })

  test('rejects wrong credentials on the login form', async ({ client }) => {
    await createResident()
    const { challenge } = pkcePair()

    const response = await client
      .post('/oauth/authorize')
      .form({ ...authorizeParams(challenge), email: 'rosa@example.com', password: 'nope' })
      .withCsrfToken()
      .redirects(0)

    response.assertStatus(422)
    response.assertTextIncludes('Correo o contraseña incorrectos')
  })

  test('rejects the login form without a CSRF token', async ({ client, assert }) => {
    await createResident()
    const { challenge } = pkcePair()

    const response = await client
      .post('/oauth/authorize')
      .form({ ...authorizeParams(challenge), email: 'rosa@example.com', password: PASSWORD })
      .redirects(0)

    // Sent back to the login form, never to the client with a code
    response.assertStatus(302)
    const location = new URL(response.header('location')!, 'http://localhost')
    assert.equal(location.pathname, '/oauth/authorize')
    assert.equal(location.searchParams.get('client_id'), CLIENT_ID)
    assert.isNull(location.searchParams.get('code'))
  })

  test('skips the form when the user already has a session', async ({ client, assert }) => {
    const { user } = await createResident()
    const { challenge } = pkcePair()

    const response = await client
      .get('/oauth/authorize')
      .qs(authorizeParams(challenge))
      .withGuard('web')
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    const location = new URL(response.header('location')!)
    assert.isString(location.searchParams.get('code'))
  })

  test('full flow: code → tokens → API → refresh rotation → reuse detection', async ({
    client,
    assert,
  }) => {
    const { tenant } = await createResident()
    const { verifier, challenge } = pkcePair()

    const { location, code } = await loginAndGetCode(client, challenge)
    assert.equal(`${location.origin}${location.pathname}`, REDIRECT_URI)
    assert.equal(location.searchParams.get('state'), 'xyz-state')
    // Only code + state go back to the client (no forwarded authorization params)
    assert.sameMembers([...location.searchParams.keys()], ['code', 'state'])

    // Exchange the code
    const tokenResponse = await client.post('/oauth/token').form({
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier,
    })
    tokenResponse.assertStatus(200)
    tokenResponse.assertHeader('cache-control', 'no-store')
    const tokens = tokenResponse.body()
    assert.equal(tokens.token_type, 'Bearer')
    assert.isAbove(tokens.expires_in, 0)
    assert.match(tokens.access_token, /^oat_/)

    // The code cannot be used twice
    const reused = await client.post('/oauth/token').form({
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier,
    })
    reused.assertStatus(400)
    reused.assertBodyContains({ error: 'invalid_grant' })

    // Call the API
    const profile = await client.get('/api/v1/account/profile').bearerToken(tokens.access_token)
    profile.assertStatus(200)
    profile.assertBodyContains({ data: { email: 'rosa@example.com' } })

    const myTenants = await client.get('/api/v1/account/tenants').bearerToken(tokens.access_token)
    myTenants.assertStatus(200)
    assert.lengthOf(myTenants.body().data, 1)
    assert.sameMembers(myTenants.body().data[0].roles!, ['resident', 'council_member'])

    const current = await client
      .get('/api/v1/tenant')
      .bearerToken(tokens.access_token)
      .header('X-Tenant-Id', tenant.id)
    current.assertStatus(200)
    current.assertBodyContains({ data: { id: tenant.id, slug: 'conjunto-prueba' } })

    // Refresh (rotation)
    const refreshed = await client.post('/oauth/token').form({
      grant_type: 'refresh_token',
      client_id: CLIENT_ID,
      refresh_token: tokens.refresh_token,
    })
    refreshed.assertStatus(200)
    const newTokens = refreshed.body()
    assert.notEqual(newTokens.refresh_token, tokens.refresh_token)

    // Reusing the rotated refresh token revokes the whole family
    const replay = await client.post('/oauth/token').form({
      grant_type: 'refresh_token',
      client_id: CLIENT_ID,
      refresh_token: tokens.refresh_token,
    })
    replay.assertStatus(400)
    replay.assertBodyContains({ error: 'invalid_grant' })

    const afterReplay = await client
      .get('/api/v1/account/profile')
      .bearerToken(newTokens.access_token)
    afterReplay.assertStatus(401)

    const refreshAfterReplay = await client.post('/oauth/token').form({
      grant_type: 'refresh_token',
      client_id: CLIENT_ID,
      refresh_token: newTokens.refresh_token,
    })
    refreshAfterReplay.assertStatus(400)
  })

  test('rejects an invalid code_verifier', async ({ client }) => {
    await createResident()
    const { challenge } = pkcePair()
    const { code } = await loginAndGetCode(client, challenge)

    const response = await client.post('/oauth/token').form({
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: pkcePair().verifier,
    })

    response.assertStatus(400)
    response.assertBodyContains({ error: 'invalid_grant' })
  })

  test('rejects a code issued to another client', async ({ client }) => {
    await createResident()
    const { verifier, challenge } = pkcePair()
    const { code } = await loginAndGetCode(client, challenge)

    const response = await client.post('/oauth/token').form({
      grant_type: 'authorization_code',
      client_id: 'backoffice',
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier,
    })

    response.assertStatus(400)
    response.assertBodyContains({ error: 'invalid_grant' })
  })

  test('revokes a refresh token and its access token', async ({ client }) => {
    await createResident()
    const { verifier, challenge } = pkcePair()
    const { code } = await loginAndGetCode(client, challenge)
    const tokenResponse = await client.post('/oauth/token').form({
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier,
    })
    const tokens = tokenResponse.body()

    const revoke = await client
      .post('/oauth/revoke')
      .form({ client_id: CLIENT_ID, token: tokens.refresh_token })
    revoke.assertStatus(200)

    const profile = await client.get('/api/v1/account/profile').bearerToken(tokens.access_token)
    profile.assertStatus(401)

    const refresh = await client.post('/oauth/token').form({
      grant_type: 'refresh_token',
      client_id: CLIENT_ID,
      refresh_token: tokens.refresh_token,
    })
    refresh.assertStatus(400)
  })

  test('rejects unknown grant types and clients', async ({ client }) => {
    const unknownGrant = await client
      .post('/oauth/token')
      .form({ grant_type: 'password', client_id: CLIENT_ID })
    unknownGrant.assertStatus(400)
    unknownGrant.assertBodyContains({ error: 'unsupported_grant_type' })

    const unknownClient = await client
      .post('/oauth/token')
      .form({ grant_type: 'authorization_code', client_id: 'nope' })
    unknownClient.assertStatus(401)
    unknownClient.assertBodyContains({ error: 'invalid_client' })
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
