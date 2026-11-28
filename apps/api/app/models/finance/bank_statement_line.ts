import { BankStatementLineSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { BankLineStatus } from '@aptoph/shared'
import BankStatement from '#models/finance/bank_statement'
import Payment from '#models/finance/payment'
import VendorPayment from '#models/finance/vendor_payment'
import User from '#models/auth/user'

/** A movement of a bank statement and what it was reconciled with */
export default class BankStatementLine extends BankStatementLineSchema {
  declare status: BankLineStatus

  @belongsTo(() => BankStatement)
  declare statement: BelongsTo<typeof BankStatement>

  @belongsTo(() => Payment)
  declare payment: BelongsTo<typeof Payment>

  @belongsTo(() => VendorPayment)
  declare vendorPayment: BelongsTo<typeof VendorPayment>

  @belongsTo(() => User, { foreignKey: 'reconciledById' })
  declare reconciledBy: BelongsTo<typeof User>
}
