import { BaseSchema } from '@adonisjs/lucid/schema'
import { tenantTable, timestamps } from '#database/tenant_schema'

export default class extends BaseSchema {
  protected tableName = 'amenities'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      tenantTable(table, this.raw.bind(this))
      table.string('name', 100).notNullable()
      table.text('description').nullable()
      table.smallint('capacity').nullable()
      table.decimal('booking_fee', 14, 2).nullable()
      table.boolean('requires_approval').notNullable().defaultTo(true)
      /**
       * Opening hours, max duration, min notice, limit per unit…
       */
      table.jsonb('rules').notNullable().defaultTo('{}')
      table.boolean('is_active').notNullable().defaultTo(true)
      timestamps(table)

      table.unique(['tenant_id', 'name'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
