import { BaseSchema } from '@adonisjs/lucid/schema'
import { VEHICLE_TYPES } from '@apartadock/shared'
import { checkIn, tenantForeign, tenantTable, timestamps } from '#database/tenant_schema'

export default class extends BaseSchema {
  protected tableName = 'vehicles'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      tenantTable(table, this.raw.bind(this))
      table.uuid('unit_id').notNullable()
      table.string('plate', 10).notNullable()
      table.string('type', 20).notNullable()
      table.string('brand', 60).nullable()
      table.string('model', 60).nullable()
      table.string('color', 30).nullable()
      table.uuid('parking_unit_id').nullable()
      timestamps(table, { softDelete: true })

      tenantForeign(table, 'unit_id', 'units', 'CASCADE')
      tenantForeign(table, 'parking_unit_id', 'units', 'SET NULL')
      checkIn(table, 'type', VEHICLE_TYPES)
      table.index(['tenant_id', 'unit_id'])
    })
    this.schema.raw(
      'CREATE UNIQUE INDEX vehicles_tenant_plate_unique ON vehicles (tenant_id, plate) WHERE deleted_at IS NULL'
    )
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
