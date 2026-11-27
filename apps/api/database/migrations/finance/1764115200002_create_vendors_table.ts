import { BaseSchema } from '@adonisjs/lucid/schema'
import { BANK_ACCOUNT_KINDS, DOCUMENT_TYPES } from '@aptoph/shared'
import { checkIn, tenantForeign, tenantTable, timestamps } from '#database/tenant_schema'

/** Third parties the conjunto pays (proveedores) */
export default class extends BaseSchema {
  protected tableName = 'vendors'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      tenantTable(table, this.raw.bind(this))
      table.string('name', 150).notNullable()
      table.string('document_type', 5).nullable()
      table.string('document_number', 30).nullable()
      table.string('email', 254).nullable()
      table.string('phone', 30).nullable()
      table.string('address', 200).nullable()
      table.string('contact_name', 150).nullable()
      table.string('bank_name', 80).nullable()
      table.string('bank_account_kind', 10).nullable()
      table.string('bank_account_number', 40).nullable()
      table.uuid('default_account_id').nullable()
      table.text('notes').nullable()
      table.boolean('is_active').notNullable().defaultTo(true)
      timestamps(table)
      tenantForeign(table, 'default_account_id', 'ledger_accounts', 'SET NULL')
      checkIn(table, 'document_type', DOCUMENT_TYPES)
      checkIn(table, 'bank_account_kind', BANK_ACCOUNT_KINDS)
    })
    this.schema.raw(
      'CREATE UNIQUE INDEX vendors_document_unique ON vendors (tenant_id, document_number) WHERE document_number IS NOT NULL'
    )
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
