import { ParkingAssignmentSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { ParkingAssignmentStatus, ParkingEndReason } from '@aptoph/shared'
import User from '#models/auth/user'
import Unit from '#models/property/unit'
import Vehicle from '#models/property/vehicle'
import ParkingSpot from '#models/property/parking_spot'

/** A communal spot held by a unit for a while. docs/parking.md */
export default class ParkingAssignment extends ParkingAssignmentSchema {
  declare status: ParkingAssignmentStatus
  declare endReason: ParkingEndReason | null

  @belongsTo(() => ParkingSpot, { foreignKey: 'spotId' })
  declare spot: BelongsTo<typeof ParkingSpot>

  @belongsTo(() => Unit)
  declare unit: BelongsTo<typeof Unit>

  @belongsTo(() => Vehicle)
  declare vehicle: BelongsTo<typeof Vehicle>

  @belongsTo(() => User, { foreignKey: 'createdById' })
  declare createdBy: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'endedById' })
  declare endedBy: BelongsTo<typeof User>
}
