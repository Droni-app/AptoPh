import { DocumentAccessLogSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/auth/user'

/** Who opened or downloaded a file of a document */
export default class DocumentAccessLog extends DocumentAccessLogSchema {
  declare action: 'view' | 'download'

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
