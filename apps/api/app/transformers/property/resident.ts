import type Pet from '#models/property/pet'
import type Unit from '#models/property/unit'
import type UnitOccupant from '#models/property/unit_occupant'
import type Vehicle from '#models/property/vehicle'

/**
 * JSON shapes of the resident app (types in packages/shared/src/api.ts).
 * Only what a resident may see: no internal notes, no neighbours' data.
 */

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
    ownerType: vehicle.ownerType,
    ownerName: vehicle.ownerName,
    ownerDocumentType: vehicle.ownerDocumentType,
    ownerDocumentNumber: vehicle.ownerDocumentNumber,
    ownerRelationship: vehicle.ownerRelationship,
    ownerPhone: vehicle.ownerPhone,
    soatExpiresOn: vehicle.soatExpiresOn?.toISODate() ?? null,
    inspectionExpiresOn: vehicle.inspectionExpiresOn?.toISODate() ?? null,
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
