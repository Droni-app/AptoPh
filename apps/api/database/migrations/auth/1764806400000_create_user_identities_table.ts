import { BaseSchema } from '@adonisjs/lucid/schema'
import { IDENTITY_PROVIDERS } from '@aptoph/shared'
import { checkIn } from '#database/tenant_schema'

/**
 * External accounts linked to a user (sign in with Google). A user may have
 * a password, linked accounts or both.
 */
export default class extends BaseSchema {
  protected tableName = 'user_identities'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuidv7()'))
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.string('provider', 20).notNullable()
      /** The account id at the provider (Google `sub`): stable, unlike the email */
      table.string('provider_user_id', 255).notNullable()
      /** Email of the provider account when it was linked or last used */
      table.string('email', 254).notNullable()
      table.timestamp('last_used_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()

      checkIn(table, 'provider', IDENTITY_PROVIDERS)
      table.unique(['provider', 'provider_user_id'])
      table.unique(['user_id', 'provider'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
