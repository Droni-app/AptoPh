import { BaseSchema } from '@adonisjs/lucid/schema'
import { PARCEL_STATUSES } from '@apartadock/shared'
import {
  checkIn,
  tenantForeign,
  tenantTable,
  timestamps,
  userForeign,
} from '#database/tenant_schema'

export default class extends BaseSchema {
  protected tableName = 'parcels'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      tenantTable(table, this.raw.bind(this))
      table.uuid('unit_id').notNullable()
      table.string('carrier', 60).nullable()
      table.string('description').nullable()
      table.string('photo_file_key').nullable()
      table.timestamp('received_at', { useTz: true }).notNullable()
      userForeign(table, 'received_by_id', { nullable: false })
      table.timestamp('delivered_at', { useTz: true }).nullable()
      table.string('delivered_to_name', 150).nullable()
      table.string('status', 20).notNullable().defaultTo('pending')
      timestamps(table)

      tenantForeign(table, 'unit_id', 'units', 'CASCADE')
      checkIn(table, 'status', PARCEL_STATUSES)
      table.index(['tenant_id', 'unit_id', 'status'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
