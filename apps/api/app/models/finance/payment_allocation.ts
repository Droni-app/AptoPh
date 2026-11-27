import { PaymentAllocationSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Payment from '#models/finance/payment'
import Charge from '#models/finance/charge'

export default class PaymentAllocation extends PaymentAllocationSchema {
  @belongsTo(() => Payment)
  declare payment: BelongsTo<typeof Payment>

  @belongsTo(() => Charge)
  declare charge: BelongsTo<typeof Charge>
}
