import vine from '@vinejs/vine'
import {
  PARKING_ASSIGNMENT_STATUSES,
  PARKING_APPLICATION_STATUSES,
  PARKING_MANUAL_END_REASONS,
  PARKING_MODES,
  PARKING_OWNERSHIPS,
  VEHICLE_TYPES,
} from '@aptoph/shared'
import { optionalText } from '#validators/helpers'

/** Validators of the parking of the conjunto (/api/v1/parking/*). docs/parking.md */

const isoDate = () =>
  vine
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
const pesos = () => vine.number().min(0).max(100_000_000)
const rate = () => vine.object({ communal: pesos(), private: pesos() })

export const parkingSettingsValidator = vine.create({
  mode: vine.enum(PARKING_MODES),
  maxSpotsPerUnit: vine.number().withoutDecimals().min(1).max(20),
  rates: vine.object({
    car: rate(),
    motorcycle: rate(),
    bicycle: rate(),
    other: rate(),
  }),
  lotteryMonths: vine.number().withoutDecimals().min(1).max(60),
  offerDays: vine.number().withoutDecimals().min(1).max(30),
  requirements: vine.object({
    noDebt: vine.boolean(),
    debtToleranceDays: vine.number().withoutDecimals().min(0).max(365),
    vehicle: vine.boolean(),
    documents: vine.boolean(),
    priorityWithoutPrivate: vine.boolean(),
  }),
  allowThirdPartyVehicles: vine.boolean(),
})

const spotFields = () => ({
  code: vine.string().trim().minLength(1).maxLength(20),
  vehicleType: vine.enum(VEHICLE_TYPES),
  ownership: vine.enum(PARKING_OWNERSHIPS),
  isCovered: vine.boolean().optional(),
  location: optionalText(80),
  notes: optionalText(500),
  ownerUnitId: vine.string().uuid().nullable().optional(),
  isActive: vine.boolean().optional(),
})
export const createSpotValidator = vine.create(spotFields())
export const updateSpotValidator = vine.create({
  ...spotFields(),
  code: spotFields().code.optional(),
  vehicleType: vine.enum(VEHICLE_TYPES).optional(),
  ownership: vine.enum(PARKING_OWNERSHIPS).optional(),
})

export const spotBatchValidator = vine.create({
  prefix: vine.string().trim().maxLength(10),
  from: vine.number().withoutDecimals().min(0).max(99_999),
  to: vine.number().withoutDecimals().min(0).max(99_999),
  digits: vine.number().withoutDecimals().min(1).max(6).optional(),
  vehicleType: vine.enum(VEHICLE_TYPES),
  ownership: vine.enum(PARKING_OWNERSHIPS),
  isCovered: vine.boolean().optional(),
  location: optionalText(80),
  notes: optionalText(500),
})

export const listSpotsValidator = vine.create({
  ownership: vine.enum(PARKING_OWNERSHIPS).optional(),
  vehicleType: vine.enum(VEHICLE_TYPES).optional(),
  /** free: communal without holder · assigned · inactive */
  state: vine.enum(['free', 'assigned', 'inactive'] as const).optional(),
  search: vine.string().trim().maxLength(50).optional(),
  page: vine.number().withoutDecimals().min(1).optional(),
  perPage: vine.number().withoutDecimals().min(1).max(200).optional(),
})

export const listAssignmentsValidator = vine.create({
  status: vine.enum(PARKING_ASSIGNMENT_STATUSES).optional(),
  /** Holding ones (offered or active) */
  current: vine.boolean().optional(),
  unitId: vine.string().uuid().optional(),
  spotId: vine.string().uuid().optional(),
  search: vine.string().trim().maxLength(50).optional(),
  page: vine.number().withoutDecimals().min(1).optional(),
  perPage: vine.number().withoutDecimals().min(1).max(200).optional(),
})

export const eligibilityValidator = vine.create({
  unitId: vine.string().uuid(),
  vehicleType: vine.enum(VEHICLE_TYPES),
})

export const assignValidator = vine.create({
  spotId: vine.string().uuid(),
  unitId: vine.string().uuid(),
  vehicleId: vine.string().uuid().nullable().optional(),
  startsOn: isoDate(),
  endsOn: isoDate().nullable().optional(),
  notes: optionalText(500),
})

export const updateAssignmentValidator = vine.create({
  vehicleId: vine.string().uuid().nullable().optional(),
  endsOn: isoDate().nullable().optional(),
  notes: optionalText(500),
})

export const endAssignmentValidator = vine.create({
  status: vine.enum(['cancelled', 'rejected'] as const),
  reason: vine.enum(PARKING_MANUAL_END_REASONS),
  note: vine.string().trim().minLength(3).maxLength(500),
  endedOn: isoDate().optional(),
})

export const parkingLookupValidator = vine.create({
  q: vine.string().trim().minLength(2).maxLength(30),
})

// Sorteo

const dateTime = () => vine.string().trim().minLength(10).maxLength(40)

export const createLotteryValidator = vine.create({
  title: vine.string().trim().minLength(3).maxLength(120),
  closesAt: dateTime(),
  periodStartsOn: isoDate(),
  periodEndsOn: isoDate().nullable().optional(),
  notes: optionalText(2000),
  notify: vine.boolean().optional(),
})

export const updateLotteryValidator = vine.create({
  title: vine.string().trim().minLength(3).maxLength(120).optional(),
  closesAt: dateTime().optional(),
  periodStartsOn: isoDate().optional(),
  periodEndsOn: isoDate().nullable().optional(),
  notes: optionalText(2000),
})

export const listApplicationsValidator = vine.create({
  status: vine.enum(PARKING_APPLICATION_STATUSES).optional(),
  vehicleType: vine.enum(VEHICLE_TYPES).optional(),
  search: vine.string().trim().maxLength(60).optional(),
})

export const applyValidator = vine.create({
  unitId: vine.string().uuid(),
  vehicleType: vine.enum(VEHICLE_TYPES),
  vehicleId: vine.string().uuid().nullable().optional(),
})

export const assignApplicationValidator = vine.create({
  spotId: vine.string().uuid(),
})
