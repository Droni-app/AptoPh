import { ChargeSchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import type { ChargeSource, ChargeStatus } from '@aptoph/shared'
import Unit from '#models/property/unit'
import ChargeConcept from '#models/finance/charge_concept'
import User from '#models/auth/user'
import PaymentAllocation from '#models/finance/payment_allocation'
import ChargeAdjustment from '#models/finance/charge_adjustment'
import BillingPeriod from '#models/finance/billing_period'

export default class Charge extends ChargeSchema {
  declare status: ChargeStatus
  declare sourceType: ChargeSource | null

  @belongsTo(() => Unit)
  declare unit: BelongsTo<typeof Unit>

  @belongsTo(() => ChargeConcept)
  declare chargeConcept: BelongsTo<typeof ChargeConcept>

  @belongsTo(() => User, { foreignKey: 'createdById' })
  declare createdBy: BelongsTo<typeof User>

  @hasMany(() => PaymentAllocation)
  declare allocations: HasMany<typeof PaymentAllocation>

  @hasMany(() => ChargeAdjustment)
  declare adjustments: HasMany<typeof ChargeAdjustment>

  @belongsTo(() => BillingPeriod)
  declare billingPeriod: BelongsTo<typeof BillingPeriod>
}
