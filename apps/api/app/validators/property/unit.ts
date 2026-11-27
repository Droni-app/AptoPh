import vine from '@vinejs/vine'
import { UNIT_STATUSES, UNIT_TYPES } from '@aptoph/shared'

const unitFields = {
  buildingId: vine.string().uuid().nullable(),
  code: vine.string().trim().minLength(1).maxLength(30),
  type: vine.enum(UNIT_TYPES),
  floor: vine.number().withoutDecimals().min(-10).max(200).nullable(),
  privateArea: vine
    .number()
    .min(0)
    .max(100000)
    .decimal([0, 2])
    .transform((value) => value.toFixed(2))
    .nullable(),
  /**
   * Coeficiente de copropiedad as a fraction (0.012345 = 1.2345 %)
   */
  ownershipCoefficient: vine
    .number()
    .min(0)
    .max(1)
    .decimal([0, 6])
    .transform((value) => value.toFixed(6)),
  parentUnitId: vine.string().uuid().nullable(),
  status: vine.enum(UNIT_STATUSES),
  notes: vine.string().trim().maxLength(2000).nullable(),
}

export const createUnitValidator = vine.create({
  ...unitFields,
  buildingId: unitFields.buildingId.optional(),
  type: unitFields.type.optional(),
  floor: unitFields.floor.optional(),
  privateArea: unitFields.privateArea.optional(),
  ownershipCoefficient: unitFields.ownershipCoefficient.optional(),
  parentUnitId: unitFields.parentUnitId.optional(),
  status: unitFields.status.optional(),
  notes: unitFields.notes.optional(),
})

export const updateUnitValidator = vine.create({
  buildingId: unitFields.buildingId.optional(),
  code: unitFields.code.optional(),
  type: unitFields.type.optional(),
  floor: unitFields.floor.optional(),
  privateArea: unitFields.privateArea.optional(),
  ownershipCoefficient: unitFields.ownershipCoefficient.optional(),
  parentUnitId: unitFields.parentUnitId.optional(),
  status: unitFields.status.optional(),
  notes: unitFields.notes.optional(),
})

export const listUnitsValidator = vine.create({
  page: vine.number().withoutDecimals().min(1).optional(),
  perPage: vine.number().withoutDecimals().min(1).max(100).optional(),
  buildingId: vine.string().uuid().optional(),
  type: vine.enum(UNIT_TYPES).optional(),
  status: vine.enum(UNIT_STATUSES).optional(),
  search: vine.string().trim().maxLength(50).optional(),
})
