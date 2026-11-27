import { BaseSchema } from '@adonisjs/lucid/schema'
import { tenantForeign, tenantTable } from '#database/tenant_schema'

/** How much of a payment voucher went to each bill */
export default class extends BaseSchema {
  protected tableName = 'vendor_payment_allocations'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      tenantTable(table, this.raw.bind(this))
      table.uuid('vendor_payment_id').notNullable()
      table.uuid('bill_id').notNullable()
      table.decimal('amount', 14, 2).notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      tenantForeign(table, 'vendor_payment_id', 'vendor_payments', 'CASCADE')
      tenantForeign(table, 'bill_id', 'bills', 'RESTRICT')
      table.check('amount > 0')
      table.unique(['vendor_payment_id', 'bill_id'])
      table.index(['tenant_id', 'bill_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
