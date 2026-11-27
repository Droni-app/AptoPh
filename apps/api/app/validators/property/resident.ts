import vine from '@vinejs/vine'
import {
  DOCUMENT_TYPES,
  PET_SPECIES,
  VEHICLE_OWNER_RELATIONSHIPS,
  VEHICLE_OWNER_TYPES,
  VEHICLE_TYPES,
} from '@aptoph/shared'
import { optionalText, plate } from '#validators/helpers'

/** Validators of the resident app (/api/v1/resident/*): vehicles, pets and household */

const vehicleFields = () => ({
  plate: plate(),
  type: vine.enum(VEHICLE_TYPES),
  brand: optionalText(60),
  model: optionalText(60),
  color: optionalText(30),
  // Owner when it is someone else's (docs/parking.md)
  ownerType: vine.enum(VEHICLE_OWNER_TYPES).optional(),
  ownerName: optionalText(150),
  ownerDocumentType: vine.enum(DOCUMENT_TYPES).nullable().optional(),
  ownerDocumentNumber: optionalText(30),
  ownerRelationship: vine.enum(VEHICLE_OWNER_RELATIONSHIPS).nullable().optional(),
  ownerPhone: optionalText(30),
  soatExpiresOn: vine
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  inspectionExpiresOn: vine
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
})
export const createVehicleValidator = vine.create(vehicleFields())
export const updateVehicleValidator = vine.create({
  ...vehicleFields(),
  plate: plate().optional(),
  type: vine.enum(VEHICLE_TYPES).optional(),
})

const petFields = () => ({
  name: vine.string().trim().minLength(1).maxLength(60),
  species: vine.enum(PET_SPECIES),
  breed: optionalText(60),
  isPotentiallyDangerous: vine.boolean().optional(),
})
export const createPetValidator = vine.create(petFields())
export const updatePetValidator = vine.create({
  ...petFields(),
  name: petFields().name.optional(),
  species: vine.enum(PET_SPECIES).optional(),
})

/** Residents add these; owners and renters are registered by the administration */
export const HOUSEHOLD_RELATIONSHIPS = ['family_member', 'domestic_worker', 'other'] as const

const householdFields = () => ({
  fullName: vine.string().trim().minLength(2).maxLength(150),
  relationship: vine.enum(HOUSEHOLD_RELATIONSHIPS),
  documentType: vine.enum(DOCUMENT_TYPES).nullable().optional(),
  documentNumber: optionalText(30),
  phone: optionalText(30),
})
export const createHouseholdMemberValidator = vine.create(householdFields())
export const updateHouseholdMemberValidator = vine.create({
  ...householdFields(),
  fullName: householdFields().fullName.optional(),
  relationship: vine.enum(HOUSEHOLD_RELATIONSHIPS).optional(),
})
