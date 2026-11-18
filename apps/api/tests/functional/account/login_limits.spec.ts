import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'
import { resetRateLimits } from '#tests/helpers'

test.group('Auth · login limits', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => resetRateLimits())

  test('five wrong passwords block the email for 15 minutes, even with the right one', async ({
    client,
    assert,
  }) => {
    await User.create({
      fullName: 'Lina Login',
      email: 'lina@example.com',
      password: 'right-pass-123',
    })

    for (let attempt = 0; attempt < 5; attempt++) {
      const wrong = await client
        .post('/api/v1/auth/login')
        .json({ email: 'lina@example.com', password: 'wrong-pass' })
      wrong.assertStatus(400)
    }

    const blocked = await client
      .post('/api/v1/auth/login')
      .json({ email: 'lina@example.com', password: 'right-pass-123' })
    blocked.assertStatus(429)
    assert.match(
      (blocked.body() as unknown as { errors: Array<{ message: string }> }).errors[0].message,
      /Demasiados intentos\. Vuelve a intentarlo en 15 minutos/
    )
  })

  test('a successful login clears the failed attempts', async ({ client }) => {
    await User.create({
      fullName: 'Lina Login',
      email: 'lina@example.com',
      password: 'right-pass-123',
    })

    for (let attempt = 0; attempt < 4; attempt++) {
      await client.post('/api/v1/auth/login').json({ email: 'lina@example.com', password: 'nope' })
    }
    const ok = await client
      .post('/api/v1/auth/login')
      .json({ email: 'lina@example.com', password: 'right-pass-123' })
    ok.assertStatus(200)

    for (let attempt = 0; attempt < 4; attempt++) {
      const wrong = await client
        .post('/api/v1/auth/login')
        .json({ email: 'lina@example.com', password: 'nope' })
      wrong.assertStatus(400)
    }
  })

  test('an invited person without password cannot sign in (no server error)', async ({
    client,
  }) => {
    await User.create({ fullName: 'Ivan Invitado', email: 'ivan@example.com' })

    const response = await client
      .post('/api/v1/auth/login')
      .json({ email: 'ivan@example.com', password: 'anything-123' })
    response.assertStatus(400)
  })

  test('records the time of the last login', async ({ client, assert }) => {
    const user = await User.create({
      fullName: 'Lina Login',
      email: 'lina@example.com',
      password: 'right-pass-123',
    })
    await client
      .post('/api/v1/auth/login')
      .json({ email: 'lina@example.com', password: 'right-pass-123' })
    await user.refresh()
    assert.isNotNull(user.lastLoginAt)
  })
})
