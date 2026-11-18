import { BaseSchema } from '@adonisjs/lucid/schema'
import { BILL_STATUSES, PAYMENT_METHODS, VENDOR_PAYMENT_STATUSES } from '@aptoph/shared'
import {
  checkIn,
  tenantForeign,
  tenantTable,
  timestamps,
  userForeign,
} from '#database/tenant_schema'

/**
 * Payables: vendor bills (cuentas por pagar) with their expense lines, and
 * payment vouchers (comprobantes de egreso) applied to them. docs/finance.md §6.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('bills', (table) => {
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

    this.schema.createTable('bill_lines', (table) => {
      tenantTable(table, this.raw.bind(this))
      table.uuid('bill_id').notNullable()
      table.uuid('account_id').notNullable()
      table.string('description', 255).nullable()
      table.decimal('amount', 14, 2).notNullable()
      tenantForeign(table, 'bill_id', 'bills', 'CASCADE')
      tenantForeign(table, 'account_id', 'ledger_accounts', 'RESTRICT')
      table.check('amount > 0')
      table.index(['bill_id'])
    })

    this.schema.createTable('vendor_payments', (table) => {
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

    this.schema.createTable('vendor_payment_allocations', (table) => {
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
    this.schema.dropTable('vendor_payment_allocations')
    this.schema.dropTable('vendor_payments')
    this.schema.dropTable('bill_lines')
    this.schema.dropTable('bills')
  }
}
