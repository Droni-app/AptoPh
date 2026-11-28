import { BaseSchema } from '@adonisjs/lucid/schema'
import { BANK_LINE_STATUSES } from '@aptoph/shared'
import {
  checkIn,
  tenantForeign,
  tenantTable,
  timestamps,
  userForeign,
} from '#database/tenant_schema'

/**
 * Movements of an imported bank statement and what each one was reconciled
 * with: a cash receipt (payment), an egreso (vendor payment) or nothing
 * (ignored, with a note).
 */
export default class extends BaseSchema {
  protected tableName = 'bank_statement_lines'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      tenantTable(table, this.raw.bind(this))
      table.uuid('bank_statement_id').notNullable()
      table.uuid('cash_account_id').notNullable()
      table.integer('line').notNullable()
      table.date('posted_on').notNullable()
      table.string('description', 255).notNullable().defaultTo('')
      table.string('reference', 100).nullable()
      // Positive: money in (consignaciones). Negative: money out.
      table.decimal('amount', 14, 2).notNullable()
      // Same movement in another import of the account → skipped
      table.string('fingerprint', 64).notNullable()
      table.string('status', 20).notNullable().defaultTo('pending')
      table.uuid('payment_id').nullable()
      table.uuid('vendor_payment_id').nullable()
      table.string('note', 255).nullable()
      userForeign(table, 'reconciled_by_id')
      table.timestamp('reconciled_at', { useTz: true }).nullable()
      timestamps(table)

      tenantForeign(table, 'bank_statement_id', 'bank_statements', 'CASCADE')
      tenantForeign(table, 'cash_account_id', 'cash_accounts', 'RESTRICT')
      tenantForeign(table, 'payment_id', 'payments', 'RESTRICT')
      tenantForeign(table, 'vendor_payment_id', 'vendor_payments', 'RESTRICT')
      checkIn(table, 'status', BANK_LINE_STATUSES)
      table.check('amount <> 0')
      table.unique(['tenant_id', 'cash_account_id', 'fingerprint'])
      table.index(['tenant_id', 'bank_statement_id'])
    })
    // A receipt or an egreso is reconciled with one movement at most
    this.schema.raw(
      'CREATE UNIQUE INDEX bank_statement_lines_payment_unique ON bank_statement_lines (payment_id) WHERE payment_id IS NOT NULL'
    )
    this.schema.raw(
      'CREATE UNIQUE INDEX bank_statement_lines_vendor_payment_unique ON bank_statement_lines (vendor_payment_id) WHERE vendor_payment_id IS NOT NULL'
    )
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
