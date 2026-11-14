import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * OAuth clients are the applications (web-residents, web-admin, mobile…),
 * not the tenants. They are global to the platform.
 */
export default class extends BaseSchema {
  protected tableName = 'oauth_clients'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuidv7()'))
      table.string('client_id', 80).notNullable().unique()
      table.string('name', 100).notNullable()
      /**
       * public: SPA / mobile (PKCE, no secret) · confidential: server-side apps
       */
      table.string('type', 20).notNullable().defaultTo('public')
      table.string('client_secret_hash').nullable()
      table.specificType('redirect_uris', 'text[]').notNullable().defaultTo('{}')
      table.specificType('post_logout_redirect_uris', 'text[]').notNullable().defaultTo('{}')
      table.boolean('is_active').notNullable().defaultTo(true)

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.check(`type IN ('public', 'confidential')`)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
