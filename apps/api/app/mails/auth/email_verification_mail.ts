import { BaseMail } from '@adonisjs/mail'
import type User from '#models/auth/user'

/** Link to confirm the account's email address */
export default class EmailVerificationMail extends BaseMail {
  subject = 'Confirma tu correo en AptoPH'

  constructor(
    private user: User,
    readonly verifyUrl: string
  ) {
    super()
  }

  prepare() {
    const firstName = this.user.fullName.split(' ')[0]
    this.message
      .to(this.user.email, this.user.fullName)
      .htmlView('emails/email_verification', {
        firstName,
        email: this.user.email,
        verifyUrl: this.verifyUrl,
        validFor: '3 días',
      })
      .text(
        [
          `Hola, ${firstName}:`,
          `Confirma que ${this.user.email} es tu correo en AptoPH:`,
          this.verifyUrl,
        ].join('\n\n')
      )
  }
}
