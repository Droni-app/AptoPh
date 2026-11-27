import { BaseSchema } from '@adonisjs/lucid/schema'
import { PAYMENT_METHODS, PAYMENT_STATUSES } from '@aptoph/shared'
import {
  checkIn,
  tenantForeign,
  tenantTable,
  timestamps,
  userForeign,
} from '#database/tenant_schema'

/** Payments of the units; confirmed ones get a cash receipt number */
export default class extends BaseSchema {
  protected tableName = 'payments'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      tenantTable(table, this.raw.bind(this))
      table.uuid('unit_id').notNullable()
      table.decimal('amount', 14, 2).notNullable()
      table.timestamp('paid_at', { useTz: true }).notNullable()
      table.string('method', 20).notNullable()
      table.string('reference', 100).nullable()
      table.string('status', 20).notNullable().defaultTo('pending_review')
      // Recibo de caja: assigned when the payment is confirmed
      table.integer('number').nullable()
      table.uuid('cash_account_id').nullable()
      // Saldo a favor: what is left after paying the open charges
      table.decimal('unapplied_amount', 14, 2).notNullable().defaultTo(0)
      table.string('notes', 255).nullable()
      table.timestamp('reviewed_at', { useTz: true }).nullable()
      table.string('rejection_reason', 255).nullable()
      table.timestamp('reversed_at', { useTz: true }).nullable()
      userForeign(table, 'reversed_by_id')
      table.string('reversal_reason', 255).nullable()
      userForeign(table, 'registered_by_id')
      userForeign(table, 'confirmed_by_id')
      timestamps(table)

      tenantForeign(table, 'unit_id', 'units', 'RESTRICT')
      tenantForeign(table, 'cash_account_id', 'cash_accounts', 'RESTRICT')
      checkIn(table, 'method', PAYMENT_METHODS)
      checkIn(table, 'status', PAYMENT_STATUSES)
      table.check('amount > 0')
      table.check(
        'unapplied_amount >= 0 AND unapplied_amount <= amount',
        [],
        'payments_unapplied_amount_check'
      )
      table.index(['tenant_id', 'unit_id'])
      table.index(['tenant_id', 'status'])
    })
    this.schema.raw(
      'CREATE UNIQUE INDEX payments_number_unique ON payments (tenant_id, number) WHERE number IS NOT NULL'
    )
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
