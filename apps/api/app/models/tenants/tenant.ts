import { TenantSchema } from '#database/schema'
import { hasMany, hasOne } from '@adonisjs/lucid/orm'
import type { HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import type { TenantStatus } from '@aptoph/shared'
import Enrollment from '#models/tenants/enrollment'
import Building from '#models/property/building'
import Unit from '#models/property/unit'
import UnitOccupant from '#models/property/unit_occupant'
import Vehicle from '#models/property/vehicle'
import Pet from '#models/property/pet'
import ChargeConcept from '#models/finance/charge_concept'
import Charge from '#models/finance/charge'
import Payment from '#models/finance/payment'
import PaymentAllocation from '#models/finance/payment_allocation'
import Amenity from '#models/amenities/amenity'
import AmenityBooking from '#models/amenities/amenity_booking'
import Announcement from '#models/announcements/announcement'
import AnnouncementRead from '#models/announcements/announcement_read'
import Ticket from '#models/tickets/ticket'
import ParkingStay from '#models/gatehouse/parking_stay'
import TicketComment from '#models/tickets/ticket_comment'
import Visit from '#models/gatehouse/visit'
import Parcel from '#models/gatehouse/parcel'
import Document from '#models/documents/document'
import AuditLog from '#models/tenants/audit_log'
import Subscription from '#models/billing/subscription'
import LedgerAccount from '#models/finance/ledger_account'
import JournalEntry from '#models/finance/journal_entry'
import JournalLine from '#models/finance/journal_line'
import CashAccount from '#models/finance/cash_account'
import Vendor from '#models/finance/vendor'
import Bill from '#models/finance/bill'
import VendorPayment from '#models/finance/vendor_payment'
import ContributionModule from '#models/finance/contribution_module'
import Budget from '#models/finance/budget'
import FeeSchedule from '#models/finance/fee_schedule'
import RecurringCharge from '#models/finance/recurring_charge'
import BillingPeriod from '#models/finance/billing_period'
import ChargeAdjustment from '#models/finance/charge_adjustment'

/**
 * A tenant is a horizontal-property community (conjunto).
 *
 * Tenant-scoped data must always be read and written through these relations,
 * e.g. `ctx.tenant.related('units').query()` / `.create()`: Lucid adds the
 * `tenant_id` filter and value automatically, so records never cross tenants.
 */
export default class Tenant extends TenantSchema {
  declare status: TenantStatus

  @hasOne(() => Subscription)
  declare subscription: HasOne<typeof Subscription>

  @hasMany(() => Enrollment)
  declare enrollments: HasMany<typeof Enrollment>

  @hasMany(() => Building)
  declare buildings: HasMany<typeof Building>

  @hasMany(() => Unit)
  declare units: HasMany<typeof Unit>

  @hasMany(() => UnitOccupant)
  declare unitOccupants: HasMany<typeof UnitOccupant>

  @hasMany(() => Vehicle)
  declare vehicles: HasMany<typeof Vehicle>

  @hasMany(() => Pet)
  declare pets: HasMany<typeof Pet>

  @hasMany(() => ChargeConcept)
  declare chargeConcepts: HasMany<typeof ChargeConcept>

  @hasMany(() => Charge)
  declare charges: HasMany<typeof Charge>

  @hasMany(() => Payment)
  declare payments: HasMany<typeof Payment>

  @hasMany(() => PaymentAllocation)
  declare paymentAllocations: HasMany<typeof PaymentAllocation>

  @hasMany(() => Amenity)
  declare amenities: HasMany<typeof Amenity>

  @hasMany(() => AmenityBooking)
  declare amenityBookings: HasMany<typeof AmenityBooking>

  @hasMany(() => Announcement)
  declare announcements: HasMany<typeof Announcement>

  @hasMany(() => AnnouncementRead)
  declare announcementReads: HasMany<typeof AnnouncementRead>

  @hasMany(() => ParkingStay)
  declare parkingStays: HasMany<typeof ParkingStay>

  @hasMany(() => Ticket)
  declare tickets: HasMany<typeof Ticket>

  @hasMany(() => TicketComment)
  declare ticketComments: HasMany<typeof TicketComment>

  @hasMany(() => Visit)
  declare visits: HasMany<typeof Visit>

  @hasMany(() => Parcel)
  declare parcels: HasMany<typeof Parcel>

  @hasMany(() => Document)
  declare documents: HasMany<typeof Document>

  @hasMany(() => AuditLog)
  declare auditLogs: HasMany<typeof AuditLog>

  @hasMany(() => LedgerAccount)
  declare ledgerAccounts: HasMany<typeof LedgerAccount>

  @hasMany(() => JournalEntry)
  declare journalEntries: HasMany<typeof JournalEntry>

  @hasMany(() => JournalLine)
  declare journalLines: HasMany<typeof JournalLine>

  @hasMany(() => CashAccount)
  declare cashAccounts: HasMany<typeof CashAccount>

  @hasMany(() => Vendor)
  declare vendors: HasMany<typeof Vendor>

  @hasMany(() => Bill)
  declare bills: HasMany<typeof Bill>

  @hasMany(() => VendorPayment)
  declare vendorPayments: HasMany<typeof VendorPayment>

  @hasMany(() => ContributionModule)
  declare contributionModules: HasMany<typeof ContributionModule>

  @hasMany(() => Budget)
  declare budgets: HasMany<typeof Budget>

  @hasMany(() => FeeSchedule)
  declare feeSchedules: HasMany<typeof FeeSchedule>

  @hasMany(() => RecurringCharge)
  declare recurringCharges: HasMany<typeof RecurringCharge>

  @hasMany(() => BillingPeriod)
  declare billingPeriods: HasMany<typeof BillingPeriod>

  @hasMany(() => ChargeAdjustment)
  declare chargeAdjustments: HasMany<typeof ChargeAdjustment>

  /**
   * Tenants that can be operated (login allowed)
   */
  get isOperational() {
    return ['trial', 'active'].includes(this.status) && this.deletedAt === null
  }
}
