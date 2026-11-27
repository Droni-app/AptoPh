import { ParcelSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { PARCEL_STATUSES, ValueOf } from '@aptoph/shared'
import Unit from '#models/property/unit'
import User from '#models/auth/user'

export default class Parcel extends ParcelSchema {
  declare status: ValueOf<typeof PARCEL_STATUSES>

  @belongsTo(() => Unit)
  declare unit: BelongsTo<typeof Unit>

  @belongsTo(() => User, { foreignKey: 'receivedById' })
  declare receivedBy: BelongsTo<typeof User>
}
