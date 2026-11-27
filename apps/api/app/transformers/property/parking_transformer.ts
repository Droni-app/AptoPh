import {
  PARKING_APPLICATION_STATUSES,
  type ParkingApplication as ParkingApplicationJson,
  type ParkingApplicationStatus,
  type ParkingLottery as ParkingLotteryJson,
  type VehicleType,
  type ParkingAssignment as ParkingAssignmentJson,
  type ParkingSpot as ParkingSpotJson,
  type ParkingUnitRef,
  type ParkingVehicleRef,
} from '@aptoph/shared'
import type ParkingApplication from '#models/property/parking_application'
import type ParkingLottery from '#models/property/parking_lottery'
import type ParkingAssignment from '#models/property/parking_assignment'
import type ParkingSpot from '#models/property/parking_spot'
import type Unit from '#models/property/unit'
import type Vehicle from '#models/property/vehicle'
import type { DateTime } from 'luxon'
import { iso } from '#transformers/helpers'

/** JSON of the parking of the conjunto. docs/parking.md */

/** Preload `building` */
export const parkingUnitRef = (unit: Unit): ParkingUnitRef => ({
  id: unit.id,
  code: unit.code,
  building: unit.building ? { id: unit.building.id, name: unit.building.name } : null,
})

export const parkingVehicleRef = (vehicle: Vehicle): ParkingVehicleRef => ({
  id: vehicle.id,
  plate: vehicle.plate,
  type: vehicle.type,
  brand: vehicle.brand,
  color: vehicle.color,
})

const date = (value: DateTime | null | undefined) => value?.toISODate() ?? null

/**
 * Preload `spot`, `unit.building`, `vehicle`, `createdBy`, `endedBy`.
 * `showRates`: false for the guards.
 */
export function serializeAssignment(
  assignment: ParkingAssignment,
  showRates: boolean
): ParkingAssignmentJson {
  return {
    id: assignment.id,
    spot: {
      id: assignment.spot.id,
      code: assignment.spot.code,
      vehicleType: assignment.spot.vehicleType,
      location: assignment.spot.location,
    },
    unit: parkingUnitRef(assignment.unit),
    vehicle: assignment.vehicle ? parkingVehicleRef(assignment.vehicle) : null,
    status: assignment.status,
    startsOn: date(assignment.startsOn)!,
    endsOn: date(assignment.endsOn),
    endedOn: date(assignment.endedOn),
    monthlyRate: showRates ? Number(assignment.monthlyRate) : null,
    endReason: assignment.endReason,
    endNote: assignment.endNote,
    notes: assignment.notes,
    createdBy: assignment.createdBy
      ? { id: assignment.createdBy.id, fullName: assignment.createdBy.fullName }
      : null,
    endedBy: assignment.endedBy
      ? { id: assignment.endedBy.id, fullName: assignment.endedBy.fullName }
      : null,
    createdAt: iso(assignment.createdAt)!,
  }
}

/** Preload `ownerUnit.building` */
export function serializeSpot(
  spot: ParkingSpot,
  extra: { assignment: ParkingAssignment | null; vehicles: Vehicle[]; showRates: boolean }
): ParkingSpotJson {
  const assigned = extra.assignment?.vehicleId
  return {
    id: spot.id,
    code: spot.code,
    vehicleType: spot.vehicleType,
    ownership: spot.ownership,
    isCovered: spot.isCovered,
    location: spot.location,
    notes: spot.notes,
    isActive: spot.isActive,
    ownerUnit: spot.ownerUnit ? parkingUnitRef(spot.ownerUnit) : null,
    propertyUnitId: spot.propertyUnitId,
    assignment: extra.assignment ? serializeAssignment(extra.assignment, extra.showRates) : null,
    // The assigned vehicle first, then the others of its type
    vehicles: extra.vehicles
      .filter((vehicle) => vehicle.type === spot.vehicleType)
      .sort((a, b) => Number(b.id === assigned) - Number(a.id === assigned))
      .map(parkingVehicleRef),
  }
}

const emptyCounts = (): Record<ParkingApplicationStatus, number> =>
  Object.fromEntries(PARKING_APPLICATION_STATUSES.map((status) => [status, 0])) as Record<
    ParkingApplicationStatus,
    number
  >

/** Preload `drawnBy`. `seed` only after the draw */
export function serializeLottery(
  lottery: ParkingLottery,
  extra: {
    counts?: Record<string, number>
    spots: Array<{ type: VehicleType; count: number }>
  }
): ParkingLotteryJson {
  return {
    id: lottery.id,
    number: lottery.number,
    title: lottery.title,
    status: lottery.status,
    closesAt: iso(lottery.closesAt)!,
    periodStartsOn: date(lottery.periodStartsOn)!,
    periodEndsOn: date(lottery.periodEndsOn)!,
    notes: lottery.notes,
    seed: lottery.status === 'open' ? null : lottery.seed,
    drawnAt: iso(lottery.drawnAt),
    drawnBy: lottery.drawnBy
      ? { id: lottery.drawnBy.id, fullName: lottery.drawnBy.fullName }
      : null,
    createdAt: iso(lottery.createdAt)!,
    counts: { ...emptyCounts(), ...extra.counts },
    spots: extra.spots,
    notifiedCount: lottery.notifiedCount,
  }
}

/** Preload `unit.building`, `vehicle`, `spot`, `appliedBy` */
export function serializeApplication(
  application: ParkingApplication,
  extra: { queuePosition?: number | null; assignmentId?: string | null } = {}
): ParkingApplicationJson {
  return {
    id: application.id,
    lotteryId: application.lotteryId,
    unit: parkingUnitRef(application.unit),
    vehicle: application.vehicle ? parkingVehicleRef(application.vehicle) : null,
    vehicleType: application.vehicleType,
    status: application.status,
    priorityGroup: application.priorityGroup,
    drawPosition: application.drawPosition,
    queuePosition: extra.queuePosition ?? null,
    drawHash: application.drawHash,
    ineligibleReason: application.ineligibleReason,
    spot: application.spot
      ? {
          id: application.spot.id,
          code: application.spot.code,
          location: application.spot.location,
        }
      : null,
    assignmentId: extra.assignmentId ?? null,
    offerExpiresAt: iso(application.offerExpiresAt),
    appliedBy: application.appliedBy
      ? { id: application.appliedBy.id, fullName: application.appliedBy.fullName }
      : null,
    late: application.late,
    createdAt: iso(application.createdAt)!,
  }
}
