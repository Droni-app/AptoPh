import mail from '@adonisjs/mail/services/main'
import logger from '@adonisjs/core/services/logger'
import type { BaseMail } from '@adonisjs/mail'

/**
 * Queues an email without failing the request: the action already happened and
 * the person can ask for the email again (resend invitation, forgot password…).
 */
export function queueMail(message: BaseMail, description: string) {
  mail
    .sendLater(message)
    .catch((error) => logger.error({ err: error }, `Could not queue the ${description} mail`))
}
