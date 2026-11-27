import { BaseSchema } from '@adonisjs/lucid/schema'
import { BILLING_PERIOD_STATUSES } from '@aptoph/shared'
import { checkIn, tenantTable, timestamps, userForeign } from '#database/tenant_schema'

/** Monthly billing of the conjunto: preview, generate, close */
export default class extends BaseSchema {
  protected tableName = 'billing_periods'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      tenantTable(table, this.raw.bind(this))
      table.date('period').notNullable()
      table.date('due_on').notNullable()
      table.date('discount_until').nullable()
      table.decimal('discount_rate', 5, 2).nullable()
      table.decimal('interest_rate', 5, 2).nullable()
      table.string('status', 10).notNullable().defaultTo('open')
      table.timestamp('generated_at', { useTz: true }).nullable()
      userForeign(table, 'generated_by_id')
      table.timestamp('closed_at', { useTz: true }).nullable()
      userForeign(table, 'closed_by_id')
      table.integer('charges_count').notNullable().defaultTo(0)
      table.decimal('total_amount', 16, 2).notNullable().defaultTo(0)
      timestamps(table)
      checkIn(table, 'status', BILLING_PERIOD_STATUSES)
      table.unique(['tenant_id', 'period'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
