/**
 * Allowed values of enum-like columns. Used by the API migrations (CHECK constraints),
 * validators and the front-ends. See docs/database-model.md.
 */

const values = <const T extends readonly string[]>(...items: T) => items
export type ValueOf<T extends readonly string[]> = T[number]

// Tenants & enrollments
export const TENANT_STATUSES = values('trial', 'active', 'suspended', 'cancelled')
export const PROPERTY_TYPES = values('residential', 'commercial', 'mixed')
export const ENROLLMENT_STATUSES = values('invited', 'active', 'suspended', 'revoked')

// Physical structure
export const UNIT_TYPES = values('apartment', 'house', 'commercial', 'parking', 'storage')
export const UNIT_STATUSES = values('occupied', 'vacant', 'under_construction')
export const OCCUPANT_RELATIONSHIPS = values('owner', 'renter', 'family_member', 'domestic_worker', 'other')
export const DOCUMENT_TYPES = values('CC', 'CE', 'NIT', 'PP', 'TI')
export const VEHICLE_TYPES = values('car', 'motorcycle', 'bicycle', 'other')
export const PET_SPECIES = values('dog', 'cat', 'other')

// Finance
export const CHARGE_CONCEPT_TYPES = values('ordinary_fee', 'extraordinary_fee', 'fine', 'interest', 'service', 'other')
export const CHARGE_CALCULATIONS = values('fixed', 'by_coefficient', 'by_area')
export const CHARGE_STATUSES = values('pending', 'partially_paid', 'paid', 'cancelled')
export const PAYMENT_METHODS = values('cash', 'bank_transfer', 'card', 'pse', 'other')
export const PAYMENT_STATUSES = values('pending_review', 'confirmed', 'rejected')

// Amenities
export const BOOKING_STATUSES = values('pending', 'approved', 'rejected', 'cancelled')

// Communication
export const ANNOUNCEMENT_AUDIENCES = values('all', 'residents', 'owners', 'council', 'staff')
export const TICKET_TYPES = values('petition', 'complaint', 'claim', 'suggestion', 'maintenance')
export const TICKET_PRIORITIES = values('low', 'medium', 'high', 'urgent')
export const TICKET_STATUSES = values('open', 'in_progress', 'resolved', 'closed')

// Security
export const VISIT_TYPES = values('guest', 'delivery', 'service_provider', 'other')
export const PARCEL_STATUSES = values('pending', 'delivered', 'returned')

// Documents
export const DOCUMENT_CATEGORIES = values('bylaws', 'minutes', 'financial_statement', 'contract', 'policy', 'other')
export const DOCUMENT_VISIBILITIES = values('public', 'council', 'administration')

export type UnitType = ValueOf<typeof UNIT_TYPES>
export type UnitStatus = ValueOf<typeof UNIT_STATUSES>
export type OccupantRelationship = ValueOf<typeof OCCUPANT_RELATIONSHIPS>
export type EnrollmentStatus = ValueOf<typeof ENROLLMENT_STATUSES>
export type TenantStatus = ValueOf<typeof TENANT_STATUSES>
export type PropertyType = ValueOf<typeof PROPERTY_TYPES>
export type DocumentType = ValueOf<typeof DOCUMENT_TYPES>
export type VehicleType = ValueOf<typeof VEHICLE_TYPES>
export type PetSpecies = ValueOf<typeof PET_SPECIES>
export type ChargeStatus = ValueOf<typeof CHARGE_STATUSES>
