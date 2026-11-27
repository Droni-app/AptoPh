import { BaseSchema } from '@adonisjs/lucid/schema'
import { FEE_METHODS } from '@aptoph/shared'
import { checkIn, tenantForeign, tenantTable, userForeign } from '#database/tenant_schema'

/** How a monthly fee was distributed among the units (coefficient, area, equal…) */
export default class extends BaseSchema {
  protected tableName = 'fee_schedules'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      tenantTable(table, this.raw.bind(this))
      table.uuid('charge_concept_id').notNullable()
      table.string('method', 20).notNullable()
      table.decimal('monthly_total', 14, 2).nullable()
      table.jsonb('parameters').notNullable().defaultTo('{}')
      table.date('effective_from').notNullable()
      table.uuid('budget_id').nullable()
      table.decimal('total_amount', 14, 2).notNullable()
      table.integer('units_count').notNullable()
      userForeign(table, 'created_by_id')
      table.timestamp('created_at', { useTz: true }).notNullable()
      tenantForeign(table, 'charge_concept_id', 'charge_concepts', 'RESTRICT')
      tenantForeign(table, 'budget_id', 'budgets', 'SET NULL')
      checkIn(table, 'method', FEE_METHODS)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
