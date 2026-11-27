import { JournalEntrySchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import type { JournalEntryType } from '@aptoph/shared'
import JournalLine from '#models/finance/journal_line'
import User from '#models/auth/user'

/** Comprobante contable: balanced, numbered and immutable (reversed, never edited) */
export default class JournalEntry extends JournalEntrySchema {
  declare type: JournalEntryType

  @hasMany(() => JournalLine, { foreignKey: 'entryId' })
  declare lines: HasMany<typeof JournalLine>

  @belongsTo(() => User, { foreignKey: 'createdById' })
  declare createdBy: BelongsTo<typeof User>
}
