import env from '#start/env'
import { defineConfig, transports } from '@adonisjs/mail'
import type { InferMailers } from '@adonisjs/mail/types'

const smtpPort = env.get('SMTP_PORT')
const smtpUser = env.get('SMTP_USERNAME')
const smtpPassword = env.get('SMTP_PASSWORD')

const mailConfig = defineConfig({
  default: env.get('MAIL_MAILER'),

  from: {
    address: env.get('MAIL_FROM_ADDRESS'),
    name: env.get('MAIL_FROM_NAME'),
  },

  /**
   * Shared with every email template
   */
  globals: {
    brandName: 'AptoPH',
    appUrl: env.get('APP_URL'),
  },

  mailers: {
    /**
     * SMTP transport (Mailjet in production: in-v3.mailjet.com:587,
     * user = API key, password = secret key).
     */
    smtp: transports.smtp({
      host: env.get('SMTP_HOST'),
      port: smtpPort,
      /**
       * 465 = implicit TLS. Any other port upgrades with STARTTLS,
       * which is required (never send credentials in clear text).
       */
      secure: smtpPort === 465,
      requireTLS: smtpPort !== 465 && env.get('SMTP_REQUIRE_TLS', true),
      ...(smtpUser && smtpPassword
        ? { auth: { type: 'login' as const, user: smtpUser, pass: smtpPassword } }
        : {}),
    }),
  },
})

export default mailConfig

declare module '@adonisjs/mail/types' {
  export interface MailersList extends InferMailers<typeof mailConfig> {}
}
