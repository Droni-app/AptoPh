import { AmenitySchema } from '#database/schema'
import { hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import AmenityBooking from '#models/amenity_booking'

export default class Amenity extends AmenitySchema {
  @hasMany(() => AmenityBooking)
  declare bookings: HasMany<typeof AmenityBooking>
}
