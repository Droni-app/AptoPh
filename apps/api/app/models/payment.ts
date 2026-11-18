import { PaymentSchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import type { PAYMENT_METHODS, PAYMENT_STATUSES, ValueOf } from '@aptoph/shared'
import Unit from '#models/unit'
import User from '#models/user'
import PaymentAllocation from '#models/payment_allocation'

export default class Payment extends PaymentSchema {
  declare method: ValueOf<typeof PAYMENT_METHODS>
  declare status: ValueOf<typeof PAYMENT_STATUSES>

  @belongsTo(() => Unit)
  declare unit: BelongsTo<typeof Unit>

  @belongsTo(() => User, { foreignKey: 'registeredById' })
  declare registeredBy: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'confirmedById' })
  declare confirmedBy: BelongsTo<typeof User>

  @hasMany(() => PaymentAllocation)
  declare allocations: HasMany<typeof PaymentAllocation>
}
