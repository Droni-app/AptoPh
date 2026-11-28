import { SurveyResponseSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/auth/user'
import Unit from '#models/property/unit'

/** The vote of a unit: one per survey, given by one of its owners */
export default class SurveyResponse extends SurveyResponseSchema {
  @belongsTo(() => Unit)
  declare unit: BelongsTo<typeof Unit>

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
