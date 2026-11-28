import type {
  ApiItem,
  Attachment,
  AttachmentOwnerType,
  ApiPaginated,
  BackofficeUnitStatement,
  BalanceSheet,
  Bill,
  BillInput,
  BillingPeriod,
  BillingPeriodDetail,
  BillingPreview,
  BillingResult,
  Budget,
  BudgetDetail,
  BudgetInput,
  CashAccount,
  CashAccountInput,
  ChargeConcept,
  ChargeConceptInput,
  ChargeFilters,
  ContributionModule,
  ContributionModuleInput,
  FeePreview,
  FeeSchedule,
  FeeScheduleInput,
  FinanceCharge,
  FinanceChargeDetail,
  FinancePayment,
  FinanceSettings,
  FinanceSettingsResponse,
  FinanceSummary,
  IncomeStatement,
  JournalEntry,
  JournalEntryType,
  LedgerAccount,
  LedgerReport,
  ManualEntryInput,
  NewChargesInput,
  PayablesAging,
  PaymentFilters,
  ReceivablesAging,
  RecurringCharge,
  RecurringChargeInput,
  RegisterPaymentInput,
  TrialBalance,
  Vendor,
  VendorInput,
  VendorPayment,
  VendorPaymentInput,
  BillStatus,
  VendorPaymentStatus,
  BankColumnMapping,
  BankStatement,
  BankStatementDetail,
  BankStatementLine,
  BankStatementPreview,
  ClearanceCertificate,
  ClearanceStatus,
  ReconcileLineInput,
} from '@aptoph/shared'
import { api, apiDownload } from '@/lib/http'

const base = '/api/v1/finance'
const post = <T>(path: string, body: unknown = {}) =>
  api<T>(`${base}${path}`, { method: 'POST', body })
const put = <T>(path: string, body: unknown) => api<T>(`${base}${path}`, { method: 'PUT', body })
const patch = <T>(path: string, body: unknown) =>
  api<T>(`${base}${path}`, { method: 'PATCH', body })
const get = <T>(path: string, query?: Record<string, string | number | boolean | undefined>) =>
  api<T>(`${base}${path}`, { query })

export const financeApi = {
  attachments: (ownerType: AttachmentOwnerType, ownerId: string) =>
    get<{ data: Attachment[] }>(`/attachments/${ownerType}/${ownerId}`),
  uploadAttachment: (ownerType: AttachmentOwnerType, ownerId: string, file: File) => {
    const body = new FormData()
    body.append('file', file)
    return post<ApiItem<Attachment>>(`/attachments/${ownerType}/${ownerId}`, body)
  },
  /** Signed link that expires in a few minutes */
  attachmentUrl: (id: string, download = false) =>
    get<ApiItem<{ url: string }>>(`/attachments/${id}/url`, { download }),
  removeAttachment: (id: string) => api<void>(`${base}/attachments/${id}`, { method: 'DELETE' }),

  summary: () => get<ApiItem<FinanceSummary>>('/summary'),
  settings: () => get<ApiItem<FinanceSettingsResponse>>('/settings'),
  updateSettings: (input: FinanceSettings) =>
    put<ApiItem<FinanceSettingsResponse>>('/settings', input),

  accounts: (query: { class?: string; postable?: boolean } = {}) =>
    get<{ data: LedgerAccount[] }>('/accounts', query),
  createAccount: (input: { code: string; name: string }) =>
    post<ApiItem<LedgerAccount>>('/accounts', input),
  updateAccount: (id: string, input: { name?: string; isActive?: boolean }) =>
    patch<ApiItem<LedgerAccount>>(`/accounts/${id}`, input),

  concepts: () => get<{ data: ChargeConcept[] }>('/concepts'),
  createConcept: (input: ChargeConceptInput) => post<ApiItem<ChargeConcept>>('/concepts', input),
  updateConcept: (id: string, input: ChargeConceptInput) =>
    put<ApiItem<ChargeConcept>>(`/concepts/${id}`, input),

  cashAccounts: () => get<{ data: CashAccount[] }>('/cash-accounts'),
  createCashAccount: (input: CashAccountInput) =>
    post<ApiItem<CashAccount>>('/cash-accounts', input),
  updateCashAccount: (id: string, input: Partial<CashAccountInput> & { isActive?: boolean }) =>
    patch<ApiItem<CashAccount>>(`/cash-accounts/${id}`, input),
  transfer: (input: {
    fromId: string
    toId: string
    amount: number
    date: string
    description?: string | null
  }) => post<ApiItem<{ entryId: string; number: number }>>('/transfers', input),

  periods: () => get<{ data: BillingPeriod[] }>('/periods'),
  period: (id: string) => get<ApiItem<BillingPeriodDetail>>(`/periods/${id}`),
  previewPeriod: (period: string) => get<ApiItem<BillingPreview>>('/periods/preview', { period }),
  generatePeriod: (period: string) => post<ApiItem<BillingResult>>('/periods/generate', { period }),
  closePeriod: (id: string) => post<ApiItem<BillingPeriod>>(`/periods/${id}/close`),
  reopenPeriod: (id: string) => post<ApiItem<BillingPeriod>>(`/periods/${id}/reopen`),

  charges: (filters: ChargeFilters) => get<ApiPaginated<FinanceCharge>>('/charges', filters),
  charge: (id: string) => get<ApiItem<FinanceChargeDetail>>(`/charges/${id}`),
  createCharges: (input: NewChargesInput) =>
    post<ApiItem<{ created: number; total: string }>>('/charges', input),
  cancelCharge: (id: string, reason: string) =>
    post<ApiItem<FinanceCharge>>(`/charges/${id}/cancel`, { reason }),
  creditNote: (id: string, amount: number, reason: string) =>
    post<ApiItem<FinanceCharge>>(`/charges/${id}/credit-note`, { amount, reason }),

  recurring: (query: {
    conceptId?: string
    unitId?: string
    period?: string
    search?: string
    page?: number
    perPage?: number
  }) =>
    get<ApiPaginated<RecurringCharge> & { period: string; total: string }>(
      '/recurring-charges',
      query,
    ),
  createRecurring: (input: RecurringChargeInput) =>
    post<ApiItem<RecurringCharge>>('/recurring-charges', input),
  endRecurring: (id: string, endsOn: string) =>
    post<ApiItem<RecurringCharge> | undefined>(`/recurring-charges/${id}/end`, { endsOn }),
  schedules: () => get<{ data: FeeSchedule[] }>('/fee-schedules'),
  previewSchedule: (input: FeeScheduleInput) =>
    post<ApiItem<FeePreview>>('/fee-schedules/preview', input),
  applySchedule: (input: FeeScheduleInput) =>
    post<ApiItem<FeePreview & { schedule: FeeSchedule }>>('/fee-schedules', input),

  modules: () => get<{ data: ContributionModule[] }>('/modules'),
  createModule: (input: ContributionModuleInput) =>
    post<ApiItem<ContributionModule>>('/modules', input),
  updateModule: (id: string, input: ContributionModuleInput) =>
    put<ApiItem<ContributionModule>>(`/modules/${id}`, input),
  removeModule: (id: string) => api<void>(`${base}/modules/${id}`, { method: 'DELETE' }),

  payments: (filters: PaymentFilters) => get<ApiPaginated<FinancePayment>>('/payments', filters),
  payment: (id: string) => get<ApiItem<FinancePayment>>(`/payments/${id}`),
  registerPayment: (input: RegisterPaymentInput) =>
    post<ApiItem<FinancePayment>>('/payments', input),
  confirmPayment: (id: string, cashAccountId: string) =>
    post<ApiItem<FinancePayment>>(`/payments/${id}/confirm`, { cashAccountId }),
  rejectPayment: (id: string, reason: string) =>
    post<ApiItem<FinancePayment>>(`/payments/${id}/reject`, { reason }),
  reversePayment: (id: string, reason: string) =>
    post<ApiItem<FinancePayment>>(`/payments/${id}/reverse`, { reason }),

  /** Recibo de caja en PDF */
  downloadReceipt: (payment: { id: string; number: number | null }) =>
    apiDownload(
      `${base}/payments/${payment.id}/receipt`,
      `recibo-de-caja-${String(payment.number ?? '').padStart(6, '0')}.pdf`,
    ),

  clearance: (unitId: string) => get<ApiItem<ClearanceStatus>>(`/units/${unitId}/clearance`),
  issueClearance: (unitId: string) =>
    post<ApiItem<ClearanceCertificate>>(`/units/${unitId}/clearances`),
  downloadClearance: (certificate: { id: string; number: number }) =>
    apiDownload(
      `${base}/clearances/${certificate.id}/pdf`,
      `paz-y-salvo-${String(certificate.number).padStart(6, '0')}.pdf`,
    ),

  bankStatements: (cashAccountId?: string) =>
    get<{ data: BankStatement[] }>('/bank-statements', { cashAccountId }),
  bankStatement: (id: string) => get<ApiItem<BankStatementDetail>>(`/bank-statements/${id}`),
  previewBankStatement: (file: File, mapping?: BankColumnMapping) => {
    const body = new FormData()
    body.append('file', file)
    if (mapping) body.append('mapping', JSON.stringify(mapping))
    return post<ApiItem<BankStatementPreview>>('/bank-statements/preview', body)
  },
  importBankStatement: (file: File, cashAccountId: string, mapping: BankColumnMapping) => {
    const body = new FormData()
    body.append('file', file)
    body.append('cashAccountId', cashAccountId)
    body.append('mapping', JSON.stringify(mapping))
    return post<ApiItem<BankStatementDetail>>('/bank-statements', body)
  },
  removeBankStatement: (id: string) =>
    api<void>(`${base}/bank-statements/${id}`, { method: 'DELETE' }),
  applySuggestions: (id: string) =>
    post<
      ApiItem<{
        applied: number
        failed: Array<{ lineId: string; message: string }>
        statement: BankStatementDetail
      }>
    >(`/bank-statements/${id}/apply-suggestions`),
  reconcileLine: (id: string, input: ReconcileLineInput) =>
    post<ApiItem<{ line: BankStatementLine; statement: BankStatementDetail }>>(
      `/bank-statement-lines/${id}/reconcile`,
      input,
    ),
  undoLine: (id: string) =>
    post<ApiItem<{ line: BankStatementLine; statement: BankStatementDetail }>>(
      `/bank-statement-lines/${id}/undo`,
    ),

  statement: (unitId: string, query: { from?: string; to?: string } = {}) =>
    get<ApiItem<BackofficeUnitStatement>>(`/units/${unitId}/statement`, query),
  receivables: () => get<ApiItem<ReceivablesAging>>('/aging/receivables'),
  payables: () => get<ApiItem<PayablesAging>>('/aging/payables'),

  vendors: (query: { search?: string; active?: boolean } = {}) =>
    get<{ data: Vendor[] }>('/vendors', query),
  createVendor: (input: VendorInput) => post<ApiItem<Vendor>>('/vendors', input),
  updateVendor: (id: string, input: VendorInput) => put<ApiItem<Vendor>>(`/vendors/${id}`, input),

  bills: (query: {
    status?: BillStatus | 'open' | ''
    vendorId?: string
    page?: number
    perPage?: number
  }) => get<ApiPaginated<Bill>>('/bills', query),
  bill: (id: string) => get<ApiItem<Bill>>(`/bills/${id}`),
  createBill: (input: BillInput) => post<ApiItem<Bill>>('/bills', input),
  cancelBill: (id: string, reason: string) =>
    post<ApiItem<Bill>>(`/bills/${id}/cancel`, { reason }),

  vendorPayments: (query: {
    vendorId?: string
    status?: VendorPaymentStatus | ''
    page?: number
  }) => get<ApiPaginated<VendorPayment>>('/vendor-payments', query),
  vendorPayment: (id: string) => get<ApiItem<VendorPayment>>(`/vendor-payments/${id}`),
  payVendor: (input: VendorPaymentInput) => post<ApiItem<VendorPayment>>('/vendor-payments', input),
  reverseVendorPayment: (id: string, reason: string) =>
    post<ApiItem<VendorPayment>>(`/vendor-payments/${id}/reverse`, { reason }),

  budgets: () => get<{ data: Budget[] }>('/budgets'),
  budget: (id: string) => get<ApiItem<BudgetDetail>>(`/budgets/${id}`),
  createBudget: (input: BudgetInput) => post<ApiItem<BudgetDetail>>('/budgets', input),
  updateBudget: (id: string, input: BudgetInput) =>
    put<ApiItem<BudgetDetail>>(`/budgets/${id}`, input),
  approveBudget: (id: string, input: { approvedOn: string; approvalReference?: string | null }) =>
    post<ApiItem<BudgetDetail>>(`/budgets/${id}/approve`, input),
  reopenBudget: (id: string) => post<ApiItem<BudgetDetail>>(`/budgets/${id}/reopen`),
  removeBudget: (id: string) => api<void>(`${base}/budgets/${id}`, { method: 'DELETE' }),

  journal: (query: {
    from?: string
    to?: string
    type?: JournalEntryType | ''
    search?: string
    page?: number
  }) => get<ApiPaginated<JournalEntry>>('/journal', query),
  entry: (id: string) => get<ApiItem<JournalEntry>>(`/journal/${id}`),
  createEntry: (input: ManualEntryInput) => post<ApiItem<JournalEntry>>('/journal', input),
  reverseEntry: (id: string, reason: string) =>
    post<ApiItem<{ id: string; number: number }>>(`/journal/${id}/reverse`, { reason }),

  trialBalance: (query: { from?: string; to?: string; level?: number }) =>
    get<ApiItem<TrialBalance>>('/reports/trial-balance', query),
  incomeStatement: (query: { from?: string; to?: string }) =>
    get<ApiItem<IncomeStatement>>('/reports/income-statement', query),
  balanceSheet: (query: { to?: string; level?: number }) =>
    get<ApiItem<BalanceSheet>>('/reports/balance-sheet', query),
  ledger: (query: {
    accountId: string
    from?: string
    to?: string
    unitId?: string
    vendorId?: string
  }) => get<ApiItem<LedgerReport>>('/reports/ledger', query),
}
