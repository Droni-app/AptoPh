import vine from '@vinejs/vine'
import { AUDIT_ACTIONS, AUDIT_MODULES, AUDITABLE_TYPES } from '@aptoph/shared'

const isoDate = () => vine.string().regex(/^\d{4}-\d{2}-\d{2}$/)

const filters = {
  from: isoDate().optional(),
  to: isoDate().optional(),
  module: vine.enum(AUDIT_MODULES).optional(),
  type: vine.enum(Object.keys(AUDITABLE_TYPES)).optional(),
  action: vine.enum(AUDIT_ACTIONS).optional(),
  userId: vine.string().uuid().optional(),
  recordId: vine.string().uuid().optional(),
  search: vine.string().trim().maxLength(80).optional(),
}

export const auditListValidator = vine.create({
  ...filters,
  page: vine.number().withoutDecimals().min(1).optional(),
  perPage: vine.number().withoutDecimals().min(1).max(100).optional(),
})

export const auditExportValidator = vine.create({
  ...filters,
  format: vine.enum(['xlsx', 'csv'] as const).optional(),
})
