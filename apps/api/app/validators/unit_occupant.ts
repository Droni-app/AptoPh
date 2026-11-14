import vine from '@vinejs/vine'
import { DOCUMENT_TYPES, OCCUPANT_RELATIONSHIPS } from '@apartadock/shared'

const fields = () => ({
  fullName: vine.string().trim().minLength(2).maxLength(150),
  documentType: vine.enum(DOCUMENT_TYPES).nullable().optional(),
  documentNumber: vine.string().trim().maxLength(30).nullable().optional(),
  phone: vine.string().trim().maxLength(30).nullable().optional(),
  email: vine.string().trim().email().maxLength(254).nullable().optional(),
  relationship: vine.enum(OCCUPANT_RELATIONSHIPS),
  isPrimaryContact: vine.boolean().optional(),
  isBillingResponsible: vine.boolean().optional(),
  startsOn: vine
    .date({ formats: ['YYYY-MM-DD'] })
    .nullable()
    .optional(),
  endsOn: vine
    .date({ formats: ['YYYY-MM-DD'] })
    .afterField('startsOn')
    .nullable()
    .optional(),
})

export const createUnitOccupantValidator = vine.create(fields())

export const updateUnitOccupantValidator = vine.create({
  ...fields(),
  fullName: fields().fullName.optional(),
  relationship: fields().relationship.optional(),
})
