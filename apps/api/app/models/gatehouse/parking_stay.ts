import { ParkingStaySchema } from '#database/schema'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type {
  ParkingAuthorization,
  ParkingDay,
  ParkingSettlement,
  ParkingStayStatus,
  ParkingTariff,
  PaymentMethod,
  VehicleType,
} from '@aptoph/shared'
import User from '#models/auth/user'
import Unit from '#models/property/unit'
import Visit from '#models/gatehouse/visit'

/** A vehicle's stay in the visitor parking, from entry to exit. docs/visitor-parking.md */
export default class ParkingStay extends ParkingStaySchema {
  declare status: ParkingStayStatus
  declare vehicleType: VehicleType
  declare authorizationMethod: ParkingAuthorization
  declare tariff: ParkingTariff
  /** pg sends JS arrays as Postgres arrays: store them as JSON text */
  @column({ prepare: (value: ParkingDay[] | null) => (value ? JSON.stringify(value) : null) })
  declare days: ParkingDay[] | null
  declare settlement: ParkingSettlement | null
  declare paymentMethod: PaymentMethod | null

  @belongsTo(() => Unit)
  declare unit: BelongsTo<typeof Unit>

  @belongsTo(() => Visit)
  declare visit: BelongsTo<typeof Visit>

  @belongsTo(() => User, { foreignKey: 'enteredById' })
  declare enteredBy: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'exitedById' })
  declare exitedBy: BelongsTo<typeof User>
}
