import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Manual payments of the plan (PSE and other methods in Wompi's checkout, no
 * saved method): the 7-day reminder of a period is claimed with this column;
 * the 3-day one reuses `renewal_notice_for`. docs/billing.md
 */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('subscriptions', (table) => {
      table.timestamp('payment_reminder_for', { useTz: true }).nullable()
    })
  }

  async down() {
    this.schema.alterTable('subscriptions', (table) => {
      table.dropColumn('payment_reminder_for')
    })
  }
}
