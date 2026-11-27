import { BaseSchema } from '@adonisjs/lucid/schema'
import { tenantForeign, tenantTable } from '#database/tenant_schema'

/** Expense lines of a bill, by account */
export default class extends BaseSchema {
  protected tableName = 'bill_lines'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      tenantTable(table, this.raw.bind(this))
      table.uuid('bill_id').notNullable()
      table.uuid('account_id').notNullable()
      table.string('description', 255).nullable()
      table.decimal('amount', 14, 2).notNullable()
      tenantForeign(table, 'bill_id', 'bills', 'CASCADE')
      tenantForeign(table, 'account_id', 'ledger_accounts', 'RESTRICT')
      table.check('amount > 0')
      table.index(['bill_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
