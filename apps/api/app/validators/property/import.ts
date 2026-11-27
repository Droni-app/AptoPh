import vine from '@vinejs/vine'
import {
  DOCUMENT_TYPES,
  IMPORT_MAX_MB,
  IMPORT_MAX_ROWS,
  OCCUPANT_RELATIONSHIPS,
  UNIT_STATUSES,
  UNIT_TYPES,
} from '@aptoph/shared'

export const importFileValidator = vine.create({
  file: vine.file({ size: `${IMPORT_MAX_MB}mb`, extnames: ['csv', 'txt'] }),
})

/** A row as the preview normalized it (docs/import.md) */
const rowInput = () =>
  vine.object({
    building: vine.string().trim().minLength(1).maxLength(80).nullable(),
    code: vine.string().trim().minLength(1).maxLength(30),
    type: vine.enum(UNIT_TYPES).nullable(),
    floor: vine.number().withoutDecimals().min(-10).max(200).nullable(),
    privateArea: vine.number().min(0).max(100000).decimal([0, 2]).nullable(),
    coefficient: vine.number().min(0).max(100).decimal([0, 4]).nullable(),
    status: vine.enum(UNIT_STATUSES).nullable(),
    fullName: vine.string().trim().minLength(2).maxLength(150).nullable(),
    relationship: vine.enum(OCCUPANT_RELATIONSHIPS).nullable(),
    documentType: vine.enum(DOCUMENT_TYPES).nullable(),
    documentNumber: vine.string().trim().maxLength(30).nullable(),
    phone: vine.string().trim().maxLength(30).nullable(),
    email: vine.string().trim().toLowerCase().email().maxLength(254).nullable(),
    isPrimaryContact: vine.boolean().nullable(),
    isBillingResponsible: vine.boolean().nullable(),
  })

export const importRowValidator = vine.create({
  line: vine.number().withoutDecimals().min(1),
  input: rowInput(),
})

export const importPlanValidator = vine.create({
  rows: vine
    .array(vine.object({ line: vine.number().withoutDecimals().min(1), input: rowInput() }))
    .maxLength(IMPORT_MAX_ROWS),
})
