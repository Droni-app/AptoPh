import { BaseSchema } from '@adonisjs/lucid/schema'
import { PAYMENT_METHOD_TYPES } from '@aptoph/shared'
import { checkIn, tenantTable, timestamps, userForeign } from '#database/tenant_schema'

const WOMPI_ENVIRONMENTS = ['sandbox', 'production']

/**
 * Saved (tokenized) payment sources in Wompi: only Wompi's id and display
 * data are stored, never card data. docs/billing.md
 */
export default class extends BaseSchema {
  protected tableName = 'billing_payment_methods'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      tenantTable(table, this.raw.bind(this))
      table.string('environment', 10).notNullable()
      table.bigInteger('wompi_payment_source_id').notNullable()
      table.string('type', 30).notNullable()
      table.string('label', 60).notNullable()
      table.string('brand', 30).nullable()
      table.string('last_four', 4).nullable()
      table.smallint('exp_month').nullable()
      table.smallint('exp_year').nullable()
      table.string('customer_email', 254).notNullable()
      table.string('status', 10).notNullable().defaultTo('active')
      /** Wompi contracts the person accepted when saving it */
      table.text('policy_url').notNullable()
      table.text('personal_data_url').notNullable()
      userForeign(table, 'created_by_id')
      table.timestamp('removed_at', { useTz: true }).nullable()
      userForeign(table, 'removed_by_id')
      timestamps(table)
      checkIn(table, 'environment', WOMPI_ENVIRONMENTS)
      checkIn(table, 'type', PAYMENT_METHOD_TYPES)
      checkIn(table, 'status', ['active', 'removed'])
    })
    // One active payment method per conjunto and environment
    this.schema.raw(
      `CREATE UNIQUE INDEX billing_payment_methods_one_active ON billing_payment_methods (tenant_id, environment) WHERE status = 'active'`
    )
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
