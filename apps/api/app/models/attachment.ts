import { AttachmentSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { AttachmentOwnerType } from '@aptoph/shared'
import User from '#models/user'

/** A file attached to a record. docs/files.md */
export default class Attachment extends AttachmentSchema {
  declare ownerType: AttachmentOwnerType

  @belongsTo(() => User, { foreignKey: 'uploadedById' })
  declare uploadedBy: BelongsTo<typeof User>
}
