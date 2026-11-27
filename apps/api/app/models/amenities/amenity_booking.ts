import { AmenityBookingSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { BOOKING_STATUSES, ValueOf } from '@aptoph/shared'
import Amenity from '#models/amenities/amenity'
import Unit from '#models/property/unit'
import User from '#models/auth/user'
import Charge from '#models/finance/charge'

export default class AmenityBooking extends AmenityBookingSchema {
  declare status: ValueOf<typeof BOOKING_STATUSES>

  @belongsTo(() => Amenity)
  declare amenity: BelongsTo<typeof Amenity>

  @belongsTo(() => Unit)
  declare unit: BelongsTo<typeof Unit>

  @belongsTo(() => User, { foreignKey: 'requestedById' })
  declare requestedBy: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'reviewedById' })
  declare reviewedBy: BelongsTo<typeof User>

  @belongsTo(() => Charge)
  declare charge: BelongsTo<typeof Charge>
}
