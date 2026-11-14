import { VisitSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { VISIT_TYPES, ValueOf } from '@apartadock/shared'
import Unit from '#models/unit'
import User from '#models/user'

export default class Visit extends VisitSchema {
  declare type: ValueOf<typeof VISIT_TYPES>

  @belongsTo(() => Unit)
  declare unit: BelongsTo<typeof Unit>

  @belongsTo(() => User, { foreignKey: 'authorizedById' })
  declare authorizedBy: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'registeredById' })
  declare registeredBy: BelongsTo<typeof User>
}
