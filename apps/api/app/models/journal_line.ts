import { JournalLineSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import JournalEntry from '#models/journal_entry'
import LedgerAccount from '#models/ledger_account'
import Unit from '#models/unit'
import Vendor from '#models/vendor'

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
