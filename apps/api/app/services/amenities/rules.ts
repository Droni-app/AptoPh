import {
  BOOKING_MODES,
  DEFAULT_MAX_DAYS_AHEAD,
  WEEKDAYS,
  type Amenity as AmenityJson,
  type AmenityRules,
  type AmenityShift,
  type Weekday,
} from '@aptoph/shared'
import type Amenity from '#models/amenities/amenity'

/** Rules and JSON of a common area (docs/amenities.md) */

const TIME = /^([01]\d|2[0-3]):[0-5]\d$|^24:00$/
const time = (value: unknown) => (typeof value === 'string' && TIME.test(value) ? value : undefined)
const positive = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined

/** amenities.rules, cleaned: what was stored by hand or by an old version is ignored */
export function rulesOf(amenity: Pick<Amenity, 'rules'>): AmenityRules {
  const raw = (amenity.rules ?? {}) as Record<string, unknown>
  const shifts = Array.isArray(raw.shifts)
    ? (raw.shifts as Array<Record<string, unknown>>)
        .map((shift) => ({
          id: typeof shift.id === 'string' ? shift.id : '',
          name: typeof shift.name === 'string' ? shift.name : '',
          startsAt: time(shift.startsAt) ?? '',
          endsAt: time(shift.endsAt) ?? '',
        }))
        .filter((shift) => shift.id && shift.name && shift.startsAt && shift.endsAt)
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    : undefined
  return {
    opensAt: time(raw.opensAt),
    closesAt: time(raw.closesAt),
    closedOn: Array.isArray(raw.closedOn)
      ? (raw.closedOn.filter((day) => WEEKDAYS.includes(day as Weekday)) as Weekday[])
      : undefined,
    slotMinutes: raw.slotMinutes === 30 ? 30 : raw.slotMinutes === 60 ? 60 : undefined,
    minHours: positive(raw.minHours),
    maxHours: positive(raw.maxHours),
    maxDays: positive(raw.maxDays),
    shifts: shifts?.length ? (shifts as AmenityShift[]) : undefined,
    minNoticeHours: positive(raw.minNoticeHours),
    maxDaysAhead: positive(raw.maxDaysAhead),
    bufferMinutes: positive(raw.bufferMinutes),
    maxActivePerUnit: positive(raw.maxActivePerUnit),
    maxPerMonthPerUnit: positive(raw.maxPerMonthPerUnit),
    cancelHours: positive(raw.cancelHours),
  }
}

/** Without undefined keys, to store in jsonb */
export function storedRules(rules: AmenityRules) {
  return Object.fromEntries(
    Object.entries(rules).filter(([, value]) => value !== undefined && value !== null)
  )
}

export const maxDaysAheadOf = (rules: AmenityRules) => rules.maxDaysAhead ?? DEFAULT_MAX_DAYS_AHEAD

export function presentAmenity(amenity: Amenity): AmenityJson {
  return {
    id: amenity.id,
    name: amenity.name,
    description: amenity.description,
    capacity: amenity.capacity,
    bookingMode: BOOKING_MODES.includes(amenity.bookingMode) ? amenity.bookingMode : 'hours',
    bookingFee: amenity.bookingFee,
    externalFee: amenity.externalFee,
    depositAmount: amenity.depositAmount,
    paymentMode: amenity.paymentMode,
    requiresApproval: amenity.requiresApproval,
    allowDelinquent: amenity.allowDelinquent,
    allowGuests: amenity.allowGuests,
    allowExternal: amenity.allowExternal,
    terms: amenity.terms,
    color: amenity.color,
    rules: rulesOf(amenity),
    isActive: amenity.isActive,
  }
}
