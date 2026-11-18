import { BaseSchema } from '@adonisjs/lucid/schema'
import { CHARGE_CALCULATIONS, CHARGE_CONCEPT_TYPES } from '@aptoph/shared'
import { checkIn, tenantTable, timestamps } from '#database/tenant_schema'

export default class extends BaseSchema {
  protected tableName = 'charge_concepts'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      tenantTable(table, this.raw.bind(this))
      table.string('name', 100).notNullable()
      table.string('type', 20).notNullable()
      table.string('calculation', 20).notNullable().defaultTo('fixed')
      table.decimal('default_amount', 14, 2).nullable()
      table.boolean('is_active').notNullable().defaultTo(true)
      timestamps(table)

      checkIn(table, 'type', CHARGE_CONCEPT_TYPES)
      checkIn(table, 'calculation', CHARGE_CALCULATIONS)
      table.unique(['tenant_id', 'name'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
