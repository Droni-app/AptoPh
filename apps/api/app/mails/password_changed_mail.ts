import { BaseMail } from '@adonisjs/mail'
import { DateTime } from 'luxon'
import type User from '#models/user'

/** Security notice after the password changes (reset or from the profile) */
export default class PasswordChangedMail extends BaseMail {
  subject = 'Tu contraseña de AptoPH cambió'

  constructor(private user: User) {
    super()
  }

  prepare() {
    const firstName = this.user.fullName.split(' ')[0]
    const changedAt = DateTime.now()
      .setZone('America/Bogota')
      .setLocale('es-CO')
      .toFormat("d 'de' LLLL 'a las' h:mm a")
    this.message
      .to(this.user.email, this.user.fullName)
      .htmlView('emails/password_changed', { firstName, changedAt })
      .text(
        [
          `Hola, ${firstName}:`,
          `La contraseña de tu cuenta en AptoPH se cambió el ${changedAt} y cerramos las demás sesiones.`,
          'Si no fuiste tú, restablece tu contraseña de inmediato y avisa a la administración de tu conjunto.',
        ].join('\n\n')
      )
  }
}
