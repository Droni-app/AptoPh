import { LegalAcceptanceSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { LegalDocumentId } from '@aptoph/shared'
import User from '#models/auth/user'

export type LegalAcceptanceContext = 'signup' | 'invitation'

export default class LegalAcceptance extends LegalAcceptanceSchema {
  declare document: LegalDocumentId
  declare context: LegalAcceptanceContext

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
