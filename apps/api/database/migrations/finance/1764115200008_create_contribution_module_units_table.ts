import { BaseSchema } from '@adonisjs/lucid/schema'
import { tenantForeign, tenantTable } from '#database/tenant_schema'

/** Share of each unit in a contribution module */
export default class extends BaseSchema {
  protected tableName = 'contribution_module_units'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      tenantTable(table, this.raw.bind(this))
      table.uuid('module_id').notNullable()
      table.uuid('unit_id').notNullable()
      table.decimal('share', 12, 6).notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      tenantForeign(table, 'module_id', 'contribution_modules', 'CASCADE')
      tenantForeign(table, 'unit_id', 'units', 'CASCADE')
      table.check('share > 0')
      table.unique(['module_id', 'unit_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
