import { AmenityBookingSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { AmenityPaymentMode, BookingStatus, BookingType, DepositStatus } from '@aptoph/shared'
import Amenity from '#models/amenities/amenity'
import Unit from '#models/property/unit'
import User from '#models/auth/user'
import Charge from '#models/finance/charge'
import Payment from '#models/finance/payment'

export default class AmenityBooking extends AmenityBookingSchema {
  declare status: BookingStatus
  declare bookingType: BookingType
  declare paymentMode: AmenityPaymentMode | null
  declare depositStatus: DepositStatus | null

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

  @belongsTo(() => Payment)
  declare payment: BelongsTo<typeof Payment>
}
