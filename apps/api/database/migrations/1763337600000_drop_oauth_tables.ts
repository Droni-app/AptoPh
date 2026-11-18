import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Authentication moved from OAuth 2.1 + PKCE to AdonisJS access tokens issued by
 * /api/v1/auth/login (docs/authentication.md). The OAuth tables are no longer used.
 * The access tokens that OAuth issued stay valid until they expire.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.dropTableIfExists('oauth_refresh_tokens')
    this.schema.dropTableIfExists('oauth_authorization_codes')
    this.schema.dropTableIfExists('oauth_clients')
  }

  async down() {
    this.schema.createTable('oauth_clients', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuidv7()'))
      table.string('client_id', 80).notNullable().unique()
      table.string('name', 100).notNullable()
      table.string('type', 20).notNullable().defaultTo('public')
      table.string('client_secret_hash').nullable()
      table.specificType('redirect_uris', 'text[]').notNullable().defaultTo('{}')
      table.specificType('post_logout_redirect_uris', 'text[]').notNullable().defaultTo('{}')
      table.boolean('is_active').notNullable().defaultTo(true)
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
      table.check(`type IN ('public', 'confidential')`)
    })

    this.schema.createTable('oauth_authorization_codes', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuidv7()'))
      table.string('code_hash', 64).notNullable().unique()
      table
        .uuid('oauth_client_id')
        .notNullable()
        .references('id')
        .inTable('oauth_clients')
        .onDelete('CASCADE')
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.text('redirect_uri').notNullable()
      table.string('code_challenge', 128).notNullable()
      table.string('code_challenge_method', 10).notNullable()
      table.string('scope').nullable()
      table.timestamp('expires_at', { useTz: true }).notNullable()
      table.timestamp('consumed_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
    })

    this.schema.createTable('oauth_refresh_tokens', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuidv7()'))
      table.string('token_hash', 64).notNullable().unique()
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
}
