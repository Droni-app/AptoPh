import { BaseMail } from '@adonisjs/mail'

/**
 * Used by `node ace mail:test <email>` to verify the SMTP configuration
 */
export default class TestMail extends BaseMail {
  subject = 'Correo de prueba · ApartaDock'

  constructor(private recipient: string) {
    super()
  }

  prepare() {
    const sentAt = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })

    this.message
      .to(this.recipient)
      .htmlView('emails/test', { sentAt })
      .text(`Correo de prueba de ApartaDock. El envío SMTP funciona. Enviado el ${sentAt}.`)
  }
}
