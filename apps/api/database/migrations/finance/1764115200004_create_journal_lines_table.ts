import { BaseSchema } from '@adonisjs/lucid/schema'
import { tenantForeign, tenantTable } from '#database/tenant_schema'

/** Debit and credit lines of a voucher */
export default class extends BaseSchema {
  protected tableName = 'journal_lines'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      tenantTable(table, this.raw.bind(this))
      table.uuid('entry_id').notNullable()
      table.uuid('account_id').notNullable()
      table.decimal('debit', 16, 2).notNullable().defaultTo(0)
      table.decimal('credit', 16, 2).notNullable().defaultTo(0)
      // Third party: the unit (resident account) or the vendor
      table.uuid('unit_id').nullable()
      table.uuid('vendor_id').nullable()
      table.string('description', 255).nullable()
      tenantForeign(table, 'entry_id', 'journal_entries', 'CASCADE')
      tenantForeign(table, 'account_id', 'ledger_accounts', 'RESTRICT')
      tenantForeign(table, 'unit_id', 'units', 'RESTRICT')
      tenantForeign(table, 'vendor_id', 'vendors', 'RESTRICT')
      table.check('debit >= 0 AND credit >= 0 AND (debit = 0 OR credit = 0) AND debit + credit > 0')
      table.index(['entry_id'])
      table.index(['tenant_id', 'account_id'])
      table.index(['tenant_id', 'unit_id'])
      table.index(['tenant_id', 'vendor_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
