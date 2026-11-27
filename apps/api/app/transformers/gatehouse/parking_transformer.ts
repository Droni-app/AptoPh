import type { ParkingQuote, ParkingStay as ParkingStayData } from '@aptoph/shared'
import type ParkingStay from '#models/gatehouse/parking_stay'
import type User from '#models/auth/user'
import type Unit from '#models/property/unit'
import { iso } from '#transformers/helpers'

/** JSON shapes of the back-office: visitor parking */

const person = (user: User | null | undefined) =>
  user ? { id: user.id, fullName: user.fullName } : null

const unitRef = (unit: Unit) => ({
  id: unit.id,
  code: unit.code,
  building: unit.building ? { id: unit.building.id, name: unit.building.name } : null,
})

/** Preload `unit.building`, `enteredBy` and `exitedBy` */
export function serializeStay(
  stay: ParkingStay,
  extra: { quote: ParkingQuote; isOverstay: boolean }
): ParkingStayData {
  return {
    id: stay.id,
    number: stay.number,
    status: stay.status,
    vehicleType: stay.vehicleType,
    plate: stay.plate,
    vehicleDescription: stay.vehicleDescription,
    visitorName: stay.visitorName,
    visitorDocument: stay.visitorDocument,
    unit: unitRef(stay.unit),
    visitId: stay.visitId,
    authorization: stay.authorizationMethod,
    authorizedByName: stay.authorizedByName,
    authorizationNotes: stay.authorizationNotes,
    overCapacity: stay.overCapacity,
    enteredAt: stay.enteredAt.toISO()!,
    enteredBy: person(stay.enteredBy),
    exitedAt: iso(stay.exitedAt),
    exitedBy: person(stay.exitedBy),
    tariff: stay.tariff,
    quote: extra.quote,
    isOverstay: extra.isOverstay,
    settlement: stay.settlement,
    paymentMethod: stay.paymentMethod,
    exemptReason: stay.exemptReason,
    receiptEmail: stay.receiptEmail,
    receiptSentAt: iso(stay.receiptSentAt),
  }
}
