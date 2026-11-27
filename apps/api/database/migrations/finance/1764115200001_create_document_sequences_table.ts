import { BaseSchema } from '@adonisjs/lucid/schema'

/** Consecutive numbers per conjunto: vouchers, cash receipts, payment vouchers */
export default class extends BaseSchema {
  protected tableName = 'document_sequences'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE')
      table.string('key', 30).notNullable()
      table.integer('next_value').notNullable().defaultTo(1)
      table.primary(['tenant_id', 'key'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
