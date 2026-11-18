import { ChargeSchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import type { CHARGE_STATUSES, ValueOf } from '@aptoph/shared'
import Unit from '#models/unit'
import ChargeConcept from '#models/charge_concept'
import User from '#models/user'
import PaymentAllocation from '#models/payment_allocation'

export default class Charge extends ChargeSchema {
  declare status: ValueOf<typeof CHARGE_STATUSES>

  @belongsTo(() => Unit)
  declare unit: BelongsTo<typeof Unit>

  @belongsTo(() => ChargeConcept)
  declare chargeConcept: BelongsTo<typeof ChargeConcept>

  @belongsTo(() => User, { foreignKey: 'createdById' })
  declare createdBy: BelongsTo<typeof User>

  @hasMany(() => PaymentAllocation)
  declare allocations: HasMany<typeof PaymentAllocation>
}
