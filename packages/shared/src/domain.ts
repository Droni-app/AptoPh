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
/** Single-use tokens sent by email */
export const USER_TOKEN_TYPES = values('password_reset', 'email_verification')

// Physical structure
export const UNIT_TYPES = values('apartment', 'house', 'commercial', 'parking', 'storage')
export const UNIT_STATUSES = values('occupied', 'vacant', 'under_construction')
export const OCCUPANT_RELATIONSHIPS = values('owner', 'renter', 'family_member', 'domestic_worker', 'other')
export const DOCUMENT_TYPES = values('CC', 'CE', 'NIT', 'PP', 'TI')
export const VEHICLE_TYPES = values('car', 'motorcycle', 'bicycle', 'other')
export const PET_SPECIES = values('dog', 'cat', 'other')

// Finance (see docs/finance.md)
export const CHARGE_CONCEPT_TYPES = values(
  'ordinary_fee',
  'extraordinary_fee',
  'interest',
  'fine',
  'parking',
  'visitor_parking',
  'amenity_booking',
  'service',
  'opening_balance',
  'other',
)
/** @deprecated Fee calculation lives in fee schedules (only used by the first migration) */
export const CHARGE_CALCULATIONS = values('fixed', 'by_coefficient', 'by_area')
export const CHARGE_STATUSES = values('pending', 'partially_paid', 'paid', 'cancelled')
/** Where a charge comes from; future modules create charges with their own source */
export const CHARGE_SOURCES = values(
  'recurring',
  'interest',
  'manual',
  'parking',
  'visitor_parking',
  'amenity_booking',
)
export const CHARGE_ADJUSTMENT_TYPES = values('early_payment_discount', 'credit_note', 'cancellation')
export const PAYMENT_METHODS = values('cash', 'bank_transfer', 'card', 'pse', 'consignment', 'check', 'other')
export const PAYMENT_STATUSES = values('pending_review', 'confirmed', 'rejected', 'reversed')
export const PAYMENT_APPLICATION_ORDERS = values('interest_first', 'oldest_first')
export const FEE_METHODS = values('coefficient', 'module', 'area', 'equal', 'fixed_by_type')
export const ROUNDING_MODES = values('nearest', 'up')
export const ROUNDING_STEPS = [1, 10, 50, 100, 1000] as const
export const BILLING_PERIOD_STATUSES = values('open', 'closed')

// Accounting
export const ACCOUNT_CLASSES = values('asset', 'liability', 'equity', 'income', 'expense')
export const JOURNAL_ENTRY_TYPES = values(
  'billing',
  'charge',
  'charge_adjustment',
  'payment',
  'credit_application',
  'payment_reversal',
  'bill',
  'vendor_payment',
  'transfer',
  'reserve_fund',
  'opening',
  'manual',
  'reversal',
  // Parqueadero de visitantes pagado en portería
  'visitor_parking',
)
export const CASH_ACCOUNT_TYPES = values('bank', 'cash')
export const BANK_ACCOUNT_KINDS = values('savings', 'checking')
export const BILL_STATUSES = values('pending', 'partially_paid', 'paid', 'cancelled')
export const VENDOR_PAYMENT_STATUSES = values('confirmed', 'reversed')
export const BUDGET_STATUSES = values('draft', 'approved')
export const THIRD_PARTY_TYPES = values('unit', 'vendor')

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
export type UserTokenType = ValueOf<typeof USER_TOKEN_TYPES>
export type TenantStatus = ValueOf<typeof TENANT_STATUSES>
export type PropertyType = ValueOf<typeof PROPERTY_TYPES>
export type DocumentType = ValueOf<typeof DOCUMENT_TYPES>
export type VehicleType = ValueOf<typeof VEHICLE_TYPES>
export type PetSpecies = ValueOf<typeof PET_SPECIES>
export type ChargeStatus = ValueOf<typeof CHARGE_STATUSES>
export type ChargeConceptType = ValueOf<typeof CHARGE_CONCEPT_TYPES>
export type ChargeSource = ValueOf<typeof CHARGE_SOURCES>
export type ChargeAdjustmentType = ValueOf<typeof CHARGE_ADJUSTMENT_TYPES>
export type PaymentMethod = ValueOf<typeof PAYMENT_METHODS>
export type PaymentStatus = ValueOf<typeof PAYMENT_STATUSES>
export type PaymentApplicationOrder = ValueOf<typeof PAYMENT_APPLICATION_ORDERS>
export type FeeMethod = ValueOf<typeof FEE_METHODS>
export type RoundingMode = ValueOf<typeof ROUNDING_MODES>
export type RoundingStep = (typeof ROUNDING_STEPS)[number]
export type BillingPeriodStatus = ValueOf<typeof BILLING_PERIOD_STATUSES>
export type AccountClass = ValueOf<typeof ACCOUNT_CLASSES>
export type JournalEntryType = ValueOf<typeof JOURNAL_ENTRY_TYPES>
export type CashAccountType = ValueOf<typeof CASH_ACCOUNT_TYPES>
export type BankAccountKind = ValueOf<typeof BANK_ACCOUNT_KINDS>
export type BillStatus = ValueOf<typeof BILL_STATUSES>
export type VendorPaymentStatus = ValueOf<typeof VENDOR_PAYMENT_STATUSES>
export type BudgetStatus = ValueOf<typeof BUDGET_STATUSES>
export type ThirdPartyType = ValueOf<typeof THIRD_PARTY_TYPES>
export type VisitType = ValueOf<typeof VISIT_TYPES>
export type ParcelStatus = ValueOf<typeof PARCEL_STATUSES>
export type BookingStatus = ValueOf<typeof BOOKING_STATUSES>
export type TicketType = ValueOf<typeof TICKET_TYPES>
export type TicketPriority = ValueOf<typeof TICKET_PRIORITIES>
export type TicketStatus = ValueOf<typeof TICKET_STATUSES>
