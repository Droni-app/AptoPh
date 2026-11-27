import { BaseSchema } from '@adonisjs/lucid/schema'
import { tenantForeign, tenantTable } from '#database/tenant_schema'

/** Towers an announcement is for (none = every tower) */
export default class extends BaseSchema {
  protected tableName = 'announcement_buildings'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      tenantTable(table, this.raw.bind(this))
      table.uuid('announcement_id').notNullable()
      table.uuid('building_id').notNullable()
      tenantForeign(table, 'announcement_id', 'announcements', 'CASCADE')
      tenantForeign(table, 'building_id', 'buildings', 'CASCADE')
      table.unique(['announcement_id', 'building_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
