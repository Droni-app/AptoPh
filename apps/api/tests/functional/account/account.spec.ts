import { test } from '@japa/runner'
import type { ApiClient } from '@japa/api-client'
import testUtils from '@adonisjs/core/services/test_utils'
import mail from '@adonisjs/mail/services/main'
import User from '#models/user'
import EmailVerificationMail from '#mails/email_verification_mail'
import PasswordChangedMail from '#mails/password_changed_mail'
import UserTokenService from '#services/user_token_service'
import { createMember, resetRateLimits, tokenFrom } from '#tests/helpers'

const PASSWORD = 'secret-password'

type Session = { id: string; device: string; current: boolean }

/** Signs in through the API, like an app does */
async function login(client: ApiClient, email: string, device: string) {
  const response = await client
    .post('/api/v1/auth/login')
    .json({ email, password: PASSWORD, device })
  return response.body().data.token as string
}

test.group('Account · profile and password', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => resetRateLimits())
  group.each.teardown(() => mail.restore())

  test('updates the profile but not the email', async ({ client }) => {
    const { user } = await createMember('resident')

    const response = await client
      .patch('/api/v1/account/profile')
      .json({
        fullName: 'Rosa María Residente',
        phone: '300 123 4567',
        documentType: 'CC',
        documentNumber: '1020304050',
        email: 'otro@example.com',
      } as never)
      .loginAs(user)

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        fullName: 'Rosa María Residente',
        phone: '300 123 4567',
        documentType: 'CC',
        documentNumber: '1020304050',
        email: user.email,
      },
    })
  })

  test('a document type needs its number', async ({ client }) => {
    const { user } = await createMember('resident')

    const response = await client
      .patch('/api/v1/account/profile')
      .json({ fullName: 'Rosa', phone: null, documentType: 'CC', documentNumber: null })
      .loginAs(user)
    response.assertStatus(422)
    response.assertBodyContains({ errors: [{ field: 'documentNumber' }] })
  })

  test('changes the password with the current one and closes the other sessions', async ({
    client,
    assert,
  }) => {
    const { mails } = mail.fake()
    const { user } = await createMember('resident')
    const current = await login(client, user.email, 'Portal')
    await login(client, user.email, 'Celular')

    const wrong = await client
      .put('/api/v1/account/password')
      .json({ currentPassword: 'nope', password: 'new-password-1' })
      .header('Authorization', `Bearer ${current}`)
    wrong.assertStatus(422)
    wrong.assertBodyContains({ errors: [{ field: 'currentPassword' }] })

    const response = await client
      .put('/api/v1/account/password')
      .json({ currentPassword: PASSWORD, password: 'new-password-1' })
      .header('Authorization', `Bearer ${current}`)
    response.assertStatus(204)

    const sessions = await User.accessTokens.all(user)
    assert.deepEqual(
      sessions.map((token) => token.name),
      ['Portal']
    )
    await user.refresh()
    assert.isTrue(await user.verifyPassword('new-password-1'))
    mails.assertQueued(PasswordChangedMail)
  })

  test('the new password must differ from the current one', async ({ client }) => {
    const { user } = await createMember('resident')
    const response = await client
      .put('/api/v1/account/password')
      .json({ currentPassword: PASSWORD, password: PASSWORD })
      .loginAs(user)
    response.assertStatus(422)
  })
})

test.group('Account · sessions', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => resetRateLimits())

  test('lists the open sessions with the current one first', async ({ client, assert }) => {
    const { user } = await createMember('resident')
    await login(client, user.email, 'Celular')
    const current = await login(client, user.email, 'Portal')

    const response = await client
      .get('/api/v1/account/sessions')
      .header('Authorization', `Bearer ${current}`)

    response.assertStatus(200)
    const { data } = response.body() as { data: Session[] }
    assert.lengthOf(data, 2)
    assert.include(data[0], { device: 'Portal', current: true })
    assert.include(data[1], { device: 'Celular', current: false })
  })

  test('closes one session or all the others', async ({ client, assert }) => {
    const { user } = await createMember('resident')
    const phone = await login(client, user.email, 'Celular')
    await login(client, user.email, 'Tablet')
    const current = await login(client, user.email, 'Portal')

    const list = await client
      .get('/api/v1/account/sessions')
      .header('Authorization', `Bearer ${current}`)
    const { data: sessions } = list.body() as { data: Session[] }
    const phoneId = sessions.find((s) => s.device === 'Celular')!.id

    const one = await client
      .delete(`/api/v1/account/sessions/${phoneId}`)
      .header('Authorization', `Bearer ${current}`)
    one.assertStatus(204)
    const closed = await client
      .get('/api/v1/account/profile')
      .header('Authorization', `Bearer ${phone}`)
    closed.assertStatus(401)

    const others = await client
      .delete('/api/v1/account/sessions')
      .header('Authorization', `Bearer ${current}`)
    others.assertStatus(204)
    const remaining = await User.accessTokens.all(user)
    assert.deepEqual(
      remaining.map((token) => token.name),
      ['Portal']
    )
  })

  test('cannot close a session of another person', async ({ client }) => {
    const { user } = await createMember('resident')
    const { user: other } = await createMember('resident')
    const token = await User.accessTokens.create(other)

    const response = await client
      .delete(`/api/v1/account/sessions/${token.identifier}`)
      .loginAs(user)
    response.assertStatus(404)
  })
})

test.group('Account · email verification', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => resetRateLimits())
  group.each.teardown(() => mail.restore())

  test('emails a confirmation link and confirms the email with it', async ({ client, assert }) => {
    const { mails } = mail.fake()
    const { user } = await createMember('administrator')

    const send = await client
      .post('/api/v1/account/email/verification')
      .json({ app: 'backoffice' })
      .loginAs(user)
    send.assertStatus(204)

    let link = ''
    mails.assertQueued(EmailVerificationMail, (message) => {
      link = message.verifyUrl
      return true
    })
    assert.match(link, /^http:\/\/localhost:5174\/verificar-correo\?token=/)

    const verify = await client.post('/api/v1/auth/email/verify').json({ token: tokenFrom(link) })
    verify.assertStatus(204)
    await user.refresh()
    assert.isNotNull(user.emailVerifiedAt)

    const again = await client.post('/api/v1/auth/email/verify').json({ token: tokenFrom(link) })
    again.assertStatus(400)
  })

  test('sends nothing when the email is already confirmed', async ({ client }) => {
    const { mails } = mail.fake()
    const { user } = await createMember('resident')
    const token = await new UserTokenService().issue(user, 'email_verification')
    await client.post('/api/v1/auth/email/verify').json({ token })

    const response = await client.post('/api/v1/account/email/verification').loginAs(user)
    response.assertStatus(204)
    mails.assertNoneQueued()
  })

  test('allows three emails per hour', async ({ client }) => {
    mail.fake()
    const { user } = await createMember('resident')

    for (let attempt = 0; attempt < 3; attempt++) {
      const ok = await client.post('/api/v1/account/email/verification').loginAs(user)
      ok.assertStatus(204)
    }
    const blocked = await client.post('/api/v1/account/email/verification').loginAs(user)
    blocked.assertStatus(429)
  })
})
