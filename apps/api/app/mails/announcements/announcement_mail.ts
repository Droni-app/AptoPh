import { BaseMail } from '@adonisjs/mail'
import type Announcement from '#models/announcements/announcement'
import type Tenant from '#models/tenants/tenant'

/** A comunicado sent to one person of its audience when it is published */
export default class AnnouncementMail extends BaseMail {
  constructor(
    private announcement: Announcement,
    private tenant: Tenant,
    private recipient: { fullName: string; email: string },
    readonly url: string,
    private attachmentCount: number
  ) {
    super()
    this.subject = `${tenant.name}: ${announcement.title}`
  }

  prepare() {
    const paragraphs = this.announcement.body
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean)
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
        paragraphs,
        attachments,
        url: this.url,
      })
      .text(
        [
          `${this.tenant.name}`,
          this.announcement.title,
          this.announcement.body,
          attachments ? `${attachments} Míralo aquí: ${this.url}` : `Míralo aquí: ${this.url}`,
        ].join('\n\n')
      )
  }
}
