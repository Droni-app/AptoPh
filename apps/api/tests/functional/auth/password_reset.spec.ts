import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import mail from '@adonisjs/mail/services/main'
import { DateTime } from 'luxon'
import User from '#models/auth/user'
import UserToken from '#models/auth/user_token'
import PasswordResetMail from '#mails/auth/password_reset_mail'
import PasswordChangedMail from '#mails/auth/password_changed_mail'
import UserTokenService from '#services/auth/user_token_service'
import { hashToken } from '#services/secure_token'
import { resetRateLimits, tokenFrom } from '#tests/helpers'

async function createUser() {
  return User.create({
    fullName: 'Rita Restablece',
    email: 'rita@example.com',
    password: 'old-password-1',
  })
}

test.group('Auth · forgot password', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => resetRateLimits())
  group.each.teardown(() => mail.restore())

  test('emails a reset link to the app that asked for it', async ({ client, assert }) => {
    const { mails } = mail.fake()
    await createUser()

    const response = await client
      .post('/api/v1/auth/password/forgot')
      .json({ email: 'RITA@example.com', app: 'backoffice' })

    response.assertStatus(204)
    mails.assertQueued(PasswordResetMail, (message) => {
      assert.match(message.resetUrl, /^http:\/\/localhost:5174\/restablecer-contrasena\?token=/)
      return true
    })
  })

  test('answers the same for an unknown email and sends nothing', async ({ client }) => {
    const { mails } = mail.fake()

    const response = await client
      .post('/api/v1/auth/password/forgot')
      .json({ email: 'nadie@example.com' })

    response.assertStatus(204)
    mails.assertNoneQueued()
  })

  test('allows three emails every 15 minutes per address', async ({ client }) => {
    mail.fake()
    await createUser()

    for (let attempt = 0; attempt < 3; attempt++) {
      const ok = await client
        .post('/api/v1/auth/password/forgot')
        .json({ email: 'rita@example.com' })
      ok.assertStatus(204)
    }
    const blocked = await client
      .post('/api/v1/auth/password/forgot')
      .json({ email: 'rita@example.com' })
    blocked.assertStatus(429)
  })

  test('only the last link works', async ({ client, assert }) => {
    const { mails } = mail.fake()
    await createUser()

    await client.post('/api/v1/auth/password/forgot').json({ email: 'rita@example.com' })
    await client.post('/api/v1/auth/password/forgot').json({ email: 'rita@example.com' })

    const [first, second] = mails
      .queued((message) => message instanceof PasswordResetMail)
      .map((message) => tokenFrom((message as PasswordResetMail).resetUrl))
    assert.notEqual(first, second)
    assert.isNull(await UserToken.findBy('tokenHash', hashToken(first)))
    assert.isNotNull(await UserToken.findBy('tokenHash', hashToken(second)))
  })
})

test.group('Auth · reset password', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => resetRateLimits())
  group.each.teardown(() => mail.restore())

  test('sets the new password, signs in and closes the other sessions', async ({
    client,
    assert,
  }) => {
    const { mails } = mail.fake()
    const user = await createUser()
    await User.accessTokens.create(user)
    const token = await new UserTokenService().issue(user, 'password_reset')

    const response = await client
      .post('/api/v1/auth/password/reset')
      .json({ token, password: 'new-password-2', device: 'Backoffice' })

    response.assertStatus(200)
    assert.match(response.body().data.token, /^oat_/)

    const sessions = await User.accessTokens.all(user)
    assert.lengthOf(sessions, 1)
    assert.equal(sessions[0].name, 'Backoffice')

    await user.refresh()
    assert.isTrue(await user.verifyPassword('new-password-2'))
    assert.isNotNull(user.emailVerifiedAt)
    mails.assertQueued(PasswordChangedMail)
  })

  test('a link works only once', async ({ client }) => {
    mail.fake()
    const user = await createUser()
    const token = await new UserTokenService().issue(user, 'password_reset')

    await client.post('/api/v1/auth/password/reset').json({ token, password: 'new-password-2' })
    const again = await client
      .post('/api/v1/auth/password/reset')
      .json({ token, password: 'new-password-3' })

    again.assertStatus(400)
    again.assertBodyContains({
      errors: [{ message: 'El enlace no es válido o ya venció. Solicita uno nuevo.' }],
    })
  })

  test('rejects an expired link', async ({ client, assert }) => {
    const user = await createUser()
    const token = await new UserTokenService().issue(user, 'password_reset')
    await UserToken.query()
      .where('tokenHash', hashToken(token))
      .update({ expiresAt: DateTime.now().minus({ minutes: 1 }).toSQL() })

    const response = await client
      .post('/api/v1/auth/password/reset')
      .json({ token, password: 'new-password-2' })

    response.assertStatus(400)
    await user.refresh()
    assert.isTrue(await user.verifyPassword('old-password-1'))
  })

  test('a verification link cannot reset the password', async ({ client }) => {
    const user = await createUser()
    const token = await new UserTokenService().issue(user, 'email_verification')

    const response = await client
      .post('/api/v1/auth/password/reset')
      .json({ token, password: 'new-password-2' })
    response.assertStatus(400)
  })

  test('validates the new password', async ({ client }) => {
    const user = await createUser()
    const token = await new UserTokenService().issue(user, 'password_reset')

    const response = await client
      .post('/api/v1/auth/password/reset')
      .json({ token, password: '123' })
    response.assertStatus(422)
  })
})
