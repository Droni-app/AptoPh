import { BaseSchema } from '@adonisjs/lucid/schema'
import { tenantForeign, tenantTable, timestamps } from '#database/tenant_schema'

/** Budget amount per account */
export default class extends BaseSchema {
  protected tableName = 'budget_items'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      tenantTable(table, this.raw.bind(this))
      table.uuid('budget_id').notNullable()
      table.uuid('account_id').notNullable()
      table.string('description', 150).nullable()
      table.decimal('annual_amount', 16, 2).notNullable()
      timestamps(table)
      tenantForeign(table, 'budget_id', 'budgets', 'CASCADE')
      tenantForeign(table, 'account_id', 'ledger_accounts', 'RESTRICT')
      table.check('annual_amount >= 0')
      table.unique(['budget_id', 'account_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
