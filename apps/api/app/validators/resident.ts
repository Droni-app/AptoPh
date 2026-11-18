import vine from '@vinejs/vine'
import {
  DOCUMENT_TYPES,
  PET_SPECIES,
  TICKET_TYPES,
  VEHICLE_TYPES,
  VISIT_TYPES,
} from '@aptoph/shared'

/**
 * Validators for the resident app (/api/v1/resident/*)
 */

const optionalText = (max: number) => vine.string().trim().maxLength(max).nullable().optional()

/**
 * Date and time with an explicit offset ("2026-11-20T19:00:00-05:00" or "…Z"), so the
 * instant is unambiguous whatever the browser's timezone. Parse with DateTime.fromISO.
 */
const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/
const dateTime = () => vine.string().trim().regex(ISO_DATE_TIME)

/** Colombian plates: ABC123 (cars), ABC12D (motorcycles); bicycles may have none */
const plate = () =>
  vine
    .string()
    .trim()
    .toUpperCase()
    // Rules run before transform(): allow "ABC 123" / "ABC-123" and store "ABC123"
    .regex(/^[A-Z0-9](?:[ -]?[A-Z0-9]){2,9}$/)
    .transform((value) => value.replace(/[\s-]/g, ''))

const vehicleFields = () => ({
  plate: plate(),
  type: vine.enum(VEHICLE_TYPES),
  brand: optionalText(60),
  model: optionalText(60),
  color: optionalText(30),
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

export const createVisitValidator = vine.create({
  unitId: vine.string().uuid(),
  visitorName: vine.string().trim().minLength(2).maxLength(150),
  visitorDocument: optionalText(30),
  vehiclePlate: plate().nullable().optional(),
  type: vine.enum(VISIT_TYPES),
  expectedAt: dateTime(),
})

export const createBookingValidator = vine.create({
  amenityId: vine.string().uuid(),
  unitId: vine.string().uuid(),
  startsAt: dateTime(),
  endsAt: dateTime(),
  guestsCount: vine.number().withoutDecimals().min(1).max(500).nullable().optional(),
})

export const createTicketValidator = vine.create({
  unitId: vine.string().uuid().nullable().optional(),
  type: vine.enum(TICKET_TYPES),
  subject: vine.string().trim().minLength(5).maxLength(200),
  description: vine.string().trim().minLength(10).maxLength(5000),
})

export const createTicketCommentValidator = vine.create({
  body: vine.string().trim().minLength(1).maxLength(5000),
})
