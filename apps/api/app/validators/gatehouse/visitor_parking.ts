import vine from '@vinejs/vine'
import {
  PARKING_AUTHORIZATIONS,
  PARKING_FRACTIONS,
  PARKING_GATE_METHODS,
  PARKING_PAYMENT_MODES,
  PARKING_SETTLEMENTS,
  PARKING_STAY_STATUSES,
  VEHICLE_TYPES,
} from '@aptoph/shared'

/** Validators of the back-office visitor parking (/api/v1/visitor-parking) */

const vehicle = () =>
  vine.object({
    capacity: vine.number().withoutDecimals().min(0).max(10_000),
    hourlyRate: vine.number().withoutDecimals().min(0).max(10_000_000),
    dailyCap: vine.number().withoutDecimals().min(0).max(100_000_000).nullable(),
  })

export const parkingSettingsValidator = vine.create({
  enabled: vine.boolean(),
  vehicles: vine.object({
    car: vehicle(),
    motorcycle: vehicle(),
    bicycle: vehicle(),
    other: vehicle(),
  }),
  graceHours: vine.number().min(0).max(24),
  fractionMinutes: vine.number().in([...PARKING_FRACTIONS]),
  vat: vine.object({
    enabled: vine.boolean(),
    rate: vine.number().min(0).max(100),
  }),
  paymentMode: vine.enum(PARKING_PAYMENT_MODES),
  cashAccountId: vine.string().uuid().nullable(),
  maxStayHours: vine
    .number()
    .withoutDecimals()
    .min(1)
    .max(24 * 60)
    .nullable(),
})

const date = () =>
  vine
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()

export const listStaysValidator = vine.create({
  status: vine.enum(PARKING_STAY_STATUSES).optional(),
  vehicleType: vine.enum(VEHICLE_TYPES).optional(),
  settlement: vine.enum(PARKING_SETTLEMENTS).optional(),
  overstay: vine.boolean().optional(),
  from: date(),
  to: date(),
  /** Placa, visitante o unidad */
  search: vine.string().trim().maxLength(100).optional(),
  page: vine.number().withoutDecimals().min(1).optional(),
  perPage: vine.number().withoutDecimals().min(1).max(100).optional(),
})

export const lookupValidator = vine.create({
  q: vine.string().trim().minLength(2).maxLength(50),
})

export const entryValidator = vine.create({
  vehicleType: vine.enum(VEHICLE_TYPES),
  plate: vine.string().trim().maxLength(12).nullable().optional(),
  vehicleDescription: vine.string().trim().maxLength(100).nullable().optional(),
  unitId: vine.string().uuid(),
  visitorName: vine.string().trim().minLength(2).maxLength(150),
  visitorDocument: vine.string().trim().maxLength(30).nullable().optional(),
  visitId: vine.string().uuid().nullable().optional(),
  authorization: vine.enum(PARKING_AUTHORIZATIONS),
  authorizedByName: vine.string().trim().maxLength(150).nullable().optional(),
  authorizationNotes: vine.string().trim().maxLength(500).nullable().optional(),
})

export const correctStayValidator = vine.create({
  plate: vine.string().trim().maxLength(12).nullable().optional(),
  vehicleDescription: vine.string().trim().maxLength(100).nullable().optional(),
  unitId: vine.string().uuid().optional(),
  visitorName: vine.string().trim().minLength(2).maxLength(150).optional(),
  visitorDocument: vine.string().trim().maxLength(30).nullable().optional(),
})

export const exitValidator = vine.create({
  paymentMode: vine.enum(['gate', 'unit'] as const).optional(),
  paymentMethod: vine.enum(PARKING_GATE_METHODS).optional(),
  exempt: vine.boolean().optional(),
  exemptReason: vine.string().trim().maxLength(300).nullable().optional(),
  receiptEmail: vine.string().trim().email().maxLength(254).nullable().optional(),
})

export const receiptValidator = vine.create({
  email: vine.string().trim().email().maxLength(254),
})
