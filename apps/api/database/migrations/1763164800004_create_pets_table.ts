import { BaseSchema } from '@adonisjs/lucid/schema'
import { PET_SPECIES } from '@apartadock/shared'
import { checkIn, tenantForeign, tenantTable, timestamps } from '#database/tenant_schema'

export default class extends BaseSchema {
  protected tableName = 'pets'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      tenantTable(table, this.raw.bind(this))
      table.uuid('unit_id').notNullable()
      table.string('name', 60).notNullable()
      table.string('species', 20).notNullable()
      table.string('breed', 60).nullable()
      table.boolean('is_potentially_dangerous').notNullable().defaultTo(false)
      table.string('vaccination_file_key').nullable()
      timestamps(table, { softDelete: true })

      tenantForeign(table, 'unit_id', 'units', 'CASCADE')
      checkIn(table, 'species', PET_SPECIES)
      table.index(['tenant_id', 'unit_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
