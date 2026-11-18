import { ChargeAdjustmentSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { ChargeAdjustmentType } from '@aptoph/shared'
import Charge from '#models/charge'
import User from '#models/user'

/** Rebaja de un cargo: early payment discount, credit note or cancellation */
export default class ChargeAdjustment extends ChargeAdjustmentSchema {
  declare type: ChargeAdjustmentType

  @belongsTo(() => Charge)
  declare charge: BelongsTo<typeof Charge>

  @belongsTo(() => User, { foreignKey: 'createdById' })
  declare createdBy: BelongsTo<typeof User>
}
