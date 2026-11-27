import { BillingPeriodSchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import type { BillingPeriodStatus } from '@aptoph/shared'
import Charge from '#models/finance/charge'
import User from '#models/auth/user'

/** One billed month (`period` is its first day) */
export default class BillingPeriod extends BillingPeriodSchema {
  declare status: BillingPeriodStatus

  @hasMany(() => Charge)
  declare charges: HasMany<typeof Charge>

  @belongsTo(() => User, { foreignKey: 'generatedById' })
  declare generatedBy: BelongsTo<typeof User>
}
