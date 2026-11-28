import vine from '@vinejs/vine'
import { PAYMENT_METHODS } from '@aptoph/shared'

/** Bank statement files: CSV or Excel (.xlsx), up to 5 MB */
const statementFile = () => vine.file({ size: '5mb', extnames: ['csv', 'txt', 'xlsx'] })

export const statementPreviewValidator = vine.create({
  file: statementFile(),
  /** JSON of the column mapping (BankColumnMapping); guessed when missing */
  mapping: vine.string().maxLength(2000).optional(),
})

export const statementImportValidator = vine.create({
  file: statementFile(),
  cashAccountId: vine.string().uuid(),
  mapping: vine.string().maxLength(2000),
})

const column = () => vine.number().withoutDecimals().min(0).max(200)

export const columnMappingValidator = vine.create({
  headerRow: vine.number().withoutDecimals().min(0).max(5000),
  date: column(),
  description: column().nullable(),
  reference: column().nullable(),
  amount: column().nullable(),
  credit: column().nullable(),
  debit: column().nullable(),
  dateFormat: vine.enum(['dmy', 'ymd', 'mdy'] as const),
})

export const listStatementsValidator = vine.create({
  cashAccountId: vine.string().uuid().optional(),
})

/** What to reconcile a movement with; the fields depend on the action */
export const reconcileValidator = vine.create({
  action: vine.enum(['link', 'confirm', 'register', 'link_vendor_payment', 'ignore'] as const),
  paymentId: vine.string().uuid().optional().requiredWhen('action', 'in', ['link', 'confirm']),
  unitId: vine.string().uuid().optional().requiredWhen('action', '=', 'register'),
  method: vine.enum(PAYMENT_METHODS).optional(),
  notes: vine.string().trim().maxLength(255).nullable().optional(),
  vendorPaymentId: vine
    .string()
    .uuid()
    .optional()
    .requiredWhen('action', '=', 'link_vendor_payment'),
  note: vine
    .string()
    .trim()
    .minLength(3)
    .maxLength(255)
    .optional()
    .requiredWhen('action', '=', 'ignore'),
})

export const verifyClearanceValidator = vine.create({
  code: vine.string().trim().minLength(8).maxLength(20),
})
