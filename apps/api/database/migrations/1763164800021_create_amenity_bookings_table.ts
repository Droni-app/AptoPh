import { BaseSchema } from '@adonisjs/lucid/schema'
import { BOOKING_STATUSES } from '@apartadock/shared'
import {
  checkIn,
  tenantForeign,
  tenantTable,
  timestamps,
  userForeign,
} from '#database/tenant_schema'

export default class extends BaseSchema {
  protected tableName = 'amenity_bookings'

  async up() {
    this.schema.raw('CREATE EXTENSION IF NOT EXISTS btree_gist')

    this.schema.createTable(this.tableName, (table) => {
      tenantTable(table, this.raw.bind(this))
      table.uuid('amenity_id').notNullable()
      table.uuid('unit_id').notNullable()
      userForeign(table, 'requested_by_id', { nullable: false })
      table.timestamp('starts_at', { useTz: true }).notNullable()
      table.timestamp('ends_at', { useTz: true }).notNullable()
      table.smallint('guests_count').nullable()
      table.string('status', 20).notNullable().defaultTo('pending')
      table.uuid('charge_id').nullable()
      userForeign(table, 'reviewed_by_id')
      timestamps(table)

      tenantForeign(table, 'amenity_id', 'amenities', 'CASCADE')
      tenantForeign(table, 'unit_id', 'units', 'CASCADE')
      tenantForeign(table, 'charge_id', 'charges', 'SET NULL')
      checkIn(table, 'status', BOOKING_STATUSES)
      table.check('ends_at > starts_at')
      table.index(['tenant_id', 'amenity_id', 'starts_at'])
    })

    /**
     * No overlapping active bookings for the same amenity
     */
    this.schema.raw(`
      ALTER TABLE amenity_bookings
      ADD CONSTRAINT amenity_bookings_no_overlap
      EXCLUDE USING gist (amenity_id WITH =, tstzrange(starts_at, ends_at) WITH &&)
      WHERE (status IN ('pending', 'approved'))
    `)
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
