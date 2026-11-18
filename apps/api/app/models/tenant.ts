import { TenantSchema } from '#database/schema'
import { hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import type { TenantStatus } from '@aptoph/shared'
import Enrollment from '#models/enrollment'
import Building from '#models/building'
import Unit from '#models/unit'
import UnitOccupant from '#models/unit_occupant'
import Vehicle from '#models/vehicle'
import Pet from '#models/pet'
import ChargeConcept from '#models/charge_concept'
import Charge from '#models/charge'
import Payment from '#models/payment'
import PaymentAllocation from '#models/payment_allocation'
import Amenity from '#models/amenity'
import AmenityBooking from '#models/amenity_booking'
import Announcement from '#models/announcement'
import AnnouncementRead from '#models/announcement_read'
import Ticket from '#models/ticket'
import TicketComment from '#models/ticket_comment'
import Visit from '#models/visit'
import Parcel from '#models/parcel'
import Document from '#models/document'
import AuditLog from '#models/audit_log'

/**
 * A tenant is a horizontal-property community (conjunto).
 *
 * Tenant-scoped data must always be read and written through these relations,
 * e.g. `ctx.tenant.related('units').query()` / `.create()`: Lucid adds the
 * `tenant_id` filter and value automatically, so records never cross tenants.
 */
export default class Tenant extends TenantSchema {
  declare status: TenantStatus

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

  /**
   * Tenants that can be operated (login allowed)
   */
  get isOperational() {
    return ['trial', 'active'].includes(this.status) && this.deletedAt === null
  }
}
