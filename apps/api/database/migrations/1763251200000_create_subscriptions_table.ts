import { BaseSchema } from '@adonisjs/lucid/schema'
import { BILLING_CYCLES, PLAN_IDS, SUBSCRIPTION_STATUSES } from '@aptoph/shared'

const list = (items: readonly string[]) => items.map((item) => `'${item}'`).join(', ')

/**
 * One subscription per tenant (plan, cycle, trial and paid period).
 * Tenants without a subscription are managed accounts (demo, pilots): no restrictions.
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
      /** Last time the administrator asked to activate a paid plan */
      table.timestamp('activation_requested_at', { useTz: true }).nullable()
      table.timestamp('cancelled_at', { useTz: true }).nullable()

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.check(`plan IN (${list(PLAN_IDS)})`)
      table.check(`billing_cycle IN (${list(BILLING_CYCLES)})`)
      table.check(`status IN (${list(SUBSCRIPTION_STATUSES)})`)
      table.check('declared_units >= 0')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
