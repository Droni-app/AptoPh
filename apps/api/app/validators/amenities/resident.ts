import vine from '@vinejs/vine'
import { dateTime } from '#validators/helpers'

/** Validators of the resident app (/api/v1/resident/*): bookings */

export const createBookingValidator = vine.create({
  amenityId: vine.string().uuid(),
  unitId: vine.string().uuid(),
  startsAt: dateTime(),
  endsAt: dateTime(),
  guestsCount: vine.number().withoutDecimals().min(1).max(500).nullable().optional(),
})
