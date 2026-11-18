import { UnitOccupantSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { OccupantRelationship } from '@aptoph/shared'
import Unit from '#models/unit'
import User from '#models/user'

export default class UnitOccupant extends UnitOccupantSchema {
  declare relationship: OccupantRelationship

  @belongsTo(() => Unit)
  declare unit: BelongsTo<typeof Unit>

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
