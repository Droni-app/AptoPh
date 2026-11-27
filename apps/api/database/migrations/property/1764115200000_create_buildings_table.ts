import { BaseSchema } from '@adonisjs/lucid/schema'
import { tenantTable, timestamps } from '#database/tenant_schema'

export default class extends BaseSchema {
  protected tableName = 'buildings'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      tenantTable(table, this.raw.bind(this))
      table.string('name', 80).notNullable()
      table.smallint('floors').nullable()
      table.smallint('sort_order').notNullable().defaultTo(0)
      timestamps(table)

      table.unique(['tenant_id', 'name'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
