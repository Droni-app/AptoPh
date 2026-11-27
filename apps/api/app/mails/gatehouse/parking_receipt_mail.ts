import { BaseMail } from '@adonisjs/mail'

export type ParkingReceiptContent = {
  subject: string
  title: string
  /** Who issues it: the conjunto, with its NIT when it has one */
  issuer: string
  rows: Array<{ label: string; value: string }>
  totals: Array<{ label: string; value: string }>
  notes: string[]
}

/**
 * Receipt of a visitor parking stay, sent to the email the guard types on exit.
 * Transactional: it does not use the bulk email quota. It is a receipt, not an
 * electronic invoice. docs/visitor-parking.md
 */
export default class ParkingReceiptMail extends BaseMail {
  constructor(
    private email: string,
    readonly content: ParkingReceiptContent
  ) {
    super()
    this.subject = content.subject
  }

  prepare() {
    const { issuer, title, rows, totals, notes } = this.content
    this.message
      .to(this.email)
      .htmlView('emails/parking_receipt', { issuer, title, rows, totals, notes })
      .text(
        [
          issuer,
          title,
          rows.map((row) => `${row.label}: ${row.value}`).join('\n'),
          totals.map((row) => `${row.label}: ${row.value}`).join('\n'),
          ...notes,
        ].join('\n\n')
      )
  }
}
