import { JournalLineSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import JournalEntry from '#models/finance/journal_entry'
import LedgerAccount from '#models/finance/ledger_account'
import Unit from '#models/property/unit'
import Vendor from '#models/finance/vendor'

export default class JournalLine extends JournalLineSchema {
  @belongsTo(() => JournalEntry, { foreignKey: 'entryId' })
  declare entry: BelongsTo<typeof JournalEntry>

  @belongsTo(() => LedgerAccount, { foreignKey: 'accountId' })
  declare account: BelongsTo<typeof LedgerAccount>

  @belongsTo(() => Unit)
  declare unit: BelongsTo<typeof Unit>

  @belongsTo(() => Vendor)
  declare vendor: BelongsTo<typeof Vendor>
}
