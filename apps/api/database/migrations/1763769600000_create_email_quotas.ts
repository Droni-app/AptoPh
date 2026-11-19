import { BaseSchema } from '@adonisjs/lucid/schema'
import { tenantTable } from '#database/tenant_schema'

/**
 * Monthly bulk email quota of each conjunto (docs/email-quota.md): one row per
 * calendar month with the emails used and the additional packs activated.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('email_quotas', (table) => {
      tenantTable(table, this.raw.bind(this))
      table.date('period').notNullable().comment('First day of the month')
      table.integer('used').notNullable().defaultTo(0)
      table.integer('extra_packs').notNullable().defaultTo(0)
      table.integer('requested_packs').notNullable().defaultTo(0)
      table.timestamp('requested_at', { useTz: true }).nullable()
      table
        .uuid('requested_by_id')
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).nullable()
      table.unique(['tenant_id', 'period'])
      table.check(
        'used >= 0 AND extra_packs >= 0 AND requested_packs >= 0',
        [],
        'email_quotas_counts_check'
      )
    })

    this.schema.alterTable('announcements', (table) => {
      table.boolean('email_skipped').notNullable().defaultTo(false)
    })
  }

  async down() {
    this.schema.alterTable('announcements', (table) => {
      table.dropColumn('email_skipped')
    })
    this.schema.dropTable('email_quotas')
  }
}
