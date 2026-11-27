import { BaseSchema } from '@adonisjs/lucid/schema'
import { BILLING_CHARGE_KINDS, BILLING_CHARGE_STATUSES } from '@aptoph/shared'
import {
  checkIn,
  tenantForeign,
  tenantTable,
  timestamps,
  userForeign,
} from '#database/tenant_schema'

const WOMPI_ENVIRONMENTS = ['sandbox', 'production']

/** Every charge to AptoPH (plan or email packs) with its unique Wompi reference */
export default class extends BaseSchema {
  protected tableName = 'billing_charges'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      tenantTable(table, this.raw.bind(this))
      table.string('environment', 10).notNullable()
      table.string('reference', 40).notNullable().unique()
      table.string('kind', 20).notNullable()
      table.string('description', 200).notNullable()
      table.bigInteger('amount_cents').notNullable()
      table.string('currency', 3).notNullable().defaultTo('COP')
      table.string('status', 10).notNullable().defaultTo('pending')
      table.string('status_message', 300).nullable()
      table.uuid('payment_method_id').nullable()
      tenantForeign(table, 'payment_method_id', 'billing_payment_methods', 'SET NULL')
      table.string('payment_method_label', 60).nullable()
      table.string('wompi_transaction_id', 64).nullable().unique()
      /** Paid in Wompi's checkout (no saved payment method) */
      table.boolean('checkout').notNullable().defaultTo(false)
      /** Created by the automatic renewal */
      table.boolean('automatic').notNullable().defaultTo(false)
      // Plan
      table.string('plan', 20).nullable()
      table.string('billing_cycle', 10).nullable()
      table.integer('units').nullable()
      table.timestamp('period_starts_at', { useTz: true }).nullable()
      table.timestamp('period_ends_at', { useTz: true }).nullable()
      // Email packs
      table.integer('packs').nullable()
      table.date('quota_period').nullable()
      userForeign(table, 'created_by_id')
      table.timestamp('finalized_at', { useTz: true }).nullable()
      /** When its effect was applied (plan extended, packs added): exactly once */
      table.timestamp('applied_at', { useTz: true }).nullable()
      /** When the receipt or the failure notice was sent: exactly once */
      table.timestamp('notified_at', { useTz: true }).nullable()
      timestamps(table)
      checkIn(table, 'environment', WOMPI_ENVIRONMENTS)
      checkIn(table, 'kind', BILLING_CHARGE_KINDS)
      checkIn(table, 'status', BILLING_CHARGE_STATUSES)
      table.check('amount_cents > 0')
      table.index(['tenant_id', 'created_at'])
    })
    this.schema.raw(
      `CREATE INDEX billing_charges_pending ON billing_charges (created_at) WHERE status = 'pending'`
    )
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
