/**
 * Contracts of the finance endpoints (/api/v1/finance/*, /api/v1/resident/…).
 * Amounts are decimal strings ("350000.00"), dates ISO ("2026-11-10").
 */

import type { Attachment } from './files.js'
import type {
  AccountClass,
  BankAccountKind,
  BillStatus,
  BillingPeriodStatus,
  BudgetStatus,
  CashAccountType,
  ChargeAdjustmentType,
  ChargeConceptType,
  ChargeSource,
  ChargeStatus,
  DocumentType,
  FeeMethod,
  JournalEntryType,
  PaymentMethod,
  BankLineStatus,
  PaymentStatus,
  RoundingMode,
  UnitType,
  VendorPaymentStatus,
} from './domain.js'
import type { FinanceSettings } from './finance.js'

export type FinanceUnitRef = { id: string; code: string; type: UnitType; building: string | null }
export type AccountRef = { id: string; code: string; name: string }
export type ConceptRef = { id: string; name: string; type: ChargeConceptType }

export type FinanceSettingsResponse = FinanceSettings & { today: string }

export type LedgerAccount = AccountRef & {
  class: AccountClass
  nature: 'debit' | 'credit'
  isPostable: boolean
  isActive: boolean
  systemKey: string | null
}

export type ChargeConcept = {
  id: string
  code: string | null
  name: string
  type: ChargeConceptType
  defaultAmount: string | null
  accruesInterest: boolean
  allowsEarlyDiscount: boolean
  isActive: boolean
  isSystem: boolean
  receivableAccount: AccountRef | null
  incomeAccount: AccountRef | null
}

export type ChargeConceptInput = {
  name: string
  type: ChargeConceptType
  defaultAmount?: number | null
  accruesInterest: boolean
  allowsEarlyDiscount: boolean
  receivableAccountId?: string
  incomeAccountId?: string
  isActive?: boolean
}

export type CashAccount = {
  id: string
  name: string
  type: CashAccountType
  bankName: string | null
  accountKind: BankAccountKind | null
  accountNumber: string | null
  isActive: boolean
  ledgerAccount: AccountRef | null
  balance: string | null
}

export type CashAccountInput = {
  name: string
  type: CashAccountType
  bankName?: string | null
  accountKind?: BankAccountKind | null
  accountNumber?: string | null
  openingBalance?: number
  openingDate?: string
}

export type ChargeAdjustment = {
  id: string
  type: ChargeAdjustmentType
  amount: string
  reason: string | null
  createdAt: string
}

export type FinanceCharge = {
  id: string
  unit: FinanceUnitRef | null
  concept: ConceptRef | null
  period: string
  description: string | null
  amount: string
  balance: string
  dueOn: string
  status: ChargeStatus
  sourceType: ChargeSource | null
  discountUntil: string | null
  discountAmount: string
  cancellationReason: string | null
  cancelledAt: string | null
  adjustments?: ChargeAdjustment[]
  createdAt: string
}

export type FinanceChargeDetail = FinanceCharge & {
  payments: Array<{ id: string; number: number | null; paidAt: string; method: PaymentMethod; amount: string }>
}

export type ChargeFilters = {
  page?: number
  perPage?: number
  unitId?: string
  conceptId?: string
  billingPeriodId?: string
  status?: ChargeStatus | 'open' | 'overdue' | ''
  period?: string
  search?: string
}

export type NewChargesInput = {
  unitIds: string[]
  conceptId: string
  amount: number
  period?: string
  dueOn: string
  description?: string | null
}

export type BillingPeriod = {
  id: string
  period: string
  dueOn: string
  discountUntil: string | null
  discountRate: string | null
  interestRate: string | null
  status: BillingPeriodStatus
  chargesCount: number
  totalAmount: string
  balance?: string
  generatedAt: string | null
  closedAt: string | null
}

export type ConceptTotal = { conceptId: string; name: string; count: number; total: string; balance?: string }

export type BillingPeriodDetail = BillingPeriod & { concepts: ConceptTotal[] }

export type BillingPreview = {
  period: string
  dueOn: string
  discountUntil: string | null
  discountRate: number | null
  interestRate: number | null
  existing: BillingPeriod | null
  concepts: ConceptTotal[]
  lines: Array<{
    unitId: string
    unitCode: string
    conceptId: string
    conceptName: string
    description: string | null
    kind: 'recurring' | 'interest' | 'parking'
    amount: string
    discountAmount: string
  }>
  count: number
  total: string
  reserveFund: string
  warnings: string[]
}

export type BillingResult = {
  period: BillingPeriod
  created: number
  total: string
  reserveFund: string
  warnings: string[]
}

export type RecurringCharge = {
  id: string
  unit: FinanceUnitRef | null
  concept: ConceptRef | null
  amount: string
  description: string | null
  startsOn: string
  endsOn: string | null
  feeScheduleId: string | null
}

export type RecurringChargeInput = {
  unitId: string
  conceptId: string
  amount: number
  description?: string | null
  startsOn: string
  endsOn?: string | null
}

export type FeeScheduleInput = {
  conceptId: string
  method: FeeMethod
  effectiveFrom: string
  monthlyTotal?: number | null
  budgetId?: string | null
  unitTypes?: UnitType[]
  mergeAnnexes?: boolean
  rounding: number
  roundingMode: RoundingMode
  amountsByType?: Partial<Record<UnitType, number>>
  modules?: Array<{ moduleId: string; monthlyTotal: number }>
}

export type FeePreview = {
  monthlyTotal: string | null
  budgetBase: { expenses: string; reserve: string; otherIncome: string; monthly: string } | null
  rows: Array<{
    unitId: string
    code: string
    type: UnitType
    building: string | null
    basis: string | null
    includes: string[]
    current: string | null
    amount: string
  }>
  total: string
  currentTotal: string
  roundingDifference: string
  warnings: string[]
}

export type FeeSchedule = {
  id: string
  concept: ConceptRef | null
  method: FeeMethod
  monthlyTotal: string | null
  parameters: Record<string, unknown>
  effectiveFrom: string
  budgetId: string | null
  totalAmount: string
  unitsCount: number
  createdAt: string
}

export type ContributionModule = {
  id: string
  name: string
  description: string | null
  units?: Array<{ unitId: string; share: string; unit: FinanceUnitRef | null }>
  unitsCount: number
}

export type ContributionModuleInput = {
  name: string
  description?: string | null
  units: Array<{ unitId: string; share: number }>
}

export type FinancePayment = {
  id: string
  number: number | null
  unit: FinanceUnitRef | null
  amount: string
  unappliedAmount: string
  paidAt: string
  method: PaymentMethod
  reference: string | null
  notes: string | null
  status: PaymentStatus
  cashAccount: { id: string; name: string } | null
  registeredBy: string | null
  rejectionReason: string | null
  reversalReason: string | null
  reviewedAt: string | null
  reversedAt: string | null
  allocations?: Array<{ amount: string; charge: FinanceCharge | null }>
  createdAt: string
}

/** Paz y salvo de una unidad (docs/finance.md §5) */
export type ClearanceCertificate = {
  id: string
  number: number
  unit: FinanceUnitRef | null
  asOf: string
  validUntil: string
  code: string
  holderName: string | null
  /** Cobros facturados que aún no vencían al expedirlo (no los cubre) */
  upcomingAmount: string
  issuedBy: string | null
  createdAt: string
}

/** Si la unidad puede recibir paz y salvo hoy y, si no, cuánto debe */
export type ClearanceStatus = {
  eligible: boolean
  /** Saldo vencido (cobros con vencimiento hasta hoy) */
  overdue: string
  /** Cobros facturados que aún no vencen */
  upcoming: string
  certificates: ClearanceCertificate[]
}

/** El residente: además, si puede pedirlo (propietario, arrendatario o contacto principal) */
export type ResidentClearanceStatus = ClearanceStatus & { canIssue: boolean }

/** Verificación pública de un paz y salvo */
export type ClearanceVerification = {
  number: number
  tenant: string
  unit: string
  holderName: string | null
  asOf: string
  validUntil: string
  issuedAt: string
  current: boolean
}

// ---------------------------------------------------------------- conciliación bancaria

/** Columnas del extracto que el sistema necesita, con el índice de la columna del archivo */
export type BankColumnMapping = {
  headerRow: number
  date: number
  description: number | null
  reference: number | null
  /** Una sola columna con valores positivos (entradas) y negativos (salidas)… */
  amount: number | null
  /** …o dos columnas: créditos (entradas) y débitos (salidas) */
  credit: number | null
  debit: number | null
  dateFormat: BankDateFormat
}

export type BankDateFormat = 'dmy' | 'ymd' | 'mdy'

/** Lo que se ve del archivo antes de importarlo */
export type BankStatementPreview = {
  rows: string[][]
  mapping: BankColumnMapping
  /** Movimientos que se leerían con esa configuración */
  sample: Array<{ postedOn: string; description: string; reference: string | null; amount: string }>
  total: number
  errors: Array<{ line: number; message: string }>
}

export type BankStatement = {
  id: string
  cashAccount: { id: string; name: string } | null
  fileName: string
  startsOn: string
  endsOn: string
  linesCount: number
  duplicatesCount: number
  pending: number
  reconciled: number
  ignored: number
  importedBy: string | null
  createdAt: string
}

export type BankLineSuggestion =
  | {
      action: 'link'
      confidence: 'high' | 'medium'
      reason: string
      payment: { id: string; number: number | null; unit: string | null; paidAt: string; amount: string; reference: string | null }
    }
  | {
      action: 'confirm'
      confidence: 'high' | 'medium'
      reason: string
      payment: { id: string; number: number | null; unit: string | null; paidAt: string; amount: string; reference: string | null }
    }
  | {
      action: 'register'
      confidence: 'high' | 'medium'
      reason: string
      unit: FinanceUnitRef
    }
  | {
      action: 'link_vendor_payment'
      confidence: 'high' | 'medium'
      reason: string
      vendorPayment: { id: string; number: number; vendor: string | null; paidOn: string; amount: string }
    }

export type BankStatementLine = {
  id: string
  line: number
  postedOn: string
  description: string
  reference: string | null
  amount: string
  status: BankLineStatus
  note: string | null
  payment: { id: string; number: number | null; unit: string | null; status: PaymentStatus } | null
  vendorPayment: { id: string; number: number; vendor: string | null } | null
  reconciledBy: string | null
  reconciledAt: string | null
  suggestion: BankLineSuggestion | null
}

export type BankStatementDetail = BankStatement & { lines: BankStatementLine[] }

export type ReconcileLineInput =
  | { action: 'link'; paymentId: string }
  | { action: 'confirm'; paymentId: string }
  | { action: 'register'; unitId: string; method?: PaymentMethod; notes?: string | null }
  | { action: 'link_vendor_payment'; vendorPaymentId: string }
  | { action: 'ignore'; note: string }

export type ResidentPayment = Omit<FinancePayment, 'registeredBy' | 'cashAccount'> & {
  /** Comprobantes adjuntos al pago */
  attachments: Attachment[]
  /** Lo reportó este residente y sigue por revisar: puede adjuntar y quitar comprobantes */
  canAttach: boolean
}

export type PaymentFilters = {
  page?: number
  perPage?: number
  status?: PaymentStatus | ''
  unitId?: string
  from?: string
  to?: string
  search?: string
}

export type RegisterPaymentInput = {
  unitId: string
  amount: number
  paidOn: string
  method: PaymentMethod
  reference?: string | null
  notes?: string | null
  cashAccountId: string
  allocations?: Array<{ chargeId: string; amount: number }>
}

export type ReportPaymentInput = {
  amount: number
  paidOn: string
  method: PaymentMethod
  reference?: string | null
  notes?: string | null
}

export type Vendor = {
  id: string
  name: string
  documentType: DocumentType | null
  documentNumber: string | null
  contactName: string | null
  email: string | null
  phone: string | null
  address: string | null
  bankName: string | null
  bankAccountKind: BankAccountKind | null
  bankAccountNumber: string | null
  defaultAccount: AccountRef | null
  notes: string | null
  isActive: boolean
  balance?: string
}

export type VendorInput = Partial<Omit<Vendor, 'id' | 'defaultAccount' | 'balance'>> & {
  name: string
  defaultAccountId?: string | null
}

export type VendorRef = { id: string; name: string; documentNumber: string | null }

export type Bill = {
  id: string
  vendor: VendorRef | null
  number: string | null
  issuedOn: string
  dueOn: string
  description: string
  subtotal: string
  taxAmount: string
  withholdingIncomeTax: string
  withholdingVat: string
  withholdingIca: string
  total: string
  netAmount: string
  balance: string
  status: BillStatus
  cancellationReason: string | null
  lines?: Array<{ id: string; description: string | null; amount: string; account: AccountRef | null }>
  payments?: Array<{
    amount: string
    payment: { id: string; number: number; paidOn: string; status: VendorPaymentStatus } | null
  }>
  createdAt: string
}

export type BillInput = {
  vendorId: string
  number?: string | null
  issuedOn: string
  dueOn: string
  description: string
  lines: Array<{ accountId: string; description?: string | null; amount: number }>
  taxAmount?: number
  withholdingIncomeTax?: number
  withholdingVat?: number
  withholdingIca?: number
  payNow?: { cashAccountId: string; paidOn: string; method: PaymentMethod; reference?: string | null } | null
}

export type VendorPayment = {
  id: string
  number: number
  vendor: VendorRef | null
  cashAccount: { id: string; name: string } | null
  paidOn: string
  amount: string
  method: PaymentMethod
  reference: string | null
  notes: string | null
  status: VendorPaymentStatus
  reversalReason: string | null
  bills?: Array<{ amount: string; bill: { id: string; number: string | null; description: string } | null }>
  createdAt: string
}

export type VendorPaymentInput = {
  vendorId: string
  cashAccountId: string
  paidOn: string
  method: PaymentMethod
  reference?: string | null
  notes?: string | null
  amount?: number
  allocations?: Array<{ billId: string; amount: number }>
}

export type Budget = {
  id: string
  year: number
  name: string
  status: BudgetStatus
  reserveFundRate: string
  approvedOn: string | null
  approvalReference: string | null
  notes: string | null
  items?: Array<{ id: string; accountId: string; account: AccountRef | null; description: string | null; annualAmount: string }>
  totals?: { income: string; expense: string }
}

export type BudgetExecutionRow = {
  accountId: string
  code: string
  name: string
  itemId: string | null
  description: string | null
  budgeted: string
  toDate: string
  actual: string
  variance: string
  execution: number | null
}

export type BudgetExecutionTotals = {
  budgeted: string
  toDate: string
  actual: string
  variance: string
  execution: number | null
}

export type BudgetDetail = Budget & {
  monthlyBase: { expenses: string; reserve: string; otherIncome: string; monthly: string }
  execution: {
    asOf: string
    monthsElapsed: number
    income: { rows: BudgetExecutionRow[]; totals: BudgetExecutionTotals }
    expense: { rows: BudgetExecutionRow[]; totals: BudgetExecutionTotals }
  }
}

export type BudgetInput = {
  year: number
  name: string
  reserveFundRate: number
  notes?: string | null
  items: Array<{ accountId: string; description?: string | null; annualAmount: number }>
}

export type JournalEntry = {
  id: string
  number: number
  date: string
  type: JournalEntryType
  description: string
  sourceType: string | null
  sourceId: string | null
  total: string
  reversesEntryId: string | null
  reversedByEntryId: string | null
  createdBy: string | null
  createdAt: string
  lines?: Array<{
    id: string
    account: AccountRef | null
    debit: string
    credit: string
    description: string | null
    thirdParty: { type: 'unit' | 'vendor'; id: string; name: string } | null
  }>
}

export type ManualEntryInput = {
  date: string
  description: string
  lines: Array<{
    accountId: string
    debit?: number
    credit?: number
    unitId?: string | null
    vendorId?: string | null
    description?: string | null
  }>
}

export type BalanceRow = {
  accountId: string
  code: string
  name: string
  class: AccountClass
  level: number
  isPostable: boolean
  opening: string
  debit: string
  credit: string
  closing: string
}

export type TrialBalance = {
  from: string
  to: string
  rows: BalanceRow[]
  totals: { debit: string; credit: string }
}

export type StatementSection = {
  rows: Array<{ accountId: string; code: string; name: string; level: number; amount: string }>
  total: string
}

export type IncomeStatement = {
  from: string
  to: string
  income: StatementSection
  expense: StatementSection
  result: string
}

export type BalanceSheet = {
  asOf: string
  assets: StatementSection
  liabilities: StatementSection
  equity: StatementSection
  result: string
  totalLiabilitiesAndEquity: string
}

export type LedgerReport = {
  account: { id: string; code: string; name: string; class: AccountClass }
  from: string
  to: string
  opening: string
  debit: string
  credit: string
  closing: string
  truncated: boolean
  rows: Array<{
    id: string
    entryId: string
    number: number
    date: string
    type: JournalEntryType
    description: string
    entryDescription: string
    accountCode: string
    accountName: string
    thirdParty: string | null
    debit: string
    credit: string
    balance: string
  }>
}

export type UnitStatement = {
  from: string | null
  to: string
  opening: string
  closing: string
  rows: Array<{
    entryId: string
    number: number
    date: string
    type: JournalEntryType
    description: string
    details: string[]
    charge: string
    payment: string
    balance: string
  }>
  openCharges: FinanceCharge[]
  debt: string
  overdue: string
  credit: string
  toPay: string
  availableDiscount: string
}

export type BackofficeUnitStatement = UnitStatement & { unit: FinanceUnitRef }

export type ReceivablesAging = {
  asOf: string
  rows: Array<{
    unitId: string
    code: string
    type: UnitType
    building: string | null
    oldestDue: string | null
    current: string
    d30: string
    d60: string
    d90: string
    over90: string
    total: string
    credit: string
  }>
  totals: { current: string; d30: string; d60: string; d90: string; over90: string; total: string; credit: string }
  unitsInArrears: number
}

export type PayablesAging = {
  asOf: string
  rows: Array<{
    vendorId: string
    name: string
    documentNumber: string | null
    bills: number
    current: string
    d30: string
    d60: string
    over60: string
    total: string
  }>
  totals: { current: string; d30: string; d60: string; over60: string; total: string }
}

export type FinanceSummary = {
  month: string
  billed: string
  collected: string
  paymentsCount: number
  expenses: string
  pendingReview: { count: number; amount: string }
  cash: { total: string; accounts: Array<{ id: string; balance: string }> }
  receivables: { total: string; overdue: string; credit: string; unitsInArrears: number }
  payables: { total: string; overdue: string; dueSoon: number }
  trend: Array<{ month: string; billed: string; collected: string; expenses: string }>
}
