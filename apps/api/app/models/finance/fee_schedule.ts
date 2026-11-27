import { FeeScheduleSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { FeeMethod } from '@aptoph/shared'
import ChargeConcept from '#models/finance/charge_concept'
import User from '#models/auth/user'

/** One run of the fee calculator: the history of how fees were set */
export default class FeeSchedule extends FeeScheduleSchema {
  declare method: FeeMethod

  @belongsTo(() => ChargeConcept)
  declare chargeConcept: BelongsTo<typeof ChargeConcept>

  @belongsTo(() => User, { foreignKey: 'createdById' })
  declare createdBy: BelongsTo<typeof User>
}
