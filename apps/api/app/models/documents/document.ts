import { DocumentSchema } from '#database/schema'
import { belongsTo, manyToMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, ManyToMany } from '@adonisjs/lucid/types/relations'
import type { DocumentCategory, DocumentStatus, DocumentVisibility } from '@aptoph/shared'
import User from '#models/auth/user'
import Unit from '#models/property/unit'
import Vendor from '#models/finance/vendor'
import DocumentFolder from '#models/documents/document_folder'

/** A document of the conjunto; its files are attachments (docs/documents.md) */
export default class Document extends DocumentSchema {
  declare category: DocumentCategory
  declare visibility: DocumentVisibility

  @belongsTo(() => User, { foreignKey: 'uploadedById' })
  declare uploadedBy: BelongsTo<typeof User>

  @belongsTo(() => DocumentFolder, { foreignKey: 'folderId' })
  declare folder: BelongsTo<typeof DocumentFolder>

  @belongsTo(() => Vendor)
  declare vendor: BelongsTo<typeof Vendor>

  /** Owners of these units see it when the visibility is `units` */
  @manyToMany(() => Unit, { pivotTable: 'document_units', pivotColumns: ['tenant_id'] })
  declare units: ManyToMany<typeof Unit>

  get status(): DocumentStatus {
    if (this.archivedAt) return 'archived'
    return this.publishedAt ? 'published' : 'draft'
  }
}
