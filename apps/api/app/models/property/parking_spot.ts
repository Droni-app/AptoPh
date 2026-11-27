import { ParkingSpotSchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import type { ParkingOwnership, VehicleType } from '@aptoph/shared'
import Unit from '#models/property/unit'
import ParkingAssignment from '#models/property/parking_assignment'

/** A parking spot of the conjunto, private or communal. docs/parking.md */
export default class ParkingSpot extends ParkingSpotSchema {
  declare vehicleType: VehicleType
  declare ownership: ParkingOwnership

  @belongsTo(() => Unit, { foreignKey: 'ownerUnitId' })
  declare ownerUnit: BelongsTo<typeof Unit>

  @belongsTo(() => Unit, { foreignKey: 'propertyUnitId' })
  declare propertyUnit: BelongsTo<typeof Unit>

  @hasMany(() => ParkingAssignment, { foreignKey: 'spotId' })
  declare assignments: HasMany<typeof ParkingAssignment>
}
