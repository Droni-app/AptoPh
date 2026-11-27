import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * People of the platform. A person invited to a conjunto has no password until
 * they accept the invitation.
 */
export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuidv7()'))
      table.string('full_name', 150).notNullable()
      table.string('email', 254).notNullable().unique()
      table.string('password').nullable()
      table.string('phone', 30).nullable()
      table.string('document_type', 10).nullable()
      table.string('document_number', 30).nullable()
      table.string('avatar_file_key').nullable()
      table.boolean('is_platform_admin').notNullable().defaultTo(false)
      table.string('status', 20).notNullable().defaultTo('active')
      table.timestamp('email_verified_at', { useTz: true }).nullable()
      table.timestamp('last_login_at', { useTz: true }).nullable()

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
      table.timestamp('deleted_at', { useTz: true }).nullable()

      table.unique(['document_type', 'document_number'])
      table.check(`status IN ('active', 'blocked')`)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
