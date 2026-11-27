import { VehicleSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type {
  DocumentType,
  VEHICLE_TYPES,
  ValueOf,
  VehicleOwnerRelationship,
  VehicleOwnerType,
} from '@aptoph/shared'
import Unit from '#models/property/unit'

export default class Vehicle extends VehicleSchema {
  declare type: ValueOf<typeof VEHICLE_TYPES>
  declare ownerType: VehicleOwnerType
  declare ownerDocumentType: DocumentType | null
  declare ownerRelationship: VehicleOwnerRelationship | null

  @belongsTo(() => Unit)
  declare unit: BelongsTo<typeof Unit>

  @belongsTo(() => Unit, { foreignKey: 'parkingUnitId' })
  declare parkingUnit: BelongsTo<typeof Unit>
}
