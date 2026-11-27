import { DateTime } from 'luxon'
import type { JournalEntryType } from '@aptoph/shared'
import { fromCents, toCents } from '@aptoph/shared'
import FieldException from '#exceptions/field_exception'
import JournalEntry from '#models/finance/journal_entry'
import JournalLine from '#models/finance/journal_line'
import type Tenant from '#models/tenants/tenant'
import type { AccountBook } from '#services/finance/accounts'
import { type Trx, nextNumber, settingsOf } from '#services/finance/support'

export type PostingLine = {
  accountId: string
  /** Cents */
  debit?: number
  /** Cents */
  credit?: number
  unitId?: string | null
  vendorId?: string | null
  description?: string | null
}

export type Posting = {
  date: string
  type: JournalEntryType
  description: string
  sourceType?: string | null
  sourceId?: string | null
  userId?: string | null
  lines: PostingLine[]
}

export class LedgerError extends FieldException {}

/**
 * Writes balanced, numbered vouchers. Every finance flow posts through here
 * inside its own transaction, so the books always match the subledgers.
 */
export class Ledger {
  constructor(
    private trx: Trx,
    private tenant: Tenant,
    private accounts: AccountBook
  ) {}

  /** Rejects dates inside the closed accounting period */
  assertOpen(date: string, field = 'date') {
    const lockedUntil = settingsOf(this.tenant).lockedUntil
    if (lockedUntil && date <= lockedUntil) {
      throw new LedgerError(
        field,
        `La contabilidad está cerrada hasta el ${lockedUntil}. Usa una fecha posterior.`
      )
    }
  }

  async post(posting: Posting): Promise<JournalEntry | null> {
    const lines = posting.lines
      .map((line) => ({ ...line, debit: line.debit ?? 0, credit: line.credit ?? 0 }))
      .filter((line) => line.debit !== 0 || line.credit !== 0)
    if (lines.length === 0) return null

    for (const line of lines) {
      if (line.debit < 0 || line.credit < 0 || (line.debit > 0 && line.credit > 0)) {
        throw new Error('Each journal line has a positive debit or a positive credit')
      }
      const account = this.accounts.id(line.accountId)
      if (!account) throw new LedgerError('lines', 'Una de las cuentas no existe')
      if (!account.isPostable) {
        throw new LedgerError(
          'lines',
          `La cuenta ${account.code} ${account.name} es de grupo: usa una subcuenta`
        )
      }
    }
    const debits = lines.reduce((sum, line) => sum + line.debit, 0)
    const credits = lines.reduce((sum, line) => sum + line.credit, 0)
    if (debits !== credits) {
      throw new LedgerError(
        'lines',
        `El comprobante no cuadra: débitos ${fromCents(debits)} y créditos ${fromCents(credits)}`
      )
    }
    this.assertOpen(posting.date)

    const entry = await JournalEntry.create(
      {
        tenantId: this.tenant.id,
        number: await nextNumber(this.trx, this.tenant.id, 'journal'),
        date: DateTime.fromISO(posting.date),
        type: posting.type,
        description: posting.description.slice(0, 255),
        sourceType: posting.sourceType ?? null,
        sourceId: posting.sourceId ?? null,
        total: fromCents(debits),
        createdById: posting.userId ?? null,
      },
      { client: this.trx }
    )
    await JournalLine.createMany(
      lines.map((line) => ({
        tenantId: this.tenant.id,
        entryId: entry.id,
        accountId: line.accountId,
        debit: fromCents(line.debit),
        credit: fromCents(line.credit),
        unitId: line.unitId ?? null,
        vendorId: line.vendorId ?? null,
        description: line.description ? line.description.slice(0, 255) : null,
      })),
      { client: this.trx }
    )
    return entry
  }

  /**
   * Reverses a voucher with a mirror one (debits ↔ credits) and links both.
   */
  async reverse(
    entry: JournalEntry,
    options: { date: string; description: string; userId?: string | null; type?: JournalEntryType }
  ) {
    if (entry.reversedByEntryId) {
      throw new LedgerError('entry', `El comprobante ${entry.number} ya fue reversado`)
    }
    const lines = await JournalLine.query({ client: this.trx }).where('entry_id', entry.id)
    const reversal = await this.post({
      date: options.date,
      type: options.type ?? 'reversal',
      description: options.description,
      sourceType: entry.sourceType,
      sourceId: entry.sourceId,
      userId: options.userId,
      lines: lines.map((line) => ({
        accountId: line.accountId,
        debit: toCents(line.credit),
        credit: toCents(line.debit),
        unitId: line.unitId,
        vendorId: line.vendorId,
        description: line.description,
      })),
    })
    if (!reversal) return null
    reversal.reversesEntryId = entry.id
    await reversal.useTransaction(this.trx).save()
    entry.reversedByEntryId = reversal.id
    await entry.useTransaction(this.trx).save()
    return reversal
  }
}
