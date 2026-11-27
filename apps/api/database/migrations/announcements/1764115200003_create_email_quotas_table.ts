import { BaseSchema } from '@adonisjs/lucid/schema'
import { tenantTable } from '#database/tenant_schema'

/**
 * Monthly bulk email quota of each conjunto (docs/email-quota.md): one row per
 * calendar month with the emails used and the additional packs paid.
 */
export default class extends BaseSchema {
  protected tableName = 'email_quotas'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      tenantTable(table, this.raw.bind(this))
      table.date('period').notNullable().comment('First day of the month')
      table.integer('used').notNullable().defaultTo(0)
      table.integer('extra_packs').notNullable().defaultTo(0)
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).nullable()
      table.unique(['tenant_id', 'period'])
      table.check('used >= 0 AND extra_packs >= 0', [], 'email_quotas_counts_check')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
