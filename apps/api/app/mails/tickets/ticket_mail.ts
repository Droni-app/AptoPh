import { BaseMail } from '@adonisjs/mail'

export type TicketMailContent = {
  subject: string
  title: string
  paragraphs: string[]
  rows: Array<{ label: string; value: string }>
  action: string
  url: string
}

/**
 * PQRS notices to one person: a reply or status change to the resident who
 * filed it, and an assignment to the staff member. Transactional: they do not
 * use the bulk email quota. docs/tickets.md
 */
export default class TicketMail extends BaseMail {
  constructor(
    private recipient: { email: string; fullName: string },
    private tenantName: string,
    readonly content: TicketMailContent
  ) {
    super()
    this.subject = content.subject
  }

  prepare() {
    const { title, paragraphs, rows, action, url } = this.content
    this.message
      .to(this.recipient.email, this.recipient.fullName)
      .htmlView('emails/ticket', {
        tenantName: this.tenantName,
        title,
        paragraphs,
        rows,
        action,
        url,
      })
      .text(
        [
          this.tenantName,
          title,
          ...paragraphs,
          rows.map((row) => `${row.label}: ${row.value}`).join('\n'),
          `${action}: ${url}`,
        ].join('\n\n')
      )
  }
}
