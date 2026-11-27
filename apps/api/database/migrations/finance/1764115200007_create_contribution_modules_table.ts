import { BaseSchema } from '@adonisjs/lucid/schema'
import { tenantTable, timestamps } from '#database/tenant_schema'

/** Módulos de contribución (art. 29 Ley 675): sectors with their own shares */
export default class extends BaseSchema {
  protected tableName = 'contribution_modules'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      tenantTable(table, this.raw.bind(this))
      table.string('name', 100).notNullable()
      table.string('description', 255).nullable()
      timestamps(table)
      table.unique(['tenant_id', 'name'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
