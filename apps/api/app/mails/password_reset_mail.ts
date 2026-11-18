import { BaseMail } from '@adonisjs/mail'
import type User from '#models/user'

/** Link to choose a new password (valid for one hour, single use) */
export default class PasswordResetMail extends BaseMail {
  subject = 'Restablece tu contraseña de AptoPH'

  constructor(
    private user: User,
    readonly resetUrl: string
  ) {
    super()
  }

  prepare() {
    const firstName = this.user.fullName.split(' ')[0]
    this.message
      .to(this.user.email, this.user.fullName)
      .htmlView('emails/password_reset', { firstName, resetUrl: this.resetUrl, validFor: '1 hora' })
      .text(
        [
          `Hola, ${firstName}:`,
          'Recibimos una solicitud para restablecer tu contraseña de AptoPH. El enlace funciona una sola vez durante 1 hora:',
          this.resetUrl,
          'Si no pediste este cambio, ignora este correo.',
        ].join('\n\n')
      )
  }
}
