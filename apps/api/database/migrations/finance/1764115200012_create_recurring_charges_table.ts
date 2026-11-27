import { BaseSchema } from '@adonisjs/lucid/schema'
import { tenantForeign, tenantTable, timestamps, userForeign } from '#database/tenant_schema'

/** Tarifas: what each unit pays every month for a concept */
export default class extends BaseSchema {
  protected tableName = 'recurring_charges'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      tenantTable(table, this.raw.bind(this))
      table.uuid('unit_id').notNullable()
      table.uuid('charge_concept_id').notNullable()
      table.decimal('amount', 14, 2).notNullable()
      table.string('description', 255).nullable()
      // First day of the first and last billed months
      table.date('starts_on').notNullable()
      table.date('ends_on').nullable()
      table.uuid('fee_schedule_id').nullable()
      userForeign(table, 'created_by_id')
      timestamps(table)
      tenantForeign(table, 'unit_id', 'units', 'RESTRICT')
      tenantForeign(table, 'charge_concept_id', 'charge_concepts', 'RESTRICT')
      tenantForeign(table, 'fee_schedule_id', 'fee_schedules', 'SET NULL')
      table.check('amount >= 0')
      table.check('ends_on IS NULL OR ends_on >= starts_on')
      table.index(['tenant_id', 'unit_id'])
      table.index(['tenant_id', 'charge_concept_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
