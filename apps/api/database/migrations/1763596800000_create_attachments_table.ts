import { BaseSchema } from '@adonisjs/lucid/schema'
import { ATTACHMENT_OWNER_TYPES } from '@aptoph/shared'
import { checkIn, tenantTable, userForeign } from '#database/tenant_schema'

/**
 * Files attached to a record (a bill, a payment voucher, a journal entry…).
 * The file lives in the drive under `{tenant slug}/…`; `file_key` is its full
 * path, so renaming the conjunto does not break old files. docs/files.md.
 *
 * Removing an attachment only hides it (`deleted_at`): attachments are
 * accounting support and the file stays in the bucket.
 *
 * Replaces `payments.receipt_file_key`, which was never used.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('attachments', (table) => {
      tenantTable(table, this.raw.bind(this))
      // Polymorphic owner: no FK, the API checks the record belongs to the tenant
      table.string('owner_type', 30).notNullable()
      table.uuid('owner_id').notNullable()
      table.string('file_key', 500).notNullable().unique()
      // Original name, shown and used when downloading
      table.string('file_name', 255).notNullable()
      table.string('mime_type', 120).notNullable()
      table.bigInteger('size_bytes').notNullable()
      userForeign(table, 'uploaded_by_id')
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('deleted_at', { useTz: true }).nullable()
      userForeign(table, 'deleted_by_id')
      checkIn(table, 'owner_type', ATTACHMENT_OWNER_TYPES)
      table.check('size_bytes > 0')
      table.index(['tenant_id', 'owner_type', 'owner_id'])
    })

    this.schema.alterTable('payments', (table) => {
      table.dropColumn('receipt_file_key')
    })
  }

  async down() {
    this.schema.alterTable('payments', (table) => {
      table.string('receipt_file_key').nullable()
    })
    this.schema.dropTable('attachments')
  }
}
