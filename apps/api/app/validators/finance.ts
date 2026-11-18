import vine from '@vinejs/vine'
import {
  ACCOUNT_CLASSES,
  BANK_ACCOUNT_KINDS,
  BILL_STATUSES,
  CASH_ACCOUNT_TYPES,
  CHARGE_CONCEPT_TYPES,
  CHARGE_STATUSES,
  DOCUMENT_TYPES,
  FEE_METHODS,
  JOURNAL_ENTRY_TYPES,
  PAYMENT_APPLICATION_ORDERS,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  ROUNDING_MODES,
  ROUNDING_STEPS,
  UNIT_TYPES,
  VENDOR_PAYMENT_STATUSES,
} from '@aptoph/shared'

/** Pesos with up to two decimals; services work in cents */
const money = () => vine.number().decimal([0, 2]).min(0.01).max(99_999_999_999)
const moneyOrZero = () => vine.number().decimal([0, 2]).min(0).max(99_999_999_999)
const isoDate = () => vine.string().regex(/^\d{4}-\d{2}-\d{2}$/)
/** "2026-11" or "2026-11-01" */
const period = () => vine.string().regex(/^\d{4}-(0[1-9]|1[0-2])(-01)?$/)
const reason = () => vine.string().trim().minLength(3).maxLength(255)
const text = (max = 255) => vine.string().trim().maxLength(max)

const pageFields = {
  page: vine.number().withoutDecimals().min(1).optional(),
  perPage: vine.number().withoutDecimals().min(1).max(200).optional(),
}

export const reasonValidator = vine.create({ reason: reason() })

export const financeSettingsValidator = vine.create({
  dueDay: vine.number().withoutDecimals().min(1).max(28),
  lateInterest: vine.object({
    enabled: vine.boolean(),
    monthlyRate: vine.number().decimal([0, 4]).min(0).max(5),
  }),
  earlyDiscount: vine.object({
    enabled: vine.boolean(),
    rate: vine.number().decimal([0, 2]).min(0).max(50),
    day: vine.number().withoutDecimals().min(1).max(28),
  }),
  rounding: vine.number().in([...ROUNDING_STEPS]),
  roundingMode: vine.enum(ROUNDING_MODES),
  applicationOrder: vine.enum(PAYMENT_APPLICATION_ORDERS),
  lockedUntil: isoDate().nullable(),
})

// Concepts and accounts

export const conceptValidator = vine.create({
  name: vine.string().trim().minLength(2).maxLength(80),
  type: vine.enum(CHARGE_CONCEPT_TYPES),
  defaultAmount: moneyOrZero().nullable().optional(),
  accruesInterest: vine.boolean(),
  allowsEarlyDiscount: vine.boolean(),
  receivableAccountId: vine.string().uuid().optional(),
  incomeAccountId: vine.string().uuid().optional(),
  isActive: vine.boolean().optional(),
})

export const ledgerAccountValidator = vine.create({
  code: vine.string().regex(/^\d{6,10}$/),
  name: vine.string().trim().minLength(2).maxLength(120),
})

export const updateLedgerAccountValidator = vine.create({
  name: vine.string().trim().minLength(2).maxLength(120).optional(),
  isActive: vine.boolean().optional(),
})

export const listAccountsValidator = vine.create({
  class: vine.enum(ACCOUNT_CLASSES).optional(),
  postable: vine.boolean().optional(),
})

// Banks and cash

export const cashAccountValidator = vine.create({
  name: vine.string().trim().minLength(2).maxLength(80),
  type: vine.enum(CASH_ACCOUNT_TYPES),
  bankName: text(80).nullable().optional(),
  accountKind: vine.enum(BANK_ACCOUNT_KINDS).nullable().optional(),
  accountNumber: text(40).nullable().optional(),
  openingBalance: moneyOrZero().optional(),
  openingDate: isoDate().optional(),
})

export const updateCashAccountValidator = vine.create({
  name: vine.string().trim().minLength(2).maxLength(80).optional(),
  bankName: text(80).nullable().optional(),
  accountNumber: text(40).nullable().optional(),
  isActive: vine.boolean().optional(),
})

export const transferValidator = vine.create({
  fromId: vine.string().uuid(),
  toId: vine.string().uuid(),
  amount: money(),
  date: isoDate(),
  description: text().nullable().optional(),
})

// Billing

export const periodValidator = vine.create({ period: period() })

export const listChargesValidator = vine.create({
  ...pageFields,
  unitId: vine.string().uuid().optional(),
  conceptId: vine.string().uuid().optional(),
  billingPeriodId: vine.string().uuid().optional(),
  status: vine.enum([...CHARGE_STATUSES, 'open', 'overdue'] as const).optional(),
  period: period().optional(),
  search: text(40).optional(),
})

export const createChargeValidator = vine.create({
  unitIds: vine.array(vine.string().uuid()).minLength(1).maxLength(2000),
  conceptId: vine.string().uuid(),
  amount: money(),
  period: period().optional(),
  dueOn: isoDate(),
  description: text().nullable().optional(),
})

export const creditNoteValidator = vine.create({ amount: money(), reason: reason() })

export const listRecurringValidator = vine.create({
  ...pageFields,
  conceptId: vine.string().uuid().optional(),
  unitId: vine.string().uuid().optional(),
  /** Fees in effect that month (default: this month) */
  period: period().optional(),
  search: text(40).optional(),
})

export const recurringChargeValidator = vine.create({
  unitId: vine.string().uuid(),
  conceptId: vine.string().uuid(),
  amount: money(),
  description: text().nullable().optional(),
  startsOn: period(),
  endsOn: period().nullable().optional(),
})

export const endRecurringValidator = vine.create({ endsOn: period() })

export const feeScheduleValidator = vine.create({
  conceptId: vine.string().uuid(),
  method: vine.enum(FEE_METHODS),
  effectiveFrom: period(),
  monthlyTotal: money().nullable().optional(),
  budgetId: vine.string().uuid().nullable().optional(),
  unitTypes: vine.array(vine.enum(UNIT_TYPES)).optional(),
  mergeAnnexes: vine.boolean().optional(),
  rounding: vine.number().in([...ROUNDING_STEPS]),
  roundingMode: vine.enum(ROUNDING_MODES),
  amountsByType: vine.record(moneyOrZero()).optional(),
  modules: vine
    .array(vine.object({ moduleId: vine.string().uuid(), monthlyTotal: money() }))
    .optional(),
})

export const contributionModuleValidator = vine.create({
  name: vine.string().trim().minLength(2).maxLength(80),
  description: text().nullable().optional(),
  units: vine
    .array(
      vine.object({
        unitId: vine.string().uuid(),
        share: vine.number().decimal([0, 6]).min(0.000001).max(1_000_000),
      })
    )
    .minLength(1)
    .maxLength(5000),
})

// Payments

export const listPaymentsValidator = vine.create({
  ...pageFields,
  status: vine.enum(PAYMENT_STATUSES).optional(),
  unitId: vine.string().uuid().optional(),
  from: isoDate().optional(),
  to: isoDate().optional(),
  search: text(40).optional(),
})

export const registerPaymentValidator = vine.create({
  unitId: vine.string().uuid(),
  amount: money(),
  paidOn: isoDate(),
  method: vine.enum(PAYMENT_METHODS),
  reference: text(80).nullable().optional(),
  notes: text(500).nullable().optional(),
  cashAccountId: vine.string().uuid(),
  allocations: vine
    .array(vine.object({ chargeId: vine.string().uuid(), amount: money() }))
    .optional(),
})

export const confirmPaymentValidator = vine.create({ cashAccountId: vine.string().uuid() })

export const reportPaymentValidator = vine.create({
  amount: money(),
  paidOn: isoDate(),
  method: vine.enum(PAYMENT_METHODS),
  reference: text(80).nullable().optional(),
  notes: text(500).nullable().optional(),
})

// Payables

export const vendorValidator = vine.create({
  name: vine.string().trim().minLength(2).maxLength(120),
  documentType: vine.enum(DOCUMENT_TYPES).nullable().optional(),
  documentNumber: text(30).nullable().optional(),
  contactName: text(120).nullable().optional(),
  email: vine.string().trim().email().maxLength(254).nullable().optional(),
  phone: text(30).nullable().optional(),
  address: text(200).nullable().optional(),
  bankName: text(80).nullable().optional(),
  bankAccountKind: vine.enum(BANK_ACCOUNT_KINDS).nullable().optional(),
  bankAccountNumber: text(40).nullable().optional(),
  defaultAccountId: vine.string().uuid().nullable().optional(),
  notes: text(1000).nullable().optional(),
  isActive: vine.boolean().optional(),
})

export const listVendorsValidator = vine.create({
  search: text(60).optional(),
  active: vine.boolean().optional(),
})

export const listBillsValidator = vine.create({
  ...pageFields,
  status: vine.enum([...BILL_STATUSES, 'open'] as const).optional(),
  vendorId: vine.string().uuid().optional(),
  from: isoDate().optional(),
  to: isoDate().optional(),
})

export const billValidator = vine.create({
  vendorId: vine.string().uuid(),
  number: text(40).nullable().optional(),
  issuedOn: isoDate(),
  dueOn: isoDate(),
  description: vine.string().trim().minLength(3).maxLength(255),
  lines: vine
    .array(
      vine.object({
        accountId: vine.string().uuid(),
        description: text().nullable().optional(),
        amount: money(),
      })
    )
    .minLength(1)
    .maxLength(50),
  taxAmount: moneyOrZero().optional(),
  withholdingIncomeTax: moneyOrZero().optional(),
  withholdingVat: moneyOrZero().optional(),
  withholdingIca: moneyOrZero().optional(),
  payNow: vine
    .object({
      cashAccountId: vine.string().uuid(),
      paidOn: isoDate(),
      method: vine.enum(PAYMENT_METHODS),
      reference: text(80).nullable().optional(),
    })
    .nullable()
    .optional(),
})

export const listVendorPaymentsValidator = vine.create({
  ...pageFields,
  vendorId: vine.string().uuid().optional(),
  status: vine.enum(VENDOR_PAYMENT_STATUSES).optional(),
})

export const vendorPaymentValidator = vine.create({
  vendorId: vine.string().uuid(),
  cashAccountId: vine.string().uuid(),
  paidOn: isoDate(),
  method: vine.enum(PAYMENT_METHODS),
  reference: text(80).nullable().optional(),
  notes: text(500).nullable().optional(),
  amount: money().optional(),
  allocations: vine
    .array(vine.object({ billId: vine.string().uuid(), amount: money() }))
    .optional(),
})

// Budget

export const budgetValidator = vine.create({
  year: vine.number().withoutDecimals().min(2000).max(2100),
  name: vine.string().trim().minLength(2).maxLength(120),
  reserveFundRate: vine.number().decimal([0, 2]).min(1).max(100),
  notes: text(1000).nullable().optional(),
  items: vine
    .array(
      vine.object({
        accountId: vine.string().uuid(),
        description: text().nullable().optional(),
        annualAmount: moneyOrZero(),
      })
    )
    .maxLength(500),
})

export const approveBudgetValidator = vine.create({
  approvedOn: isoDate(),
  approvalReference: text(120).nullable().optional(),
})

// Accounting

export const listJournalValidator = vine.create({
  ...pageFields,
  from: isoDate().optional(),
  to: isoDate().optional(),
  type: vine.enum(JOURNAL_ENTRY_TYPES).optional(),
  search: text(60).optional(),
})

export const manualEntryValidator = vine.create({
  date: isoDate(),
  description: vine.string().trim().minLength(3).maxLength(255),
  lines: vine
    .array(
      vine.object({
        accountId: vine.string().uuid(),
        debit: moneyOrZero().optional(),
        credit: moneyOrZero().optional(),
        unitId: vine.string().uuid().nullable().optional(),
        vendorId: vine.string().uuid().nullable().optional(),
        description: text().nullable().optional(),
      })
    )
    .minLength(2)
    .maxLength(200),
})

export const rangeValidator = vine.create({
  from: isoDate().optional(),
  to: isoDate().optional(),
  level: vine.number().withoutDecimals().min(1).max(5).optional(),
})

export const ledgerReportValidator = vine.create({
  accountId: vine.string().uuid(),
  from: isoDate().optional(),
  to: isoDate().optional(),
  unitId: vine.string().uuid().optional(),
  vendorId: vine.string().uuid().optional(),
})

export const statementValidator = vine.create({
  from: isoDate().optional(),
  to: isoDate().optional(),
})
