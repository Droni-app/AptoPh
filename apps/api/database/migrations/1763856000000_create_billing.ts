import { BaseSchema } from '@adonisjs/lucid/schema'
import { BILLING_CHARGE_KINDS, BILLING_CHARGE_STATUSES, PAYMENT_METHOD_TYPES } from '@aptoph/shared'
import {
  checkIn,
  tenantForeign,
  tenantTable,
  timestamps,
  userForeign,
} from '#database/tenant_schema'

const ENVIRONMENTS = ['sandbox', 'production']

/**
 * Payments of the conjuntos to AptoPH with Wompi (docs/billing.md):
 *  - `billing_payment_methods`: saved (tokenized) payment sources; only Wompi's id
 *    and display data are stored, never card data
 *  - `billing_charges`: every charge (plan or email packs) with its unique reference
 *  - `wompi_events`: received events, verified and deduplicated by checksum
 *  - automatic renewal on `subscriptions`
 * The manual request flows are replaced: their columns go away.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('billing_payment_methods', (table) => {
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
      checkIn(table, 'environment', ENVIRONMENTS)
      checkIn(table, 'type', PAYMENT_METHOD_TYPES)
      checkIn(table, 'status', ['active', 'removed'])
    })
    // One active payment method per conjunto and environment
    this.schema.raw(
      `CREATE UNIQUE INDEX billing_payment_methods_one_active ON billing_payment_methods (tenant_id, environment) WHERE status = 'active'`
    )

    this.schema.createTable('billing_charges', (table) => {
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
      checkIn(table, 'environment', ENVIRONMENTS)
      checkIn(table, 'kind', BILLING_CHARGE_KINDS)
      checkIn(table, 'status', BILLING_CHARGE_STATUSES)
      table.check('amount_cents > 0')
      table.index(['tenant_id', 'created_at'])
    })
    this.schema.raw(
      `CREATE INDEX billing_charges_pending ON billing_charges (created_at) WHERE status = 'pending'`
    )

    this.schema.createTable('wompi_events', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuidv7()'))
      table.string('event', 60).notNullable()
      table.string('environment', 10).notNullable()
      table.string('checksum', 64).notNullable().unique()
      table.string('reference', 64).nullable().index()
      table.string('transaction_id', 64).nullable()
      table.jsonb('payload').notNullable()
      table.timestamp('received_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('processed_at', { useTz: true }).nullable()
    })

    this.schema.alterTable('subscriptions', (table) => {
      table.boolean('auto_renew').notNullable().defaultTo(false)
      /** Next automatic charge (first attempt or retry) */
      table.timestamp('next_renewal_at', { useTz: true }).nullable()
      table.smallint('renewal_attempts').notNullable().defaultTo(0)
      /** Period end whose renewal notice was already sent */
      table.timestamp('renewal_notice_for', { useTz: true }).nullable()
      table.dropColumn('activation_requested_at')
    })
    this.schema.raw(
      `CREATE INDEX subscriptions_next_renewal ON subscriptions (next_renewal_at) WHERE next_renewal_at IS NOT NULL`
    )

    this.schema.alterTable('email_quotas', (table) => {
      table.dropChecks(['email_quotas_counts_check'])
      table.dropColumn('requested_packs')
      table.dropColumn('requested_at')
      table.dropColumn('requested_by_id')
      table.check('used >= 0 AND extra_packs >= 0', [], 'email_quotas_counts_check')
    })
  }

  async down() {
    this.schema.alterTable('email_quotas', (table) => {
      table.dropChecks(['email_quotas_counts_check'])
      table.integer('requested_packs').notNullable().defaultTo(0)
      table.timestamp('requested_at', { useTz: true }).nullable()
      table
        .uuid('requested_by_id')
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.check(
        'used >= 0 AND extra_packs >= 0 AND requested_packs >= 0',
        [],
        'email_quotas_counts_check'
      )
    })
    this.schema.raw('DROP INDEX IF EXISTS subscriptions_next_renewal')
    this.schema.alterTable('subscriptions', (table) => {
      table.dropColumn('auto_renew')
      table.dropColumn('next_renewal_at')
      table.dropColumn('renewal_attempts')
      table.dropColumn('renewal_notice_for')
      table.timestamp('activation_requested_at', { useTz: true }).nullable()
    })
    this.schema.dropTable('wompi_events')
    this.schema.dropTable('billing_charges')
    this.schema.dropTable('billing_payment_methods')
  }
}
