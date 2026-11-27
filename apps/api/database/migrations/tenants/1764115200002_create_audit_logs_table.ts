import { BaseSchema } from '@adonisjs/lucid/schema'
import { userForeign } from '#database/tenant_schema'

/**
 * Global table: tenant_id is NULL for platform-level actions.
 */
export default class extends BaseSchema {
  protected tableName = 'audit_logs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuidv7()'))
      table.uuid('tenant_id').nullable().references('id').inTable('tenants').onDelete('SET NULL')
      userForeign(table, 'user_id')
      table.string('action', 50).notNullable()
      table.string('auditable_type', 50).notNullable()
      table.uuid('auditable_id').nullable()
      table.jsonb('changes').nullable()
      table.specificType('ip_address', 'inet').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()

      table.index(['tenant_id', 'auditable_type', 'auditable_id'])
      table.index(['tenant_id', 'created_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
