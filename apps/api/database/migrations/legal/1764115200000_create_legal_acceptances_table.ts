import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Evidence of the acceptance of the legal documents (Ley 1581 de 2012 asks to be able
 * to prove the authorization): who accepted which version, when, from where and in
 * which flow. Append-only. `tenant_id` is the conjunto the acceptance was given for
 * (the one created at sign-up, or the one of the invitation).
 */
export default class extends BaseSchema {
  protected tableName = 'legal_acceptances'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuidv7()'))
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.uuid('tenant_id').nullable().references('id').inTable('tenants').onDelete('SET NULL')
      table.string('document', 30).notNullable()
      table.string('version', 10).notNullable()
      table.string('context', 20).notNullable()
      table.specificType('ip_address', 'inet').nullable()
      table.string('user_agent', 500).nullable()
      table.timestamp('accepted_at', { useTz: true }).notNullable()

      table.index(['user_id', 'document'])
      table.index(['tenant_id'])
      table.check(`document IN ('terms', 'privacy', 'data_processing', 'cookies')`)
      table.check(`context IN ('signup', 'invitation')`)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
