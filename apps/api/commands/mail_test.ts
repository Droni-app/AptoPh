import { args, BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

export default class MailTest extends BaseCommand {
  static commandName = 'mail:test'
  static description = 'Envía un correo de prueba para verificar la configuración SMTP'
  static options: CommandOptions = { startApp: true }

  @args.string({ description: 'Correo del destinatario' })
  declare to: string

  async run() {
    const { default: mail } = await import('@adonisjs/mail/services/main')
    const { default: TestMail } = await import('#mails/test_mail')

    try {
      const response = await mail.send(new TestMail(this.to))
      this.logger.success(`Correo enviado a ${this.to} (messageId: ${response.messageId})`)
    } catch (error) {
      this.logger.error(`No se pudo enviar el correo: ${(error as Error).message}`)
      this.exitCode = 1
    }
  }
}
