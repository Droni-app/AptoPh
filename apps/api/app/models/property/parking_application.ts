import { ParkingApplicationSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { ParkingApplicationStatus, VehicleType } from '@aptoph/shared'
import User from '#models/auth/user'
import Unit from '#models/property/unit'
import Vehicle from '#models/property/vehicle'
import ParkingLottery from '#models/property/parking_lottery'
import ParkingSpot from '#models/property/parking_spot'

/** A unit applying for a communal spot; after the draw, the waiting list */
export default class ParkingApplication extends ParkingApplicationSchema {
  declare status: ParkingApplicationStatus
  declare vehicleType: VehicleType

  @belongsTo(() => ParkingLottery, { foreignKey: 'lotteryId' })
  declare lottery: BelongsTo<typeof ParkingLottery>

  @belongsTo(() => Unit)
  declare unit: BelongsTo<typeof Unit>

  @belongsTo(() => Vehicle)
  declare vehicle: BelongsTo<typeof Vehicle>

  @belongsTo(() => ParkingSpot, { foreignKey: 'spotId' })
  declare spot: BelongsTo<typeof ParkingSpot>

  @belongsTo(() => User, { foreignKey: 'appliedById' })
  declare appliedBy: BelongsTo<typeof User>
}
