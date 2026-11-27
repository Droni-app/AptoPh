import { PaymentSchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import type { PaymentMethod, PaymentStatus } from '@aptoph/shared'
import Unit from '#models/property/unit'
import User from '#models/auth/user'
import PaymentAllocation from '#models/finance/payment_allocation'
import CashAccount from '#models/finance/cash_account'

export default class Payment extends PaymentSchema {
  declare method: PaymentMethod
  declare status: PaymentStatus

  @belongsTo(() => Unit)
  declare unit: BelongsTo<typeof Unit>

  @belongsTo(() => User, { foreignKey: 'registeredById' })
  declare registeredBy: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'confirmedById' })
  declare confirmedBy: BelongsTo<typeof User>

  @belongsTo(() => CashAccount)
  declare cashAccount: BelongsTo<typeof CashAccount>

  @hasMany(() => PaymentAllocation)
  declare allocations: HasMany<typeof PaymentAllocation>
}
