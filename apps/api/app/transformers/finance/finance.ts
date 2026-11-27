/**
 * JSON shapes of the finance module (types in packages/shared/src/api.ts).
 * Dates go out as ISO dates, amounts as decimal strings.
 */
import type { DateTime } from 'luxon'
import type Bill from '#models/finance/bill'
import type BillingPeriod from '#models/finance/billing_period'
import type Budget from '#models/finance/budget'
import type CashAccount from '#models/finance/cash_account'
import type Charge from '#models/finance/charge'
import type ChargeConcept from '#models/finance/charge_concept'
import type ContributionModule from '#models/finance/contribution_module'
import type FeeSchedule from '#models/finance/fee_schedule'
import type JournalEntry from '#models/finance/journal_entry'
import type LedgerAccount from '#models/finance/ledger_account'
import type Payment from '#models/finance/payment'
import type RecurringCharge from '#models/finance/recurring_charge'
import type Unit from '#models/property/unit'
import type Vendor from '#models/finance/vendor'
import type VendorPayment from '#models/finance/vendor_payment'
import { fromCents } from '@aptoph/shared'

const date = (value: DateTime | null | undefined) => (value ? value.toISODate() : null)
const stamp = (value: DateTime | null | undefined) => (value ? value.toISO() : null)
const money = (value: string | number | null | undefined) =>
  value === null || value === undefined ? null : fromCents(Math.round(Number(value) * 100))
const loaded = <T>(model: { $preloaded: Record<string, unknown> }, key: string) =>
  (model.$preloaded[key] as T | undefined) ?? undefined

export function unitRef(unit: Unit | undefined | null) {
  if (!unit) return null
  const building = loaded<{ name: string } | null>(unit, 'building')
  return { id: unit.id, code: unit.code, type: unit.type, building: building?.name ?? null }
}

export function accountRef(account: LedgerAccount | undefined | null) {
  return account ? { id: account.id, code: account.code, name: account.name } : null
}

export function serializeAccount(account: LedgerAccount) {
  return {
    id: account.id,
    code: account.code,
    name: account.name,
    class: account.class,
    nature: account.nature,
    isPostable: account.isPostable,
    isActive: account.isActive,
    systemKey: account.systemKey,
  }
}

export function serializeConcept(concept: ChargeConcept) {
  return {
    id: concept.id,
    code: concept.code,
    name: concept.name,
    type: concept.type,
    defaultAmount: money(concept.defaultAmount),
    accruesInterest: concept.accruesInterest,
    allowsEarlyDiscount: concept.allowsEarlyDiscount,
    isActive: concept.isActive,
    isSystem: concept.code !== null,
    receivableAccount: accountRef(loaded<LedgerAccount>(concept, 'receivableAccount')),
    incomeAccount: accountRef(loaded<LedgerAccount>(concept, 'incomeAccount')),
  }
}

export function serializeCashAccount(account: CashAccount, balance?: string) {
  return {
    id: account.id,
    name: account.name,
    type: account.type,
    bankName: account.bankName,
    accountKind: account.accountKind,
    accountNumber: account.accountNumber,
    isActive: account.isActive,
    ledgerAccount: accountRef(loaded<LedgerAccount>(account, 'ledgerAccount')),
    balance: balance ?? null,
  }
}

export function serializeCharge(charge: Charge) {
  const concept = loaded<ChargeConcept>(charge, 'chargeConcept')
  const adjustments = loaded<
    Array<{ id: string; type: string; amount: string; reason: string | null; createdAt: DateTime }>
  >(charge, 'adjustments')
  return {
    id: charge.id,
    unit: unitRef(loaded<Unit>(charge, 'unit')),
    concept: concept ? { id: concept.id, name: concept.name, type: concept.type } : null,
    period: date(charge.period),
    description: charge.description,
    amount: money(charge.amount),
    balance: money(charge.balance),
    dueOn: date(charge.dueOn),
    status: charge.status,
    sourceType: charge.sourceType,
    discountUntil: date(charge.discountUntil),
    discountAmount: money(charge.discountAmount),
    cancellationReason: charge.cancellationReason,
    cancelledAt: stamp(charge.cancelledAt),
    adjustments: adjustments?.map((adjustment) => ({
      id: adjustment.id,
      type: adjustment.type,
      amount: money(adjustment.amount),
      reason: adjustment.reason,
      createdAt: stamp(adjustment.createdAt),
    })),
    createdAt: stamp(charge.createdAt),
  }
}

export function serializeRecurring(fee: RecurringCharge) {
  const concept = loaded<ChargeConcept>(fee, 'chargeConcept')
  return {
    id: fee.id,
    unit: unitRef(loaded<Unit>(fee, 'unit')),
    concept: concept ? { id: concept.id, name: concept.name, type: concept.type } : null,
    amount: money(fee.amount),
    description: fee.description,
    startsOn: date(fee.startsOn),
    endsOn: date(fee.endsOn),
    feeScheduleId: fee.feeScheduleId,
  }
}

export function serializeFeeSchedule(schedule: FeeSchedule) {
  const concept = loaded<ChargeConcept>(schedule, 'chargeConcept')
  return {
    id: schedule.id,
    concept: concept ? { id: concept.id, name: concept.name, type: concept.type } : null,
    method: schedule.method,
    monthlyTotal: money(schedule.monthlyTotal),
    parameters: schedule.parameters,
    effectiveFrom: date(schedule.effectiveFrom),
    budgetId: schedule.budgetId,
    totalAmount: money(schedule.totalAmount),
    unitsCount: schedule.unitsCount,
    createdAt: stamp(schedule.createdAt),
  }
}

export function serializeModule(module: ContributionModule) {
  const units = loaded<Array<{ unitId: string; share: string; unit?: Unit }>>(module, 'units')
  return {
    id: module.id,
    name: module.name,
    description: module.description,
    units: units?.map((member) => ({
      unitId: member.unitId,
      share: member.share,
      unit: unitRef(member.unit),
    })),
    unitsCount: units?.length ?? Number(module.$extras.units_count ?? 0),
  }
}

export function serializePeriod(period: BillingPeriod) {
  return {
    id: period.id,
    period: date(period.period),
    dueOn: date(period.dueOn),
    discountUntil: date(period.discountUntil),
    discountRate: period.discountRate,
    interestRate: period.interestRate,
    status: period.status,
    chargesCount: period.chargesCount,
    totalAmount: money(period.totalAmount),
    balance: period.$extras.balance === undefined ? undefined : money(period.$extras.balance),
    generatedAt: stamp(period.generatedAt),
    closedAt: stamp(period.closedAt),
  }
}

export function serializePayment(payment: Payment) {
  const cashAccount = loaded<CashAccount>(payment, 'cashAccount')
  const registeredBy = loaded<{ fullName: string } | null>(payment, 'registeredBy')
  const allocations = loaded<Array<{ amount: string; charge?: Charge }>>(payment, 'allocations')
  return {
    id: payment.id,
    number: payment.number,
    unit: unitRef(loaded<Unit>(payment, 'unit')),
    amount: money(payment.amount),
    unappliedAmount: money(payment.unappliedAmount),
    paidAt: stamp(payment.paidAt),
    method: payment.method,
    reference: payment.reference,
    notes: payment.notes,
    status: payment.status,
    cashAccount: cashAccount ? { id: cashAccount.id, name: cashAccount.name } : null,
    registeredBy: registeredBy?.fullName ?? null,
    rejectionReason: payment.rejectionReason,
    reversalReason: payment.reversalReason,
    reviewedAt: stamp(payment.reviewedAt),
    reversedAt: stamp(payment.reversedAt),
    allocations: allocations?.map((allocation) => ({
      amount: money(allocation.amount),
      charge: allocation.charge ? serializeCharge(allocation.charge) : null,
    })),
    createdAt: stamp(payment.createdAt),
  }
}

export function serializeVendor(vendor: Vendor) {
  return {
    id: vendor.id,
    name: vendor.name,
    documentType: vendor.documentType,
    documentNumber: vendor.documentNumber,
    contactName: vendor.contactName,
    email: vendor.email,
    phone: vendor.phone,
    address: vendor.address,
    bankName: vendor.bankName,
    bankAccountKind: vendor.bankAccountKind,
    bankAccountNumber: vendor.bankAccountNumber,
    defaultAccount: accountRef(loaded<LedgerAccount>(vendor, 'defaultAccount')),
    notes: vendor.notes,
    isActive: vendor.isActive,
    balance: vendor.$extras.balance === undefined ? undefined : money(vendor.$extras.balance),
  }
}

export function serializeBill(bill: Bill) {
  const vendor = loaded<Vendor>(bill, 'vendor')
  const lines = loaded<
    Array<{ id: string; description: string | null; amount: string; account?: LedgerAccount }>
  >(bill, 'lines')
  const allocations = loaded<Array<{ amount: string; vendorPayment?: VendorPayment }>>(
    bill,
    'allocations'
  )
  return {
    id: bill.id,
    vendor: vendor
      ? { id: vendor.id, name: vendor.name, documentNumber: vendor.documentNumber }
      : null,
    number: bill.number,
    issuedOn: date(bill.issuedOn),
    dueOn: date(bill.dueOn),
    description: bill.description,
    subtotal: money(bill.subtotal),
    taxAmount: money(bill.taxAmount),
    withholdingIncomeTax: money(bill.withholdingIncomeTax),
    withholdingVat: money(bill.withholdingVat),
    withholdingIca: money(bill.withholdingIca),
    total: money(bill.total),
    netAmount: money(bill.netAmount),
    balance: money(bill.balance),
    status: bill.status,
    cancellationReason: bill.cancellationReason,
    lines: lines?.map((line) => ({
      id: line.id,
      description: line.description,
      amount: money(line.amount),
      account: accountRef(line.account),
    })),
    payments: allocations?.map((allocation) => ({
      amount: money(allocation.amount),
      payment: allocation.vendorPayment
        ? {
            id: allocation.vendorPayment.id,
            number: allocation.vendorPayment.number,
            paidOn: date(allocation.vendorPayment.paidOn),
            status: allocation.vendorPayment.status,
          }
        : null,
    })),
    createdAt: stamp(bill.createdAt),
  }
}

export function serializeVendorPayment(payment: VendorPayment) {
  const vendor = loaded<Vendor>(payment, 'vendor')
  const cashAccount = loaded<CashAccount>(payment, 'cashAccount')
  const allocations = loaded<Array<{ amount: string; bill?: Bill }>>(payment, 'allocations')
  return {
    id: payment.id,
    number: payment.number,
    vendor: vendor
      ? { id: vendor.id, name: vendor.name, documentNumber: vendor.documentNumber }
      : null,
    cashAccount: cashAccount ? { id: cashAccount.id, name: cashAccount.name } : null,
    paidOn: date(payment.paidOn),
    amount: money(payment.amount),
    method: payment.method,
    reference: payment.reference,
    notes: payment.notes,
    status: payment.status,
    reversalReason: payment.reversalReason,
    bills: allocations?.map((allocation) => ({
      amount: money(allocation.amount),
      bill: allocation.bill
        ? {
            id: allocation.bill.id,
            number: allocation.bill.number,
            description: allocation.bill.description,
          }
        : null,
    })),
    createdAt: stamp(payment.createdAt),
  }
}

export function serializeBudget(budget: Budget) {
  const items = loaded<
    Array<{
      id: string
      accountId: string
      description: string | null
      annualAmount: string
      account?: LedgerAccount
    }>
  >(budget, 'items')
  return {
    id: budget.id,
    year: budget.year,
    name: budget.name,
    status: budget.status,
    reserveFundRate: budget.reserveFundRate,
    approvedOn: date(budget.approvedOn),
    approvalReference: budget.approvalReference,
    notes: budget.notes,
    items: items?.map((item) => ({
      id: item.id,
      accountId: item.accountId,
      account: accountRef(item.account),
      description: item.description,
      annualAmount: money(item.annualAmount),
    })),
    totals:
      budget.$extras.income === undefined
        ? undefined
        : { income: money(budget.$extras.income), expense: money(budget.$extras.expense) },
  }
}

export function serializeEntry(entry: JournalEntry) {
  const lines = loaded<
    Array<{
      id: string
      debit: string
      credit: string
      description: string | null
      account?: LedgerAccount
      unit?: Unit | null
      vendor?: Vendor | null
    }>
  >(entry, 'lines')
  const createdBy = loaded<{ fullName: string } | null>(entry, 'createdBy')
  return {
    id: entry.id,
    number: entry.number,
    date: date(entry.date),
    type: entry.type,
    description: entry.description,
    sourceType: entry.sourceType,
    sourceId: entry.sourceId,
    total: money(entry.total),
    reversesEntryId: entry.reversesEntryId,
    reversedByEntryId: entry.reversedByEntryId,
    createdBy: createdBy?.fullName ?? null,
    createdAt: stamp(entry.createdAt),
    lines: lines?.map((line) => ({
      id: line.id,
      account: accountRef(line.account),
      debit: money(line.debit),
      credit: money(line.credit),
      description: line.description,
      thirdParty: line.unit
        ? { type: 'unit' as const, id: line.unit.id, name: `Unidad ${line.unit.code}` }
        : line.vendor
          ? { type: 'vendor' as const, id: line.vendor.id, name: line.vendor.name }
          : null,
    })),
  }
}

/** Lucid paginator → ApiPaginated */
export function paginated<T, R>(page: { all(): T[]; getMeta(): any }, map: (row: T) => R) {
  const meta = page.getMeta()
  return {
    data: page.all().map(map),
    metadata: {
      total: Number(meta.total),
      perPage: Number(meta.perPage),
      currentPage: Number(meta.currentPage),
      lastPage: Number(meta.lastPage),
      firstPage: Number(meta.firstPage),
    },
  }
}
