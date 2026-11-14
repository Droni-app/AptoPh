/**
 * Shapes of the JSON returned by the API (apps/api transformers).
 * Dates are ISO strings; numeric(…) columns are strings to keep precision.
 */
import type { EnrollmentRole } from './index.js'
import type {
  ChargeStatus,
  DocumentType,
  EnrollmentStatus,
  OccupantRelationship,
  PropertyType,
  TenantStatus,
  PetSpecies,
  UnitStatus,
  UnitType,
  VehicleType,
} from './domain.js'

export type ApiItem<T> = { data: T }

export type ApiPaginated<T> = {
  data: T[]
  metadata: {
    total: number
    perPage: number
    currentPage: number
    lastPage: number
    firstPage: number
  }
}

/** Validation / business error body (HTTP 4xx) */
export type ApiErrorBody = {
  errors: Array<{ message: string; field?: string; rule?: string }>
}

/** OAuth token endpoint response */
export type OAuthTokens = {
  access_token: string
  token_type: 'Bearer'
  expires_in: number
  refresh_token: string
  scope?: string
}

export type UserProfile = {
  id: string
  fullName: string
  email: string
  phone: string | null
  isPlatformAdmin: boolean
  initials: string
  createdAt: string
  updatedAt: string | null
}

export type TenantSummary = {
  id: string
  name: string
  slug: string
  propertyType: PropertyType
  city: string | null
  countryCode: string
  timezone: string
  currency: string
  status: TenantStatus
  roles: EnrollmentRole[]
}

export type Building = {
  id: string
  name: string
  floors: number | null
  sortOrder: number
  unitsCount?: number
  createdAt: string
  updatedAt: string | null
}

export type UnitOccupant = {
  id: string
  unitId: string
  userId: string | null
  fullName: string
  documentType: DocumentType | null
  documentNumber: string | null
  phone: string | null
  email: string | null
  relationship: OccupantRelationship
  isPrimaryContact: boolean
  isBillingResponsible: boolean
  startsOn: string | null
  endsOn: string | null
  createdAt: string
}

export type Unit = {
  id: string
  buildingId: string | null
  code: string
  type: UnitType
  floor: number | null
  privateArea: string | null
  ownershipCoefficient: string
  parentUnitId: string | null
  status: UnitStatus
  notes: string | null
  building?: Building | null
  occupants?: UnitOccupant[]
  occupantsCount?: number
  createdAt: string
  updatedAt: string | null
}

export type Member = {
  id: string
  role: EnrollmentRole
  status: EnrollmentStatus
  title: string | null
  startsOn: string | null
  endsOn: string | null
  acceptedAt: string | null
  createdAt: string
  user: { id: string; fullName: string; email: string; phone: string | null } | null
}

export type DashboardSummary = {
  buildings: number
  units: number
  occupiedUnits: number
  occupants: number
  staff: number
  openTickets: number
}

/*
 * Resident app (GET /api/v1/resident/*). Only the units the user occupies.
 */

/** Money amounts are decimal strings ("350000.00") in the tenant currency */
export type UnitBalance = { pending: string; overdue: string; openCharges: number }

export type ResidentUnitSummary = {
  id: string
  code: string
  type: UnitType
  floor: number | null
  privateArea: string | null
  ownershipCoefficient: string
  building: { id: string; name: string } | null
  relationship: OccupantRelationship
  isPrimaryContact: boolean
  isBillingResponsible: boolean
  balance: UnitBalance
}

export type ResidentHome = {
  tenant: {
    id: string
    name: string
    legalName: string | null
    address: string | null
    city: string | null
    currency: string
    buildingsCount: number
    unitsCount: number
  }
  units: ResidentUnitSummary[]
}

export type ResidentUnitDetail = ResidentUnitSummary & {
  status: UnitStatus
  household: Array<{
    id: string
    fullName: string
    relationship: OccupantRelationship
    isPrimaryContact: boolean
    isBillingResponsible: boolean
    isMe: boolean
  }>
  vehicles: Array<{
    id: string
    plate: string
    type: VehicleType
    brand: string | null
    model: string | null
    color: string | null
  }>
  pets: Array<{ id: string; name: string; species: PetSpecies; breed: string | null }>
  openCharges: Array<{
    id: string
    concept: string
    description: string | null
    period: string
    amount: string
    balance: string
    dueOn: string
    status: ChargeStatus
    isOverdue: boolean
  }>
}
