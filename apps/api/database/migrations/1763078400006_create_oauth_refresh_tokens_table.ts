import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'oauth_refresh_tokens'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuidv7()'))
      table.string('token_hash', 64).notNullable().unique()
      /**
       * All refresh tokens obtained by rotation from the same login share a
       * family. Reusing a rotated token revokes the whole family.
       */
      table.uuid('family_id').notNullable().index()
      table
        .uuid('oauth_client_id')
        .notNullable()
        .references('id')
        .inTable('oauth_clients')
        .onDelete('CASCADE')
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table
        .integer('access_token_id')
        .nullable()
        .references('id')
        .inTable('auth_access_tokens')
        .onDelete('SET NULL')
      table.string('scope').nullable()
      table.timestamp('expires_at', { useTz: true }).notNullable()
      table.timestamp('revoked_at', { useTz: true }).nullable()

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
