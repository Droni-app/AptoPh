import { BaseSchema } from '@adonisjs/lucid/schema'
import { USER_TOKEN_TYPES } from '@aptoph/shared'
import { checkIn } from '#database/tenant_schema'

/**
 * Single-use tokens sent by email (password reset, email verification).
 * Only the SHA-256 hash of the token is stored.
 */
export default class extends BaseSchema {
  protected tableName = 'user_tokens'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuidv7()'))
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.string('type', 30).notNullable()
      table.string('token_hash', 64).notNullable().unique()
      table.timestamp('expires_at', { useTz: true }).notNullable()
      table.timestamp('used_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()

      checkIn(table, 'type', USER_TOKEN_TYPES)
      table.index(['user_id', 'type'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
