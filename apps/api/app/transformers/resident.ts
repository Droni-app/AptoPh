import type { DateTime } from 'luxon'
import type Amenity from '#models/amenity'
import type AmenityBooking from '#models/amenity_booking'
import type Parcel from '#models/parcel'
import type Pet from '#models/pet'
import type Ticket from '#models/ticket'
import type TicketComment from '#models/ticket_comment'
import type Unit from '#models/unit'
import type UnitOccupant from '#models/unit_occupant'
import type Vehicle from '#models/vehicle'
import type Visit from '#models/visit'

/**
 * JSON shapes of the resident app (types in packages/shared/src/api.ts).
 * Only what a resident may see: no internal notes, no neighbours' data.
 */

const iso = (value: DateTime | null | undefined) => value?.toISO() ?? null

/** Unit reference; preload `building` on the unit */
export function unitRef(unit: Unit) {
  return {
    id: unit.id,
    code: unit.code,
    type: unit.type,
    building: unit.building ? { id: unit.building.id, name: unit.building.name } : null,
  }
}

export function presentVehicle(vehicle: Vehicle) {
  return {
    id: vehicle.id,
    plate: vehicle.plate,
    type: vehicle.type,
    brand: vehicle.brand,
    model: vehicle.model,
    color: vehicle.color,
  }
}

export function presentPet(pet: Pet) {
  return {
    id: pet.id,
    name: pet.name,
    species: pet.species,
    breed: pet.breed,
    isPotentiallyDangerous: pet.isPotentiallyDangerous,
  }
}

/** Relationships residents manage themselves (the rest are set by the administration) */
export const RESIDENT_MANAGED_RELATIONSHIPS: ReadonlySet<string> = new Set([
  'family_member',
  'domestic_worker',
  'other',
])

export function isResidentManaged(member: UnitOccupant) {
  // `!userId`: a model just created without a user has it undefined, not null
  return !member.userId && RESIDENT_MANAGED_RELATIONSHIPS.has(member.relationship)
}

/**
 * A member of the household. Co-residents see each other's name and role; the
 * document and phone only travel for members the viewer can edit.
 */
export function presentHouseholdMember(
  member: UnitOccupant,
  viewerId: string,
  viewerManages: boolean
) {
  const editable = viewerManages && isResidentManaged(member)
  return {
    id: member.id,
    fullName: member.fullName,
    relationship: member.relationship,
    isPrimaryContact: member.isPrimaryContact,
    isBillingResponsible: member.isBillingResponsible,
    isMe: member.userId === viewerId,
    editable,
    documentType: editable ? member.documentType : null,
    documentNumber: editable ? member.documentNumber : null,
    phone: editable ? member.phone : null,
  }
}

/** A visit left without check-in this long after its expected time is shown as expired */
const VISIT_EXPIRY_HOURS = 12

export function visitStatus(visit: Visit, now: DateTime) {
  if (visit.checkedOutAt) return 'completed' as const
  if (visit.checkedInAt) return 'inside' as const
  if (visit.expectedAt && visit.expectedAt.plus({ hours: VISIT_EXPIRY_HOURS }) < now) {
    return 'expired' as const
  }
  return 'expected' as const
}

/** Preload `unit.building` */
export function presentVisit(visit: Visit, now: DateTime) {
  const status = visitStatus(visit, now)
  return {
    id: visit.id,
    unit: unitRef(visit.unit),
    visitorName: visit.visitorName,
    visitorDocument: visit.visitorDocument,
    vehiclePlate: visit.vehiclePlate,
    type: visit.type,
    accessCode: status === 'expected' ? visit.accessCode : null,
    expectedAt: iso(visit.expectedAt),
    checkedInAt: iso(visit.checkedInAt),
    checkedOutAt: iso(visit.checkedOutAt),
    status,
    canCancel: status === 'expected',
  }
}

/** Preload `unit.building` */
export function presentParcel(parcel: Parcel) {
  return {
    id: parcel.id,
    unit: unitRef(parcel.unit),
    carrier: parcel.carrier,
    description: parcel.description,
    status: parcel.status,
    receivedAt: iso(parcel.receivedAt),
    deliveredAt: iso(parcel.deliveredAt),
    deliveredToName: parcel.deliveredToName,
  }
}

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

/** Preload `unit.building` (when the ticket has a unit) */
export function presentTicket(ticket: Ticket, viewerId: string) {
  return {
    id: ticket.id,
    number: ticket.number,
    type: ticket.type,
    subject: ticket.subject,
    description: ticket.description,
    priority: ticket.priority,
    status: ticket.status,
    unit: ticket.unit ? unitRef(ticket.unit) : null,
    isMine: ticket.createdById === viewerId,
    createdAt: iso(ticket.createdAt),
    updatedAt: iso(ticket.updatedAt),
    resolvedAt: iso(ticket.resolvedAt),
  }
}

/** Public comments only; preload `author` */
export function presentTicketComment(comment: TicketComment, viewerId: string) {
  return {
    id: comment.id,
    body: comment.body,
    isMine: comment.authorId === viewerId,
    authorName: comment.author?.fullName ?? 'Administración',
    createdAt: iso(comment.createdAt),
  }
}
