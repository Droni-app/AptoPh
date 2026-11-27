import { BaseSchema } from '@adonisjs/lucid/schema'
import { BILLING_CYCLES, PLAN_IDS, SUBSCRIPTION_STATUSES } from '@aptoph/shared'
import { checkIn } from '#database/tenant_schema'

/**
 * One subscription per tenant: plan, trial, paid period and the automatic
 * renewal with the saved payment method (docs/billing.md). Tenants without a
 * subscription are managed accounts (demo, pilots): no restrictions.
 */
export default class extends BaseSchema {
  protected tableName = 'subscriptions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuidv7()'))
      table
        .uuid('tenant_id')
        .notNullable()
        .unique()
        .references('id')
        .inTable('tenants')
        .onDelete('CASCADE')
      table.string('plan', 20).notNullable()
      table.string('billing_cycle', 10).notNullable().defaultTo('monthly')
      table.string('status', 20).notNullable().defaultTo('trialing')
      /** Units the administrator declared at sign-up, used to quote before loading the census */
      table.integer('declared_units').notNullable().defaultTo(0)
      table.timestamp('trial_ends_at', { useTz: true }).nullable()
      table.timestamp('current_period_ends_at', { useTz: true }).nullable()
      table.timestamp('cancelled_at', { useTz: true }).nullable()
      table.boolean('auto_renew').notNullable().defaultTo(false)
      /** Next automatic charge (first attempt or retry) */
      table.timestamp('next_renewal_at', { useTz: true }).nullable()
      table.smallint('renewal_attempts').notNullable().defaultTo(0)
      /** Period end whose renewal notice (or last manual reminder) was already sent */
      table.timestamp('renewal_notice_for', { useTz: true }).nullable()
      /** Manual payment: period end whose 7-day reminder was already sent */
      table.timestamp('payment_reminder_for', { useTz: true }).nullable()

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      checkIn(table, 'plan', PLAN_IDS)
      checkIn(table, 'billing_cycle', BILLING_CYCLES)
      checkIn(table, 'status', SUBSCRIPTION_STATUSES)
      table.check('declared_units >= 0')
    })
    this.schema.raw(
      `CREATE INDEX subscriptions_next_renewal ON subscriptions (next_renewal_at) WHERE next_renewal_at IS NOT NULL`
    )
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
