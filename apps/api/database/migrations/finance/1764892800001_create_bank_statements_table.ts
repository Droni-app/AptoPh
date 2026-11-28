import { BaseSchema } from '@adonisjs/lucid/schema'
import { tenantForeign, tenantTable, timestamps, userForeign } from '#database/tenant_schema'

/** Bank statements imported to reconcile a cash account (docs/finance.md §7) */
export default class extends BaseSchema {
  protected tableName = 'bank_statements'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      tenantTable(table, this.raw.bind(this))
      table.uuid('cash_account_id').notNullable()
      table.string('file_name', 200).notNullable()
      table.date('starts_on').notNullable()
      table.date('ends_on').notNullable()
      table.integer('lines_count').notNullable().defaultTo(0)
      // Lines skipped because an earlier import already had them
      table.integer('duplicates_count').notNullable().defaultTo(0)
      userForeign(table, 'imported_by_id')
      timestamps(table)

      tenantForeign(table, 'cash_account_id', 'cash_accounts', 'RESTRICT')
      table.index(['tenant_id', 'cash_account_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
