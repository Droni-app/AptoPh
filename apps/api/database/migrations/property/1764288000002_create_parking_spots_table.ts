import { BaseSchema } from '@adonisjs/lucid/schema'
import {
  DOCUMENT_TYPES,
  PARKING_ASSIGNMENT_STATUSES,
  PARKING_END_REASONS,
  PARKING_OWNERSHIPS,
  VEHICLE_OWNER_RELATIONSHIPS,
  VEHICLE_OWNER_TYPES,
  VEHICLE_TYPES,
} from '@aptoph/shared'
import {
  checkIn,
  tenantForeign,
  tenantTable,
  timestamps,
  userForeign,
} from '#database/tenant_schema'

/**
 * Parking of the conjunto (docs/parking.md):
 * - `parking_spots`: each spot, private (owned by a unit) or communal.
 * - `parking_assignments`: a communal spot held by a unit for a while.
 * - `vehicles`: owner when it is someone else's, SOAT and inspection dates.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('parking_spots', (table) => {
      tenantTable(table, this.raw.bind(this))
      table.string('code', 20).notNullable()
      table.string('vehicle_type', 20).notNullable()
      table.string('ownership', 10).notNullable()
      table.boolean('is_covered').notNullable().defaultTo(false)
      table.string('location', 80).nullable()
      table.text('notes').nullable()
      /** Out of service: not assigned nor counted as free */
      table.boolean('is_active').notNullable().defaultTo(true)
      /** Private spots: the unit that owns it */
      table.uuid('owner_unit_id').nullable()
      /** The parking unit of the structure (deed, coefficient) it was created from */
      table.uuid('property_unit_id').nullable()
      timestamps(table, { softDelete: true })

      tenantForeign(table, 'owner_unit_id', 'units', 'RESTRICT')
      tenantForeign(table, 'property_unit_id', 'units', 'SET NULL')
      checkIn(table, 'vehicle_type', VEHICLE_TYPES)
      checkIn(table, 'ownership', PARKING_OWNERSHIPS)
      table.check(
        `(ownership = 'private') = (owner_unit_id IS NOT NULL)`,
        [],
        'parking_spots_owner_check'
      )
      table.index(['tenant_id', 'ownership'])
    })
    this.schema.raw(
      `CREATE UNIQUE INDEX parking_spots_code_unique ON parking_spots (tenant_id, lower(code)) WHERE deleted_at IS NULL`
    )
    this.schema.raw(
      `CREATE UNIQUE INDEX parking_spots_property_unit_unique ON parking_spots (tenant_id, property_unit_id) WHERE deleted_at IS NULL AND property_unit_id IS NOT NULL`
    )

    this.schema.createTable('parking_assignments', (table) => {
      tenantTable(table, this.raw.bind(this))
      table.uuid('spot_id').notNullable()
      table.uuid('unit_id').notNullable()
      table.uuid('vehicle_id').nullable()
      table.string('status', 10).notNullable()
      table.date('starts_on').notNullable()
      /** Planned last day (end of the lottery period) */
      table.date('ends_on').nullable()
      /** Actual last day: cancelled, rejected (day before it starts) or ended */
      table.date('ended_on').nullable()
      /** Monthly rate it was assigned with */
      table.decimal('monthly_rate', 14, 2).notNullable()
      table.string('end_reason', 30).nullable()
      table.text('end_note').nullable()
      table.text('notes').nullable()
      userForeign(table, 'created_by_id')
      userForeign(table, 'ended_by_id')
      table.timestamp('ended_at', { useTz: true }).nullable()
      timestamps(table)

      tenantForeign(table, 'spot_id', 'parking_spots', 'RESTRICT')
      tenantForeign(table, 'unit_id', 'units', 'RESTRICT')
      tenantForeign(table, 'vehicle_id', 'vehicles', 'SET NULL')
      checkIn(table, 'status', PARKING_ASSIGNMENT_STATUSES)
      checkIn(table, 'end_reason', PARKING_END_REASONS)
      table.check(`ends_on IS NULL OR ends_on >= starts_on`, [], 'parking_assignments_dates_check')
      table.index(['tenant_id', 'unit_id'])
      table.index(['tenant_id', 'status'])
    })
    // A spot is held by one unit at a time
    this.schema.raw(
      `CREATE UNIQUE INDEX parking_assignments_spot_unique ON parking_assignments (tenant_id, spot_id) WHERE status IN ('offered', 'active')`
    )

    this.schema.alterTable('vehicles', (table) => {
      table.string('owner_type', 20).notNullable().defaultTo('resident')
      table.string('owner_name', 150).nullable()
      table.string('owner_document_type', 5).nullable()
      table.string('owner_document_number', 30).nullable()
      table.string('owner_relationship', 20).nullable()
      table.string('owner_phone', 30).nullable()
      table.date('soat_expires_on').nullable()
      /** Revisión técnico-mecánica */
      table.date('inspection_expires_on').nullable()
      checkIn(table, 'owner_type', VEHICLE_OWNER_TYPES, 'vehicles_owner_type_check')
      checkIn(table, 'owner_document_type', DOCUMENT_TYPES, 'vehicles_owner_document_type_check')
      checkIn(
        table,
        'owner_relationship',
        VEHICLE_OWNER_RELATIONSHIPS,
        'vehicles_owner_relationship_check'
      )
      table.check(
        `owner_type = 'resident' OR owner_name IS NOT NULL`,
        [],
        'vehicles_owner_name_check'
      )
    })
  }

  async down() {
    this.schema.alterTable('vehicles', (table) => {
      table.dropChecks([
        'vehicles_owner_type_check',
        'vehicles_owner_document_type_check',
        'vehicles_owner_relationship_check',
        'vehicles_owner_name_check',
      ])
      table.dropColumns(
        'owner_type',
        'owner_name',
        'owner_document_type',
        'owner_document_number',
        'owner_relationship',
        'owner_phone',
        'soat_expires_on',
        'inspection_expires_on'
      )
    })
    this.schema.dropTable('parking_assignments')
    this.schema.dropTable('parking_spots')
  }
}
