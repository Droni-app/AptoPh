import { BaseMail } from '@adonisjs/mail'

export type NotificationMailContent = {
  subject: string
  title: string
  paragraphs: string[]
  rows: Array<{ label: string; value: string }>
  action: string
  url: string
  /** Profile page where the person chooses the channels */
  preferencesUrl: string
}

/**
 * The email of a notification (docs/notifications.md): sent only when the
 * person has the email channel on for its category.
 */
export default class NotificationMail extends BaseMail {
  constructor(
    private recipient: { email: string; fullName: string },
    private tenantName: string,
    readonly content: NotificationMailContent
  ) {
    super()
    this.subject = content.subject
  }

  prepare() {
    const { title, paragraphs, rows, action, url, preferencesUrl } = this.content
    this.message
      .to(this.recipient.email, this.recipient.fullName)
      .htmlView('emails/notification', {
        tenantName: this.tenantName,
        title,
        paragraphs,
        rows,
        action,
        url,
        preferencesUrl,
      })
      .text(
        [
          this.tenantName,
          title,
          ...paragraphs,
          rows.map((row) => `${row.label}: ${row.value}`).join('\n'),
          url ? `${action}: ${url}` : null,
          preferencesUrl
            ? `Elige qué avisos te llegan por correo en tu perfil: ${preferencesUrl}`
            : null,
        ]
          .filter(Boolean)
          .join('\n\n')
      )
  }
}
