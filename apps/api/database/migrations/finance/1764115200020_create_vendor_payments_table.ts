import { BaseSchema } from '@adonisjs/lucid/schema'
import { PAYMENT_METHODS, VENDOR_PAYMENT_STATUSES } from '@aptoph/shared'
import {
  checkIn,
  tenantForeign,
  tenantTable,
  timestamps,
  userForeign,
} from '#database/tenant_schema'

/** Payment vouchers to vendors (comprobantes de egreso) */
export default class extends BaseSchema {
  protected tableName = 'vendor_payments'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      tenantTable(table, this.raw.bind(this))
      // Comprobante de egreso
      table.integer('number').notNullable()
      table.uuid('vendor_id').notNullable()
      table.uuid('cash_account_id').notNullable()
      table.date('paid_on').notNullable()
      table.decimal('amount', 14, 2).notNullable()
      table.string('method', 20).notNullable()
      table.string('reference', 100).nullable()
      table.string('notes', 255).nullable()
      table.string('status', 20).notNullable().defaultTo('confirmed')
      table.timestamp('reversed_at', { useTz: true }).nullable()
      userForeign(table, 'reversed_by_id')
      table.string('reversal_reason', 255).nullable()
      userForeign(table, 'created_by_id')
      timestamps(table)
      tenantForeign(table, 'vendor_id', 'vendors', 'RESTRICT')
      tenantForeign(table, 'cash_account_id', 'cash_accounts', 'RESTRICT')
      checkIn(table, 'method', PAYMENT_METHODS)
      checkIn(table, 'status', VENDOR_PAYMENT_STATUSES)
      table.check('amount > 0')
      table.unique(['tenant_id', 'number'])
      table.index(['tenant_id', 'vendor_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
