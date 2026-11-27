import { BaseSchema } from '@adonisjs/lucid/schema'
import { CHARGE_SOURCES, CHARGE_STATUSES } from '@aptoph/shared'
import {
  checkIn,
  tenantForeign,
  tenantTable,
  timestamps,
  userForeign,
} from '#database/tenant_schema'

/** Charges to a unit (cartera): from billing, interest, manual, bookings… */
export default class extends BaseSchema {
  protected tableName = 'charges'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      tenantTable(table, this.raw.bind(this))
      table.uuid('unit_id').notNullable()
      table.uuid('charge_concept_id').notNullable()
      /**
       * First day of the billed month
       */
      table.date('period').notNullable()
      table.string('description').nullable()
      table.decimal('amount', 14, 2).notNullable()
      table.decimal('balance', 14, 2).notNullable()
      table.date('due_on').notNullable()
      table.string('status', 20).notNullable().defaultTo('pending')
      table.uuid('billing_period_id').nullable()
      table.uuid('recurring_charge_id').nullable()
      table.string('source_type', 20).nullable()
      table.uuid('source_id').nullable()
      // Makes generation idempotent: "rec:{recurring}:{period}", "int:{charge}:{period}"…
      table.string('idempotency_key', 120).nullable()
      table.date('discount_until').nullable()
      table.decimal('discount_amount', 14, 2).notNullable().defaultTo(0)
      table.timestamp('cancelled_at', { useTz: true }).nullable()
      userForeign(table, 'cancelled_by_id')
      table.string('cancellation_reason', 255).nullable()
      userForeign(table, 'created_by_id')
      timestamps(table)

      tenantForeign(table, 'unit_id', 'units', 'RESTRICT')
      tenantForeign(table, 'charge_concept_id', 'charge_concepts', 'RESTRICT')
      tenantForeign(table, 'billing_period_id', 'billing_periods', 'RESTRICT')
      tenantForeign(table, 'recurring_charge_id', 'recurring_charges', 'SET NULL')
      checkIn(table, 'status', CHARGE_STATUSES)
      checkIn(table, 'source_type', CHARGE_SOURCES)
      table.check('amount >= 0 AND balance >= 0 AND balance <= amount')
      table.check(
        'discount_amount >= 0 AND discount_amount <= amount',
        [],
        'charges_discount_amount_check'
      )
      table.index(['tenant_id', 'unit_id', 'status'])
      table.index(['tenant_id', 'period'])
      table.index(['tenant_id', 'billing_period_id'])
    })
    this.schema.raw(
      'CREATE UNIQUE INDEX charges_idempotency_unique ON charges (tenant_id, idempotency_key) WHERE idempotency_key IS NOT NULL'
    )
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
