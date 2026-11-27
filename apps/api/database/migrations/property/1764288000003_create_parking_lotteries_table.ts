import { BaseSchema } from '@adonisjs/lucid/schema'
import {
  PARKING_APPLICATION_STATUSES,
  PARKING_ASSIGNMENT_STATUSES,
  PARKING_END_REASONS,
  PARKING_LOTTERY_STATUSES,
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
 * Lottery of the communal parking spots (docs/parking.md §Sorteo):
 * - `parking_lotteries`: one per period, with the seed that orders the draw.
 * - `parking_applications`: the units that apply; after the draw, the
 *   waiting list.
 * - `parking_assignments`: `scheduled` (won, starts with the period), the
 *   lottery and application it comes from, and the offer reasons.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('parking_lotteries', (table) => {
      tenantTable(table, this.raw.bind(this))
      table.integer('number').notNullable()
      table.string('title', 120).notNullable()
      table.string('status', 10).notNullable().defaultTo('open')
      table.timestamp('closes_at', { useTz: true }).notNullable()
      table.date('period_starts_on').notNullable()
      table.date('period_ends_on').notNullable()
      table.text('notes').nullable()
      /** Hex; orders the draw and is published after it */
      table.string('seed', 64).nullable()
      table.timestamp('drawn_at', { useTz: true }).nullable()
      userForeign(table, 'drawn_by_id')
      userForeign(table, 'created_by_id')
      table.integer('notified_count').notNullable().defaultTo(0)
      timestamps(table)

      checkIn(table, 'status', PARKING_LOTTERY_STATUSES)
      table.check('period_ends_on >= period_starts_on', [], 'parking_lotteries_period_check')
      table.unique(['tenant_id', 'number'])
      table.index(['tenant_id', 'status'])
    })
    // One lottery receiving applications at a time
    this.schema.raw(
      `CREATE UNIQUE INDEX parking_lotteries_open_unique ON parking_lotteries (tenant_id) WHERE status = 'open'`
    )

    this.schema.createTable('parking_applications', (table) => {
      tenantTable(table, this.raw.bind(this))
      table.uuid('lottery_id').notNullable()
      table.uuid('unit_id').notNullable()
      table.uuid('vehicle_id').nullable()
      table.string('vehicle_type', 20).notNullable()
      table.string('status', 12).notNullable().defaultTo('pending')
      /** 0: without a private spot */
      table.smallint('priority_group').notNullable().defaultTo(0)
      /** SHA-256(seed:id), hex */
      table.string('draw_hash', 64).nullable()
      /** Order in the draw within its vehicle type; late applications go after */
      table.integer('draw_position').nullable()
      table.text('ineligible_reason').nullable()
      table.uuid('spot_id').nullable()
      table.timestamp('offer_expires_at', { useTz: true }).nullable()
      table.timestamp('responded_at', { useTz: true }).nullable()
      /** Applied after the draw: straight to the end of the waiting list */
      table.boolean('late').notNullable().defaultTo(false)
      userForeign(table, 'applied_by_id')
      timestamps(table)

      tenantForeign(table, 'lottery_id', 'parking_lotteries', 'CASCADE')
      tenantForeign(table, 'unit_id', 'units', 'RESTRICT')
      tenantForeign(table, 'vehicle_id', 'vehicles', 'SET NULL')
      tenantForeign(table, 'spot_id', 'parking_spots', 'SET NULL')
      checkIn(table, 'status', PARKING_APPLICATION_STATUSES)
      checkIn(table, 'vehicle_type', VEHICLE_TYPES)
      table.index(['tenant_id', 'lottery_id', 'status'])
    })
    // A unit applies once per vehicle type in a lottery
    this.schema.raw(
      `CREATE UNIQUE INDEX parking_applications_unit_unique ON parking_applications (lottery_id, unit_id, vehicle_type) WHERE status <> 'withdrawn'`
    )

    this.schema.alterTable('parking_assignments', (table) => {
      table.uuid('lottery_id').nullable()
      table.uuid('application_id').nullable()
      tenantForeign(table, 'lottery_id', 'parking_lotteries', 'SET NULL')
      tenantForeign(table, 'application_id', 'parking_applications', 'SET NULL')
      table.dropChecks(['parking_assignments_status_check', 'parking_assignments_end_reason_check'])
      checkIn(table, 'status', PARKING_ASSIGNMENT_STATUSES, 'parking_assignments_status_check')
      checkIn(table, 'end_reason', PARKING_END_REASONS, 'parking_assignments_end_reason_check')
    })
    // A spot is won once for the next period
    this.schema.raw(
      `CREATE UNIQUE INDEX parking_assignments_scheduled_unique ON parking_assignments (tenant_id, spot_id) WHERE status = 'scheduled'`
    )
  }

  async down() {
    this.schema.raw('DROP INDEX IF EXISTS parking_assignments_scheduled_unique')
    this.schema.alterTable('parking_assignments', (table) => {
      table.dropForeign(['tenant_id', 'lottery_id'])
      table.dropForeign(['tenant_id', 'application_id'])
      table.dropColumns('lottery_id', 'application_id')
      table.dropChecks(['parking_assignments_status_check', 'parking_assignments_end_reason_check'])
      checkIn(
        table,
        'status',
        PARKING_ASSIGNMENT_STATUSES.filter((status) => status !== 'scheduled'),
        'parking_assignments_status_check'
      )
      checkIn(
        table,
        'end_reason',
        PARKING_END_REASONS.filter((r) => r !== 'offer_declined' && r !== 'offer_expired'),
        'parking_assignments_end_reason_check'
      )
    })
    this.schema.dropTable('parking_applications')
    this.schema.dropTable('parking_lotteries')
  }
}
