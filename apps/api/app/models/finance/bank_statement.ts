import { BankStatementSchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import CashAccount from '#models/finance/cash_account'
import BankStatementLine from '#models/finance/bank_statement_line'
import User from '#models/auth/user'

/** An imported bank statement of a cash account */
export default class BankStatement extends BankStatementSchema {
  @belongsTo(() => CashAccount)
  declare cashAccount: BelongsTo<typeof CashAccount>

  @belongsTo(() => User, { foreignKey: 'importedById' })
  declare importedBy: BelongsTo<typeof User>

  @hasMany(() => BankStatementLine)
  declare lines: HasMany<typeof BankStatementLine>
}
