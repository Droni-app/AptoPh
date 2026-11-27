import { BaseMail } from '@adonisjs/mail'

export type ParkingMailContent = {
  subject: string
  title: string
  paragraphs: string[]
  rows: Array<{ label: string; value: string }>
  action: string
  url: string
}

/**
 * Notices of the parking lottery to one resident: applications open, the
 * result of the draw and changes of an assignment or offer. docs/parking.md
 */
export default class ParkingMail extends BaseMail {
  constructor(
    private recipient: { email: string; fullName: string },
    private tenantName: string,
    readonly content: ParkingMailContent
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
