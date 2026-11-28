import type { BankLineSuggestion } from '@aptoph/shared'
import type BankStatement from '#models/finance/bank_statement'
import type BankStatementLine from '#models/finance/bank_statement_line'
import type ClearanceCertificate from '#models/finance/clearance_certificate'
import { unitRef } from '#transformers/finance/finance'

/** Serializers of the paz y salvo and of the bank reconciliation */

const preloaded = <T>(model: { $preloaded: Record<string, unknown> }, key: string) =>
  (model.$preloaded[key] as T | undefined) ?? null

export function serializeClearance(certificate: ClearanceCertificate) {
  return {
    id: certificate.id,
    number: certificate.number,
    unit: unitRef(preloaded(certificate, 'unit')),
    asOf: certificate.asOf.toISODate()!,
    validUntil: certificate.validUntil.toISODate()!,
    code: certificate.code.replace(/^(.{4})(.{4})(.+)$/, '$1-$2-$3'),
    holderName: certificate.holderName,
    upcomingAmount: certificate.upcomingAmount,
    issuedBy: preloaded<{ fullName: string }>(certificate, 'issuedBy')?.fullName ?? null,
    createdAt: certificate.createdAt.toISO()!,
  }
}

export function serializeStatement(
  statement: BankStatement,
  counts: { pending: number; reconciled: number; ignored: number } = {
    pending: 0,
    reconciled: 0,
    ignored: 0,
  }
) {
  const account = preloaded<{ id: string; name: string }>(statement, 'cashAccount')
  return {
    id: statement.id,
    cashAccount: account ? { id: account.id, name: account.name } : null,
    fileName: statement.fileName,
    startsOn: statement.startsOn.toISODate()!,
    endsOn: statement.endsOn.toISODate()!,
    linesCount: statement.linesCount,
    duplicatesCount: statement.duplicatesCount,
    pending: counts.pending,
    reconciled: counts.reconciled,
    ignored: counts.ignored,
    importedBy: preloaded<{ fullName: string }>(statement, 'importedBy')?.fullName ?? null,
    createdAt: statement.createdAt.toISO()!,
  }
}

export function serializeLine(
  line: BankStatementLine,
  suggestion: BankLineSuggestion | null = null
) {
  const payment = preloaded<BankStatementLine['payment']>(line, 'payment')
  const egreso = preloaded<BankStatementLine['vendorPayment']>(line, 'vendorPayment')
  return {
    id: line.id,
    line: line.line,
    postedOn: line.postedOn.toISODate()!,
    description: line.description,
    reference: line.reference,
    amount: line.amount,
    status: line.status,
    note: line.note,
    payment: payment
      ? {
          id: payment.id,
          number: payment.number,
          unit: preloaded<{ code: string }>(payment, 'unit')?.code ?? null,
          status: payment.status,
        }
      : null,
    vendorPayment: egreso
      ? {
          id: egreso.id,
          number: egreso.number,
          vendor: preloaded<{ name: string }>(egreso, 'vendor')?.name ?? null,
        }
      : null,
    reconciledBy: preloaded<{ fullName: string }>(line, 'reconciledBy')?.fullName ?? null,
    reconciledAt: line.reconciledAt?.toISO() ?? null,
    suggestion: line.status === 'pending' ? suggestion : null,
  }
}
