import { BaseSchema } from '@adonisjs/lucid/schema'
import { ATTACHMENT_OWNER_TYPES, DOCUMENT_CATEGORIES, DOCUMENT_VISIBILITIES } from '@aptoph/shared'
import { checkIn, tenantForeign, tenantTable, userForeign } from '#database/tenant_schema'

/**
 * The document management module (docs/documents.md):
 *  - folders, metadata (reference, dates, expiry, vendor) and publication;
 *  - each file is an attachment of the document: the latest is the current
 *    version, the others are its history;
 *  - who can see each document, including the owners of chosen units;
 *  - a log of who opened or downloaded each file.
 *
 * The `documents` notification category is added in notifications/, which
 * runs after this folder.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('document_folders', (table) => {
      tenantTable(table, this.raw.bind(this))
      table.uuid('parent_id').nullable()
      table.string('name', 100).notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
      tenantForeign(table, 'parent_id', 'document_folders', 'RESTRICT')
    })
    this.schema.raw(
      'CREATE UNIQUE INDEX document_folders_name_unique ON document_folders (tenant_id, parent_id, lower(name)) NULLS NOT DISTINCT'
    )

    this.schema.alterTable('documents', (table) => {
      table.dropChecks(['documents_category_check', 'documents_visibility_check'])
      table.uuid('folder_id').nullable()
      table.text('description').nullable()
      table.string('reference', 60).nullable()
      table.date('document_date').nullable()
      table.date('expires_on').nullable()
      table.uuid('vendor_id').nullable()
      table.timestamp('published_at', { useTz: true }).nullable()
      table.timestamp('archived_at', { useTz: true }).nullable()
      table.uuid('updated_by_id').nullable().references('id').inTable('users').onDelete('SET NULL')
      tenantForeign(table, 'folder_id', 'document_folders', 'SET NULL')
      tenantForeign(table, 'vendor_id', 'vendors', 'SET NULL')
      table.index(['tenant_id', 'folder_id'])
      table.index(['tenant_id', 'expires_on'])
    })

    this.schema.createTable('document_units', (table) => {
      table.uuid('tenant_id').notNullable()
      table.uuid('document_id').notNullable()
      table.uuid('unit_id').notNullable()
      table.primary(['document_id', 'unit_id'])
      tenantForeign(table, 'document_id', 'documents', 'CASCADE')
      tenantForeign(table, 'unit_id', 'units', 'CASCADE')
      table.index(['tenant_id', 'unit_id'])
    })

    this.schema.createTable('document_access_logs', (table) => {
      tenantTable(table, this.raw.bind(this))
      table.uuid('document_id').notNullable()
      table.uuid('attachment_id').notNullable()
      userForeign(table, 'user_id', { nullable: false, onDelete: 'CASCADE' })
      table.string('action', 10).notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      tenantForeign(table, 'document_id', 'documents', 'CASCADE')
      tenantForeign(table, 'attachment_id', 'attachments', 'CASCADE')
      checkIn(table, 'action', ['view', 'download'])
      table.index(['tenant_id', 'document_id', 'created_at'])
    })

    this.schema.alterTable('attachments', (table) => {
      table.dropChecks(['attachments_owner_type_check'])
      checkIn(table, 'owner_type', ATTACHMENT_OWNER_TYPES, 'attachments_owner_type_check')
    })
    // The file of each existing document becomes its first version
    this.defer(async (db) => {
      await db.rawQuery(`
        INSERT INTO attachments (tenant_id, owner_type, owner_id, file_key, file_name, mime_type, size_bytes, uploaded_by_id, created_at)
        SELECT tenant_id, 'document', id, file_key,
               left(title, 240) || coalesce('.' || nullif(substring(file_key from '\\.([A-Za-z0-9]+)$'), ''), ''),
               mime_type, size_bytes, uploaded_by_id, created_at
        FROM documents
      `)
      await db.rawQuery(`
        UPDATE documents SET
          visibility = CASE visibility WHEN 'public' THEN 'community' WHEN 'administration' THEN 'private' ELSE visibility END,
          published_at = CASE WHEN deleted_at IS NULL THEN created_at END
      `)
    })

    this.schema.alterTable('documents', (table) => {
      table.dropColumns('file_key', 'mime_type', 'size_bytes')
      table.string('visibility', 20).notNullable().defaultTo('private').alter()
      checkIn(table, 'category', DOCUMENT_CATEGORIES, 'documents_category_check')
      checkIn(table, 'visibility', DOCUMENT_VISIBILITIES, 'documents_visibility_check')
    })
  }

  async down() {
    const OLD_CATEGORIES = [
      'bylaws',
      'minutes',
      'financial_statement',
      'contract',
      'policy',
      'other',
    ]
    this.schema.alterTable('documents', (table) => {
      table.dropChecks(['documents_category_check', 'documents_visibility_check'])
      table.string('file_key').nullable()
      table.string('mime_type', 100).nullable()
      table.bigInteger('size_bytes').nullable()
    })
    this.defer(async (db) => {
      await db.rawQuery(`
        UPDATE documents d SET file_key = a.file_key, mime_type = a.mime_type, size_bytes = a.size_bytes
        FROM (
          SELECT DISTINCT ON (owner_id) owner_id, file_key, mime_type, size_bytes
          FROM attachments WHERE owner_type = 'document' ORDER BY owner_id, created_at DESC
        ) a
        WHERE a.owner_id = d.id
      `)
      // Documents without a file cannot exist in the first version
      await db.rawQuery(`DELETE FROM documents WHERE file_key IS NULL`)
      await db.rawQuery(`
        UPDATE documents SET
          visibility = CASE WHEN visibility IN ('community') THEN 'public'
                            WHEN visibility IN ('council') THEN 'council'
                            ELSE 'administration' END,
          category = CASE WHEN category IN (${OLD_CATEGORIES.map((c) => `'${c}'`).join(', ')}) THEN category ELSE 'other' END
      `)
      await db.rawQuery(`DELETE FROM attachments WHERE owner_type = 'document'`)
    })
    this.schema.alterTable('documents', (table) => {
      table.string('file_key').notNullable().alter()
      table.string('mime_type', 100).notNullable().alter()
      table.bigInteger('size_bytes').notNullable().alter()
      table.string('visibility', 20).notNullable().defaultTo('public').alter()
      table.dropForeign(['tenant_id', 'folder_id'])
      table.dropForeign(['tenant_id', 'vendor_id'])
      table.dropIndex(['tenant_id', 'folder_id'])
      table.dropIndex(['tenant_id', 'expires_on'])
      table.dropColumns(
        'folder_id',
        'description',
        'reference',
        'document_date',
        'expires_on',
        'vendor_id',
        'published_at',
        'archived_at',
        'updated_by_id'
      )
      checkIn(table, 'category', OLD_CATEGORIES, 'documents_category_check')
      checkIn(
        table,
        'visibility',
        ['public', 'council', 'administration'],
        'documents_visibility_check'
      )
    })
    this.schema.dropTable('document_access_logs')
    this.schema.dropTable('document_units')
    this.schema.dropTable('document_folders')
    this.schema.alterTable('attachments', (table) => {
      table.dropChecks(['attachments_owner_type_check'])
      checkIn(
        table,
        'owner_type',
        ATTACHMENT_OWNER_TYPES.filter((t) => t !== 'document'),
        'attachments_owner_type_check'
      )
    })
  }
}
