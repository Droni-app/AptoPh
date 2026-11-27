import { BaseSchema } from '@adonisjs/lucid/schema'
import { VISIT_TYPES } from '@aptoph/shared'
import {
  checkIn,
  tenantForeign,
  tenantTable,
  timestamps,
  userForeign,
} from '#database/tenant_schema'

export default class extends BaseSchema {
  protected tableName = 'visits'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      tenantTable(table, this.raw.bind(this))
      table.uuid('unit_id').notNullable()
      table.string('visitor_name', 150).notNullable()
      table.string('visitor_document', 30).nullable()
      table.string('vehicle_plate', 10).nullable()
      table.string('type', 20).notNullable().defaultTo('guest')
      userForeign(table, 'authorized_by_id')
      table.string('access_code', 12).nullable()
      table.timestamp('expected_at', { useTz: true }).nullable()
      table.timestamp('checked_in_at', { useTz: true }).nullable()
      table.timestamp('checked_out_at', { useTz: true }).nullable()
      userForeign(table, 'registered_by_id')
      timestamps(table)

      tenantForeign(table, 'unit_id', 'units', 'CASCADE')
      checkIn(table, 'type', VISIT_TYPES)
      table.index(['tenant_id', 'unit_id'])
      table.index(['tenant_id', 'expected_at'])
    })
    this.schema.raw(
      'CREATE UNIQUE INDEX visits_tenant_access_code_unique ON visits (tenant_id, access_code) WHERE access_code IS NOT NULL AND checked_out_at IS NULL'
    )
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
