import { DocumentSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { DOCUMENT_CATEGORIES, DOCUMENT_VISIBILITIES, ValueOf } from '@apartadock/shared'
import User from '#models/user'

export default class Document extends DocumentSchema {
  declare category: ValueOf<typeof DOCUMENT_CATEGORIES>
  declare visibility: ValueOf<typeof DOCUMENT_VISIBILITIES>

  @belongsTo(() => User, { foreignKey: 'uploadedById' })
  declare uploadedBy: BelongsTo<typeof User>
}
