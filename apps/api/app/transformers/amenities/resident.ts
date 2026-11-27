import type { DateTime } from 'luxon'
import type Amenity from '#models/amenities/amenity'
import type AmenityBooking from '#models/amenities/amenity_booking'
import { iso } from '#transformers/helpers'
import { unitRef } from '#transformers/property/resident'

/** JSON shapes of the resident app: amenities and bookings */

/** Booking rules stored in amenities.rules (all optional) */
export type AmenityRules = {
  maxHours?: number
  opensAt?: string
  closesAt?: string
  closedOn?: string[]
  depositRequired?: boolean
}

export function amenityRules(amenity: Amenity): AmenityRules {
  const rules = (amenity.rules ?? {}) as Record<string, unknown>
  return {
    maxHours: typeof rules.maxHours === 'number' ? rules.maxHours : undefined,
    opensAt: typeof rules.opensAt === 'string' ? rules.opensAt : undefined,
    closesAt: typeof rules.closesAt === 'string' ? rules.closesAt : undefined,
    closedOn: Array.isArray(rules.closedOn) ? rules.closedOn.map(String) : undefined,
    depositRequired: rules.depositRequired === true ? true : undefined,
  }
}

export function presentAmenity(amenity: Amenity) {
  return {
    id: amenity.id,
    name: amenity.name,
    description: amenity.description,
    capacity: amenity.capacity,
    bookingFee: amenity.bookingFee,
    requiresApproval: amenity.requiresApproval,
    rules: amenityRules(amenity),
  }
}

/** Preload `amenity` and `unit.building` */
export function presentBooking(booking: AmenityBooking, viewerId: string, now: DateTime) {
  const active = booking.status === 'pending' || booking.status === 'approved'
  return {
    id: booking.id,
    amenity: { id: booking.amenity.id, name: booking.amenity.name },
    unit: unitRef(booking.unit),
    startsAt: iso(booking.startsAt),
    endsAt: iso(booking.endsAt),
    guestsCount: booking.guestsCount,
    status: booking.status,
    bookingFee: booking.amenity.bookingFee,
    isMine: booking.requestedById === viewerId,
    canCancel: active && booking.startsAt > now,
  }
}
