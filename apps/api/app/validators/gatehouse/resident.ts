import vine from '@vinejs/vine'
import { VISIT_TYPES } from '@aptoph/shared'
import { dateTime, optionalText, plate } from '#validators/helpers'

/** Validators of the resident app (/api/v1/resident/*): visits */

export const createVisitValidator = vine.create({
  unitId: vine.string().uuid(),
  visitorName: vine.string().trim().minLength(2).maxLength(150),
  visitorDocument: optionalText(30),
  vehiclePlate: plate().nullable().optional(),
  type: vine.enum(VISIT_TYPES),
  expectedAt: dateTime(),
})
