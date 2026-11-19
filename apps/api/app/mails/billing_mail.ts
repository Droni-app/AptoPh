import { BaseMail } from '@adonisjs/mail'

export type BillingMailContent = {
  subject: string
  title: string
  paragraphs: string[]
  rows: Array<{ label: string; value: string }>
  action: string
  url: string
}

/**
 * Payment notices to a conjunto's administration: receipt of an approved charge,
 * a declined renewal, and the upcoming renewal. Transactional: they do not use
 * the bulk email quota. docs/billing.md
 */
export default class BillingMail extends BaseMail {
  constructor(
    private recipient: { email: string; fullName: string },
    private tenantName: string,
    readonly content: BillingMailContent
  ) {
    super()
    this.subject = content.subject
  }

  prepare() {
    const { title, paragraphs, rows, action, url } = this.content
    this.message
      .to(this.recipient.email, this.recipient.fullName)
      .htmlView('emails/billing', {
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
