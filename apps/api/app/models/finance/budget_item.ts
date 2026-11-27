import { BudgetItemSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Budget from '#models/finance/budget'
import LedgerAccount from '#models/finance/ledger_account'

export default class BudgetItem extends BudgetItemSchema {
  @belongsTo(() => Budget)
  declare budget: BelongsTo<typeof Budget>

  @belongsTo(() => LedgerAccount, { foreignKey: 'accountId' })
  declare account: BelongsTo<typeof LedgerAccount>
}
