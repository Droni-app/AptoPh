import { BaseSchema } from '@adonisjs/lucid/schema'
import { tenantForeign, tenantTable } from '#database/tenant_schema'

export default class extends BaseSchema {
  protected tableName = 'payment_allocations'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      tenantTable(table, this.raw.bind(this))
      table.uuid('payment_id').notNullable()
      table.uuid('charge_id').notNullable()
      table.decimal('amount', 14, 2).notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable()

      tenantForeign(table, 'payment_id', 'payments', 'CASCADE')
      tenantForeign(table, 'charge_id', 'charges', 'RESTRICT')
      table.check('amount > 0')
      table.unique(['payment_id', 'charge_id'])
      table.index(['tenant_id', 'charge_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
