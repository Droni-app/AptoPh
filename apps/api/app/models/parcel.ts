import { ParcelSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { PARCEL_STATUSES, ValueOf } from '@apartadock/shared'
import Unit from '#models/unit'
import User from '#models/user'

export default class Parcel extends ParcelSchema {
  declare status: ValueOf<typeof PARCEL_STATUSES>

  @belongsTo(() => Unit)
  declare unit: BelongsTo<typeof Unit>

  @belongsTo(() => User, { foreignKey: 'receivedById' })
  declare receivedBy: BelongsTo<typeof User>
}
