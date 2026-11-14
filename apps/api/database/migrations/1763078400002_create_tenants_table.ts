import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'tenants'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuidv7()'))
      table.string('name', 150).notNullable()
      table.string('slug', 80).notNullable().unique()
      table.string('legal_name', 200).nullable()
      table.string('tax_id', 30).nullable()
      table.string('property_type', 30).notNullable().defaultTo('residential')
      table.string('address').nullable()
      table.string('city', 100).nullable()
      table.string('country_code', 2).notNullable().defaultTo('CO')
      table.string('timezone', 50).notNullable().defaultTo('America/Bogota')
      table.string('currency', 3).notNullable().defaultTo('COP')
      table.string('logo_file_key').nullable()
      table.string('status', 20).notNullable().defaultTo('trial')
      table.jsonb('settings').notNullable().defaultTo('{}')

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
      table.timestamp('deleted_at', { useTz: true }).nullable()

      table.check(`property_type IN ('residential', 'commercial', 'mixed')`)
      table.check(`status IN ('trial', 'active', 'suspended', 'cancelled')`)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
