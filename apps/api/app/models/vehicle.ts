import { VehicleSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { VEHICLE_TYPES, ValueOf } from '@aptoph/shared'
import Unit from '#models/unit'

export default class Vehicle extends VehicleSchema {
  declare type: ValueOf<typeof VEHICLE_TYPES>

  @belongsTo(() => Unit)
  declare unit: BelongsTo<typeof Unit>

  @belongsTo(() => Unit, { foreignKey: 'parkingUnitId' })
  declare parkingUnit: BelongsTo<typeof Unit>
}
