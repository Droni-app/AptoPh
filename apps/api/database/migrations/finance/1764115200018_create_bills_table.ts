import { BaseSchema } from '@adonisjs/lucid/schema'
import { BILL_STATUSES } from '@aptoph/shared'
import {
  checkIn,
  tenantForeign,
  tenantTable,
  timestamps,
  userForeign,
} from '#database/tenant_schema'

/** Vendor bills (cuentas por pagar). docs/finance.md §6 */
export default class extends BaseSchema {
  protected tableName = 'bills'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      tenantTable(table, this.raw.bind(this))
      table.uuid('vendor_id').notNullable()
      // The vendor's invoice or cuenta de cobro number
      table.string('number', 40).nullable()
      table.date('issued_on').notNullable()
      table.date('due_on').notNullable()
      table.string('description', 255).notNullable()
      table.decimal('subtotal', 14, 2).notNullable()
      table.decimal('tax_amount', 14, 2).notNullable().defaultTo(0)
      table.decimal('withholding_income_tax', 14, 2).notNullable().defaultTo(0)
      table.decimal('withholding_vat', 14, 2).notNullable().defaultTo(0)
      table.decimal('withholding_ica', 14, 2).notNullable().defaultTo(0)
      // subtotal + tax
      table.decimal('total', 14, 2).notNullable()
      // total − withholdings: what is paid to the vendor
      table.decimal('net_amount', 14, 2).notNullable()
      table.decimal('balance', 14, 2).notNullable()
      table.string('status', 20).notNullable().defaultTo('pending')
      table.timestamp('cancelled_at', { useTz: true }).nullable()
      userForeign(table, 'cancelled_by_id')
      table.string('cancellation_reason', 255).nullable()
      userForeign(table, 'created_by_id')
      timestamps(table)
      tenantForeign(table, 'vendor_id', 'vendors', 'RESTRICT')
      checkIn(table, 'status', BILL_STATUSES)
      table.check(
        'subtotal > 0 AND tax_amount >= 0 AND withholding_income_tax >= 0 AND withholding_vat >= 0 AND withholding_ica >= 0'
      )
      table.check('net_amount > 0 AND balance >= 0 AND balance <= net_amount')
      table.check('due_on >= issued_on')
      table.index(['tenant_id', 'status'])
      table.index(['tenant_id', 'vendor_id'])
    })
    this.schema.raw(
      "CREATE UNIQUE INDEX bills_vendor_number_unique ON bills (tenant_id, vendor_id, number) WHERE number IS NOT NULL AND status <> 'cancelled'"
    )
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
