import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import mail from '@adonisjs/mail/services/main'
import env from '#start/env'
import User from '#models/auth/user'
import UserIdentity from '#models/auth/user_identity'
import Tenant from '#models/tenants/tenant'
import { GoogleOAuth } from '#services/auth/google_oauth'
import { createMember, resetRateLimits } from '../../helpers.js'

const CLIENT_ID = 'test-client.apps.googleusercontent.com'
const originalRequest = GoogleOAuth.requestToken

type Claims = Record<string, unknown>
const jwt = (claims: Claims) =>
  [
    Buffer.from(JSON.stringify({ alg: 'RS256' })).toString('base64url'),
    Buffer.from(JSON.stringify(claims)).toString('base64url'),
    'signature',
  ].join('.')

/** Google answers the code with an ID token for this account */
function googleReturns(claims: (nonce: string) => Claims) {
  const sent: URLSearchParams[] = []
  GoogleOAuth.requestToken = async (body) => {
    sent.push(body)
    return { id_token: jwt(claims(pendingNonce)) }
  }
  return sent
}

let pendingNonce = ''

const account =
  (overrides: Claims = {}) =>
  (nonce: string) => ({
    iss: 'https://accounts.google.com',
    aud: CLIENT_ID,
    exp: Math.floor(Date.now() / 1000) + 600,
    sub: 'google-123',
    email: 'Laura@Gmail.com',
    email_verified: true,
    name: 'Laura Gómez',
    nonce,
    ...overrides,
  })

/** Asks the API for the Google URL, as the web app does */
async function start(client: any, app: 'backoffice' | 'web', intent = 'login') {
  const response = await client.get('/api/v1/auth/google/url').qs({ app, intent })
  response.assertStatus(200)
  const { url, state } = response.body().data
  pendingNonce = new URL(url).searchParams.get('nonce')!
  return { url: new URL(url), state }
}

test.group('Google sign-in', (group) => {
  group.each.setup(async () => {
    env.set('GOOGLE_CLIENT_ID', CLIENT_ID)
    env.set('GOOGLE_CLIENT_SECRET', 'test-secret')
    await resetRateLimits()
    return testUtils.db().withGlobalTransaction()
  })
  group.each.teardown(() => {
    GoogleOAuth.requestToken = originalRequest
    env.set('GOOGLE_CLIENT_ID', '')
    env.set('GOOGLE_CLIENT_SECRET', '')
    mail.restore()
  })

  test('the Google URL goes back to the app that asked for it', async ({ client, assert }) => {
    const { url, state } = await start(client, 'backoffice')
    assert.equal(url.origin + url.pathname, 'https://accounts.google.com/o/oauth2/v2/auth')
    assert.equal(url.searchParams.get('client_id'), CLIENT_ID)
    assert.equal(url.searchParams.get('redirect_uri'), 'http://localhost:5174/auth/google')
    assert.equal(url.searchParams.get('scope'), 'openid email profile')
    assert.equal(url.searchParams.get('state'), state)

    const web = await start(client, 'web')
    assert.equal(web.url.searchParams.get('redirect_uri'), 'http://localhost:5173/auth/google')
  })

  test('without credentials it is not available', async ({ client }) => {
    const enabled = await client.get('/api/v1/auth/providers')
    enabled.assertBody({ data: { google: true } })
    env.set('GOOGLE_CLIENT_ID', '')
    const disabled = await client.get('/api/v1/auth/providers')
    disabled.assertBody({ data: { google: false } })
    const response = await client.get('/api/v1/auth/google/url').qs({ app: 'backoffice' })
    response.assertStatus(503)
  })

  test('an existing account signs in and gets linked', async ({ client, assert }) => {
    const { user } = await createMember('administrator')
    user.email = 'laura@gmail.com'
    await user.save()
    const sent = googleReturns(account())
    const { state } = await start(client, 'backoffice')

    const response = await client
      .post('/api/v1/auth/google')
      .json({ code: 'the-code', state, device: 'Backoffice' })
    response.assertStatus(200)
    const data = response.body().data as any
    assert.equal(data.status, 'session')
    assert.match(data.session.token, /^oat_/)
    assert.equal(data.session.user.id, user.id)
    // The code is exchanged with the secret and the same redirect URI
    assert.equal(sent[0]!.get('code'), 'the-code')
    assert.equal(sent[0]!.get('client_secret'), 'test-secret')
    assert.equal(sent[0]!.get('redirect_uri'), 'http://localhost:5174/auth/google')

    const identity = await UserIdentity.findByOrFail('providerUserId', 'google-123')
    assert.equal(identity.userId, user.id)
    await user.refresh()
    assert.isNotNull(user.emailVerifiedAt)

    // Next time the link is used even if the Google email changed
    googleReturns(account({ email: 'laura.nueva@gmail.com' }))
    const again = await start(client, 'web')
    const second = await client.post('/api/v1/auth/google').json({ code: 'c2', state: again.state })
    second.assertStatus(200)
    assert.equal((second.body().data as any).session.user.id, user.id)
  })

  test('a new account in the back-office finishes the sign-up without a password', async ({
    client,
    assert,
  }) => {
    mail.fake()
    googleReturns(account())
    const { state } = await start(client, 'backoffice', 'signup')
    const response = await client.post('/api/v1/auth/google').json({ code: 'c', state })
    response.assertStatus(200)
    const data = response.body().data as any
    assert.equal(data.status, 'signup')
    assert.deepEqual(data.profile, { fullName: 'Laura Gómez', email: 'laura@gmail.com' })

    const signup = await client.post('/api/v1/auth/signup').json({
      tenantName: 'Conjunto Google',
      city: 'Bogotá',
      units: 40,
      fullName: 'Laura Gómez',
      // The email comes from Google, not from the form
      email: 'otra@example.com',
      phone: '300 123 4567',
      googleTicket: data.ticket,
      acceptTerms: true as const,
    })
    signup.assertStatus(201)
    const user = await User.findByOrFail('email', 'laura@gmail.com')
    assert.isFalse(user.hasPassword)
    assert.isNotNull(user.emailVerifiedAt)
    assert.exists(await Tenant.findBy('name', 'Conjunto Google'))
    const identity = await UserIdentity.findByOrFail('userId', user.id)
    assert.equal(identity.providerUserId, 'google-123')
  })

  test('the sign-up needs a password or a valid ticket', async ({ client }) => {
    const base = {
      tenantName: 'Conjunto X',
      city: 'Cali',
      units: 10,
      fullName: 'Pedro Pérez',
      email: 'pedro@example.com',
      phone: '300 123 4567',
      acceptTerms: true as const,
    }
    const noPassword = await client.post('/api/v1/auth/signup').json(base)
    noPassword.assertStatus(422)
    noPassword.assertBodyContains({ errors: [{ field: 'password' }] })
    const forged = await client
      .post('/api/v1/auth/signup')
      .json({ ...base, googleTicket: 'not-a-ticket' })
    forged.assertStatus(422)
    forged.assertBodyContains({ errors: [{ field: 'email' }] })
  })

  test('residents without an account are told to ask for an invitation', async ({
    client,
    assert,
  }) => {
    googleReturns(account())
    const { state } = await start(client, 'web')
    const response = await client.post('/api/v1/auth/google').json({ code: 'c', state })
    response.assertStatus(400)
    assert.include((response.body() as any).errors[0].message, 'invite')
    const identities = await UserIdentity.query().where('email', 'laura@gmail.com')
    assert.lengthOf(identities, 0)
  })

  test('rejects tokens for another client, another login or an unverified email', async ({
    client,
  }) => {
    const { user } = await createMember('resident')
    user.email = 'laura@gmail.com'
    await user.save()

    for (const claims of [
      account({ aud: 'someone-else' }),
      account({ iss: 'https://evil.example.com' }),
      account({ exp: Math.floor(Date.now() / 1000) - 10 }),
      () => account()('another-nonce'),
      account({ email_verified: false }),
    ]) {
      googleReturns(claims)
      const { state } = await start(client, 'web')
      const response = await client.post('/api/v1/auth/google').json({ code: 'c', state })
      response.assertStatus(400)
    }

    const forged = await client.post('/api/v1/auth/google').json({ code: 'c', state: 'forged' })
    forged.assertStatus(400)
  })

  test('blocked accounts cannot enter with Google', async ({ client }) => {
    const { user } = await createMember('administrator')
    user.email = 'laura@gmail.com'
    user.status = 'blocked'
    await user.save()
    googleReturns(account())
    const { state } = await start(client, 'backoffice')
    const response = await client.post('/api/v1/auth/google').json({ code: 'c', state })
    response.assertStatus(403)
  })
})
