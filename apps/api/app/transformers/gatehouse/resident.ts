import type { DateTime } from 'luxon'
import type Parcel from '#models/gatehouse/parcel'
import type Visit from '#models/gatehouse/visit'
import { iso } from '#transformers/helpers'
import { unitRef } from '#transformers/property/resident'

/** JSON shapes of the resident app: visits and parcels */

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
