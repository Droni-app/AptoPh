import { BaseMail } from '@adonisjs/mail'
import type Announcement from '#models/announcements/announcement'
import type Tenant from '#models/tenants/tenant'
import { emailHtml, htmlToText, sanitizeBody } from '#services/announcements/rich_text'

/** A comunicado sent to one person of its audience when it is published */
export default class AnnouncementMail extends BaseMail {
  constructor(
    private announcement: Announcement,
    private tenant: Tenant,
    private recipient: { fullName: string; email: string },
    readonly url: string,
    private attachmentCount: number,
    /** Lasting link to the image (poster), or null */
    private imageUrl: string | null = null
  ) {
    super()
    this.subject = `${tenant.name}: ${announcement.title}`
  }

  prepare() {
    // Sanitized again: the body of older rows may be plain text
    const body = sanitizeBody(this.announcement.body)
    const attachments =
      this.attachmentCount === 0
        ? null
        : this.attachmentCount === 1
          ? 'Tiene un archivo adjunto.'
          : `Tiene ${this.attachmentCount} archivos adjuntos.`

    this.message
      .to(this.recipient.email, this.recipient.fullName)
      .htmlView('emails/announcement', {
        tenantName: this.tenant.name,
        title: this.announcement.title,
        bodyHtml: emailHtml(body),
        imageUrl: this.imageUrl,
        attachments,
        url: this.url,
      })
      .text(
        [
          `${this.tenant.name}`,
          this.announcement.title,
          this.imageUrl ? `Incluye una imagen: ${this.imageUrl}` : null,
          htmlToText(body) || null,
          attachments ? `${attachments} Míralo aquí: ${this.url}` : `Míralo aquí: ${this.url}`,
        ]
          .filter(Boolean)
          .join('\n\n')
      )
  }
}
