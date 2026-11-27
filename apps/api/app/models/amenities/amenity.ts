import { AmenitySchema } from '#database/schema'
import { hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import type { AmenityPaymentMode, BookingMode } from '@aptoph/shared'
import AmenityBooking from '#models/amenities/amenity_booking'

export default class Amenity extends AmenitySchema {
  declare bookingMode: BookingMode
  declare paymentMode: AmenityPaymentMode

  @hasMany(() => AmenityBooking)
  declare bookings: HasMany<typeof AmenityBooking>
}
