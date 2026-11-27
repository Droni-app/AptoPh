import vine from '@vinejs/vine'
import {
  AMENITY_PAYMENT_MODES,
  BOOKING_MODES,
  BOOKING_TYPES,
  PAYMENT_METHODS,
  WEEKDAYS,
} from '@aptoph/shared'
import { dateTime } from '#validators/helpers'

/** Common areas and bookings (docs/amenities.md) */

const TIME = /^([01]\d|2[0-3]):[0-5]\d$|^24:00$/
const DATE = /^\d{4}-\d{2}-\d{2}$/
const time = () => vine.string().trim().regex(TIME)
const money = () => vine.number().min(0).max(100_000_000).nullable().optional()
const count = (max: number) => vine.number().withoutDecimals().min(1).max(max).optional()

export const amenityValidator = vine.create({
  name: vine.string().trim().minLength(2).maxLength(100),
  description: vine.string().trim().maxLength(2000).nullable().optional(),
  capacity: vine.number().withoutDecimals().min(1).max(5000).nullable().optional(),
  bookingMode: vine.enum(BOOKING_MODES),
  bookingFee: money(),
  externalFee: money(),
  depositAmount: money(),
  paymentMode: vine.enum(AMENITY_PAYMENT_MODES),
  requiresApproval: vine.boolean(),
  allowDelinquent: vine.boolean(),
  allowGuests: vine.boolean(),
  allowExternal: vine.boolean(),
  terms: vine.string().trim().maxLength(10_000).nullable().optional(),
  color: vine
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable()
    .optional(),
  isActive: vine.boolean().optional(),
  rules: vine.object({
    opensAt: time().optional(),
    closesAt: time().optional(),
    closedOn: vine.array(vine.enum(WEEKDAYS)).maxLength(6).optional(),
    slotMinutes: vine.enum([30, 60] as const).optional(),
    minHours: vine.number().min(0.5).max(24).optional(),
    maxHours: vine.number().min(0.5).max(24).optional(),
    maxDays: count(30),
    shifts: vine
      .array(
        vine.object({
          id: vine.string().trim().minLength(1).maxLength(40),
          name: vine.string().trim().minLength(1).maxLength(40),
          startsAt: time(),
          endsAt: time(),
        })
      )
      .maxLength(12)
      .optional(),
    minNoticeHours: vine.number().withoutDecimals().min(1).max(720).optional(),
    maxDaysAhead: count(365),
    bufferMinutes: vine.number().withoutDecimals().min(5).max(720).optional(),
    maxActivePerUnit: count(50),
    maxPerMonthPerUnit: count(100),
    cancelHours: vine.number().withoutDecimals().min(1).max(720).optional(),
  }),
})

const holder = () =>
  vine
    .object({
      name: vine.string().trim().minLength(2).maxLength(150),
      document: vine.string().trim().maxLength(30).nullable().optional(),
      phone: vine.string().trim().maxLength(30).nullable().optional(),
      email: vine.string().trim().email().maxLength(254).nullable().optional(),
    })
    .nullable()
    .optional()

const bookingFields = {
  amenityId: vine.string().uuid(),
  bookingType: vine.enum(BOOKING_TYPES),
  unitId: vine.string().uuid().nullable().optional(),
  holder: holder(),
  startsAt: dateTime().optional(),
  endsAt: dateTime().optional(),
  date: vine.string().trim().regex(DATE).optional(),
  days: count(30),
  shiftIds: vine.array(vine.string().trim().maxLength(40)).maxLength(12).optional(),
  guestsCount: vine.number().withoutDecimals().min(1).max(5000).nullable().optional(),
  notes: vine.string().trim().maxLength(1000).nullable().optional(),
  paymentReference: vine.string().trim().maxLength(100).nullable().optional(),
  acceptTerms: vine.boolean().optional(),
}

const approveFields = {
  cashAccountId: vine.string().uuid().nullable().optional(),
  method: vine.enum(PAYMENT_METHODS).optional(),
  paidOn: vine.string().trim().regex(DATE).optional(),
  note: vine.string().trim().maxLength(1000).nullable().optional(),
}

export const bookingValidator = vine.create(bookingFields)

/** The administration can approve in the same step */
export const staffBookingValidator = vine.create({
  ...bookingFields,
  approve: vine.object(approveFields).optional(),
})

export const approveBookingValidator = vine.create(approveFields)

export const reasonValidator = vine.create({
  reason: vine.string().trim().minLength(3).maxLength(1000),
})

export const cancelBookingValidator = vine.create({
  reason: vine.string().trim().maxLength(1000).nullable().optional(),
})

export const depositValidator = vine.create({
  outcome: vine.enum(['returned', 'retained'] as const),
  retainedAmount: vine.number().min(0).max(100_000_000).optional(),
  cashAccountId: vine.string().uuid(),
  note: vine.string().trim().maxLength(1000).nullable().optional(),
})

export const rangeValidator = vine.create({
  from: vine.string().trim().regex(DATE),
  to: vine.string().trim().regex(DATE),
  amenityId: vine.string().uuid().optional(),
  withInactive: vine.boolean().optional(),
})

export const bookingListValidator = vine.create({
  status: vine
    .enum(['pending', 'approved', 'rejected', 'cancelled', 'deposit'] as const)
    .optional(),
  amenityId: vine.string().uuid().optional(),
  page: vine.number().withoutDecimals().min(1).optional(),
  perPage: vine.number().withoutDecimals().min(5).max(100).optional(),
})
