import { BillLineSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import LedgerAccount from '#models/ledger_account'

export default class BillLine extends BillLineSchema {
  @belongsTo(() => LedgerAccount, { foreignKey: 'accountId' })
  declare account: BelongsTo<typeof LedgerAccount>
}
