import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Invitations by email: when the link expires and when it was last sent.
 * Users invited to a conjunto have no password until they accept.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('enrollments', (table) => {
      table.timestamp('invitation_expires_at', { useTz: true }).nullable()
      table.timestamp('invitation_sent_at', { useTz: true }).nullable()
      table.unique(['invitation_token_hash'])
    })
    this.schema.alterTable('users', (table) => {
      table.string('password').nullable().alter()
    })
  }

  async down() {
    this.defer(async (db) => {
      await db.from('users').whereNull('password').delete()
    })
    this.schema.alterTable('users', (table) => {
      table.string('password').notNullable().alter()
    })
    this.schema.alterTable('enrollments', (table) => {
      table.dropUnique(['invitation_token_hash'])
      table.dropColumn('invitation_expires_at')
      table.dropColumn('invitation_sent_at')
    })
  }
}
