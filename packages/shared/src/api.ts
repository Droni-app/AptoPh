/**
 * Shapes of the JSON returned by the API (apps/api transformers).
 * Dates are ISO strings; numeric(…) columns are strings to keep precision.
 */
import type { EnrollmentRole } from './index.js'
import type {
  BookingStatus,
  ChargeStatus,
  DocumentType,
  ParcelStatus,
  TicketPriority,
  TicketStatus,
  TicketType,
  VisitType,
  EnrollmentStatus,
  OccupantRelationship,
  PropertyType,
  TenantStatus,
  PetSpecies,
  UnitStatus,
  UnitType,
  VehicleType,
} from './domain.js'
import type { ParkingOwnership, VehicleOwnerFields } from './parking.js'

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

/** POST /api/v1/auth/login and /api/v1/auth/signup (`data`) */
export type AuthSession = {
  /** Opaque bearer token (`oat_…`), sent as `Authorization: Bearer <token>` */
  token: string
  type: 'bearer'
  expiresAt: string | null
  user: UserProfile
}

/** POST /api/v1/auth/signup also returns the conjunto it created */
export type SignupSession = AuthSession & { tenantId: string }

export type LoginInput = { email: string; password: string; device?: string }

export type SignupInput = {
  tenantName: string
  city: string
  units: number
  fullName: string
  email: string
  phone: string
  password: string
  acceptTerms: boolean
  device?: string
}

export type UserProfile = {
  id: string
  fullName: string
  email: string
  phone: string | null
  documentType: DocumentType | null
  documentNumber: string | null
  /** null until the person confirms the email (link sent by email) */
  emailVerifiedAt: string | null
  isPlatformAdmin: boolean
  initials: string
  createdAt: string
  updatedAt: string | null
}

/** PATCH /api/v1/account/profile (the email is the login and does not change here) */
export type ProfileInput = {
  fullName: string
  phone: string | null
  documentType: DocumentType | null
  documentNumber: string | null
}

/** PUT /api/v1/account/password */
export type ChangePasswordInput = { currentPassword: string; password: string }

/** GET /api/v1/account/sessions: open sessions (access tokens) of the person */
export type AccountSession = {
  id: string
  /** Label sent at login: "Backoffice", "Portal de residentes"… */
  device: string
  createdAt: string
  lastUsedAt: string | null
  expiresAt: string | null
  current: boolean
}

/** Web app that asks for an email link; the link opens in that app */
export type ClientApp = 'backoffice' | 'web'

/** POST /api/v1/auth/password/forgot */
export type ForgotPasswordInput = { email: string; app?: ClientApp }

/** POST /api/v1/auth/password/reset (answers with an `AuthSession`) */
export type ResetPasswordInput = { token: string; password: string; device?: string }

/** GET /api/v1/invitations/:token */
export type InvitationPreview = {
  tenant: { id: string; name: string }
  role: EnrollmentRole
  roleLabel: string
  title: string | null
  email: string
  fullName: string
  invitedBy: string | null
  /** New accounts create their password when accepting */
  needsPassword: boolean
  expiresAt: string
}

/** POST /api/v1/invitations/accept */
export type AcceptInvitationInput = {
  token: string
  fullName?: string
  password?: string
  /** Terms and data processing policy, recorded as evidence */
  acceptTerms: boolean
  device?: string
}

export type InvitationSession = AuthSession & { tenantId: string; role: EnrollmentRole }

/** POST /api/v1/members */
export type InviteMemberInput = {
  email: string
  fullName: string
  role: EnrollmentRole
  title?: string | null
  startsOn?: string | null
  endsOn?: string | null
  /** Residents: link the account to an occupant of a unit */
  occupantId?: string | null
}

/** PATCH /api/v1/members/:id */
export type UpdateMemberInput = { title?: string | null; startsOn?: string | null; endsOn?: string | null }

/** PATCH /api/v1/members/:id/status */
export type MemberStatusChange = 'active' | 'suspended' | 'revoked'

/** GET/PATCH /api/v1/settings/tenant */
export type TenantSettings = {
  id: string
  name: string
  slug: string
  legalName: string | null
  taxId: string | null
  propertyType: PropertyType
  address: string | null
  city: string | null
  countryCode: string
  timezone: string
  currency: string
}

export type TenantSettingsInput = Pick<
  TenantSettings,
  'name' | 'legalName' | 'taxId' | 'propertyType' | 'address' | 'city'
>

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
  /** Pending invitations: when the last email went out and when its link expires */
  invitationSentAt: string | null
  invitationExpiresAt: string | null
  invitationExpired: boolean
  invitedBy: { id: string; fullName: string } | null
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

export type ResidentVehicle = VehicleOwnerFields & {
  id: string
  plate: string
  type: VehicleType
  brand: string | null
  model: string | null
  color: string | null
}

/** A parking spot the unit owns or holds (docs/parking.md) */
export type ResidentParkingSpot = {
  id: string
  code: string
  vehicleType: VehicleType
  ownership: ParkingOwnership
  location: string | null
  isCovered: boolean
  /** Communal spots: the assignment */
  startsOn: string | null
  endsOn: string | null
  monthlyRate: number | null
  vehiclePlate: string | null
}

export type ResidentPet = {
  id: string
  name: string
  species: PetSpecies
  breed: string | null
  isPotentiallyDangerous: boolean
}

/**
 * Document and phone are only sent for members the viewer can edit (`editable`):
 * family members, domestic workers and others without an account.
 */
export type HouseholdMember = {
  id: string
  fullName: string
  relationship: OccupantRelationship
  isPrimaryContact: boolean
  isBillingResponsible: boolean
  isMe: boolean
  editable: boolean
  documentType: DocumentType | null
  documentNumber: string | null
  phone: string | null
}

/** Relationships residents can give to the household members they add */
export type HouseholdRelationship = Extract<
  OccupantRelationship,
  'family_member' | 'domestic_worker' | 'other'
>

export type ResidentUnitDetail = ResidentUnitSummary & {
  status: UnitStatus
  /** Owners, renters and the primary contact may add or edit household members */
  canManageHousehold: boolean
  household: HouseholdMember[]
  vehicles: ResidentVehicle[]
  parkingSpots: ResidentParkingSpot[]
  /** Whether a vehicle can be registered in the name of someone else */
  allowThirdPartyVehicles: boolean
  pets: ResidentPet[]
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

/** Unit as referenced from visits, parcels, bookings and tickets */
export type UnitRef = {
  id: string
  code: string
  type: UnitType
  building: { id: string; name: string } | null
}

/** Dates are ISO strings with offset */
export type VisitStatus = 'expected' | 'inside' | 'completed' | 'expired'

export type ResidentVisit = {
  id: string
  unit: UnitRef
  visitorName: string
  visitorDocument: string | null
  vehiclePlate: string | null
  type: VisitType
  /** Only while the visit is expected */
  accessCode: string | null
  expectedAt: string | null
  checkedInAt: string | null
  checkedOutAt: string | null
  status: VisitStatus
  /** Announced at the gate, not authorized from the portal */
  fromGate: boolean
  canCancel: boolean
}

export type ResidentParcel = {
  id: string
  unit: UnitRef
  carrier: string | null
  description: string | null
  status: ParcelStatus
  receivedAt: string
  deliveredAt: string | null
  deliveredToName: string | null
}

export type AmenityRules = {
  maxHours?: number
  /** "HH:mm", local to the conjunto */
  opensAt?: string
  closesAt?: string
  /** Weekdays in English, lowercase ("monday") */
  closedOn?: string[]
  depositRequired?: boolean
}

export type ResidentAmenity = {
  id: string
  name: string
  description: string | null
  capacity: number | null
  bookingFee: string | null
  requiresApproval: boolean
  rules: AmenityRules
}

export type ResidentBooking = {
  id: string
  amenity: { id: string; name: string }
  unit: UnitRef
  startsAt: string
  endsAt: string
  guestsCount: number | null
  status: BookingStatus
  bookingFee: string | null
  isMine: boolean
  canCancel: boolean
}

export type ResidentTicket = {
  id: string
  number: number
  type: TicketType
  subject: string
  description: string
  priority: TicketPriority
  status: TicketStatus
  unit: UnitRef | null
  isMine: boolean
  createdAt: string
  updatedAt: string | null
  resolvedAt: string | null
}

export type ResidentTicketComment = {
  id: string
  body: string
  isMine: boolean
  authorName: string
  createdAt: string
}

export type ResidentTicketDetail = ResidentTicket & { comments: ResidentTicketComment[] }

/** GET /api/v1/subscription — plan del conjunto activo */
export type SubscriptionSummary = {
  plan: import('./billing.js').PlanId
  billingCycle: import('./billing.js').BillingCycle
  status: import('./billing.js').SubscriptionStatus
  /** El conjunto puede crear y modificar información (prueba vigente o plan activo) */
  canWrite: boolean
  /** Prueba vencida o pago pendiente: solo lectura hasta activar el plan */
  locked: boolean
  trialEndsAt: string | null
  /** Días que quedan de prueba (0 si venció); `null` fuera de la prueba */
  trialDaysLeft: number | null
  currentPeriodEndsAt: string | null
  /** Se renueva sola con el medio de pago guardado */
  autoRenew: boolean
  /** Con el pago pendiente: hasta cuándo se puede seguir editando */
  graceEndsAt: string | null
  /** Unidades con las que se cotiza: las registradas o, si aún no hay, las declaradas */
  billableUnits: number
}
