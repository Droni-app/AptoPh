import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'enrollments'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuidv7()'))
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT')
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.string('role', 30).notNullable()
      table.string('status', 20).notNullable().defaultTo('invited')
      table.string('title', 100).nullable()
      table.date('starts_on').nullable()
      table.date('ends_on').nullable()
      table.uuid('invited_by_id').nullable().references('id').inTable('users').onDelete('SET NULL')
      table.string('invitation_token_hash').nullable()
      table.timestamp('accepted_at', { useTz: true }).nullable()

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.unique(['tenant_id', 'id'])
      table.unique(['tenant_id', 'user_id', 'role'])
      table.index(['user_id', 'status'])
      table.check(
        `role IN ('administrator', 'council_member', 'accountant', 'fiscal_reviewer', 'staff', 'security_guard', 'resident')`
      )
      table.check(`status IN ('invited', 'active', 'suspended', 'revoked')`)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
