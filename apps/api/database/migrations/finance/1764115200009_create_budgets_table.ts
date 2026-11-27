import { BaseSchema } from '@adonisjs/lucid/schema'
import { BUDGET_STATUSES } from '@aptoph/shared'
import { checkIn, tenantTable, timestamps } from '#database/tenant_schema'

/** Annual budget approved by the assembly */
export default class extends BaseSchema {
  protected tableName = 'budgets'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      tenantTable(table, this.raw.bind(this))
      table.smallint('year').notNullable()
      table.string('name', 100).notNullable()
      table.string('status', 10).notNullable().defaultTo('draft')
      // Fondo de imprevistos (art. 35 Ley 675): at least 1 % of the expenses
      table.decimal('reserve_fund_rate', 5, 2).notNullable().defaultTo(1)
      table.date('approved_on').nullable()
      table.string('approval_reference', 150).nullable()
      table.text('notes').nullable()
      timestamps(table)
      checkIn(table, 'status', BUDGET_STATUSES)
      table.check('reserve_fund_rate >= 0 AND reserve_fund_rate <= 100')
      table.unique(['tenant_id', 'year'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
