import { test } from '@japa/runner'
import mail from '@adonisjs/mail/services/main'
import TestMail from '#mails/test_mail'

test.group('Mail', (group) => {
  group.each.teardown(() => mail.restore())

  test('renders and sends the test mail through the default mailer', async ({ assert }) => {
    const { mails } = mail.fake()

    await mail.send(new TestMail('someone@example.com'))

    mails.assertSent(TestMail, (message) => {
      message.message.assertTo('someone@example.com')
      message.message.assertSubject('Correo de prueba · AptoPH')
      message.message.assertFrom('no-reply@aptoph.test', 'AptoPH')
      return true
    })

    const [sent] = mails.sent()
    await sent.buildWithContents()
    assert.include(sent.message.toJSON().message.html, 'está configurado correctamente')
  })
})
