import { BaseSchema } from '@adonisjs/lucid/schema'
import { tenantForeign, tenantTable, userForeign } from '#database/tenant_schema'

export default class extends BaseSchema {
  protected tableName = 'announcement_reads'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      tenantTable(table, this.raw.bind(this))
      table.uuid('announcement_id').notNullable()
      userForeign(table, 'user_id', { nullable: false, onDelete: 'CASCADE' })
      table.timestamp('read_at', { useTz: true }).notNullable()

      tenantForeign(table, 'announcement_id', 'announcements', 'CASCADE')
      table.unique(['announcement_id', 'user_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
