import { BaseSchema } from '@adonisjs/lucid/schema'
import { JOURNAL_ENTRY_TYPES } from '@aptoph/shared'
import { checkIn, tenantForeign, tenantTable, userForeign } from '#database/tenant_schema'

/** Numbered accounting vouchers (comprobantes) */
export default class extends BaseSchema {
  protected tableName = 'journal_entries'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      tenantTable(table, this.raw.bind(this))
      table.integer('number').notNullable()
      table.date('date').notNullable()
      table.string('type', 20).notNullable()
      table.string('description', 255).notNullable()
      // What produced the voucher (billing_period, payment, bill…)
      table.string('source_type', 30).nullable()
      table.uuid('source_id').nullable()
      table.uuid('reverses_entry_id').nullable()
      table.uuid('reversed_by_entry_id').nullable()
      table.decimal('total', 16, 2).notNullable()
      userForeign(table, 'created_by_id')
      table.timestamp('created_at', { useTz: true }).notNullable()
      tenantForeign(table, 'reverses_entry_id', 'journal_entries', 'RESTRICT')
      tenantForeign(table, 'reversed_by_entry_id', 'journal_entries', 'RESTRICT')
      checkIn(table, 'type', JOURNAL_ENTRY_TYPES)
      table.unique(['tenant_id', 'number'])
      table.index(['tenant_id', 'date'])
      table.index(['tenant_id', 'source_type', 'source_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
