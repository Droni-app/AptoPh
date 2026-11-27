import { BaseSchema } from '@adonisjs/lucid/schema'
import {
  JOURNAL_ENTRY_TYPES,
  PARKING_AUTHORIZATIONS,
  PARKING_SETTLEMENTS,
  PARKING_STAY_STATUSES,
  PAYMENT_METHODS,
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
 * Visitor parking: one row per vehicle stay, from entry to exit, with the
 * tariff it entered with and what was charged. docs/visitor-parking.md
 *
 * Also: `journal_entries.type = 'visitor_parking'` (paid at the gate).
 */
export default class extends BaseSchema {
  protected tableName = 'parking_stays'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      tenantTable(table, this.raw.bind(this))
      /** Receipt number, consecutive per conjunto; assigned on exit */
      table.integer('number').nullable()
      table.string('status', 10).notNullable().defaultTo('inside')
      table.uuid('unit_id').notNullable()
      table.uuid('visit_id').nullable()
      table.string('vehicle_type', 20).notNullable()
      /** Normalized: uppercase letters and digits */
      table.string('plate', 10).nullable()
      table.string('vehicle_description', 100).nullable()
      table.string('visitor_name', 150).notNullable()
      table.string('visitor_document', 30).nullable()
      table.string('authorization_method', 20).notNullable()
      table.string('authorized_by_name', 150).nullable()
      table.text('authorization_notes').nullable()
      /** Entered while that vehicle type had no free spots */
      table.boolean('over_capacity').notNullable().defaultTo(false)
      /** ParkingTariff it entered with */
      table.jsonb('tariff').notNullable()
      table.timestamp('entered_at', { useTz: true }).notNullable()
      userForeign(table, 'entered_by_id', { nullable: false })
      table.timestamp('exited_at', { useTz: true }).nullable()
      userForeign(table, 'exited_by_id')
      /** ParkingDay[] charged on exit: the daily grace each plate used */
      table.jsonb('days').nullable()
      table.integer('minutes').nullable()
      table.integer('grace_minutes').nullable()
      table.integer('billed_minutes').nullable()
      table.decimal('amount', 14, 2).nullable()
      table.decimal('vat_amount', 14, 2).nullable()
      table.string('settlement', 10).nullable()
      table.string('payment_method', 20).nullable()
      table.text('exempt_reason').nullable()
      table.uuid('cash_account_id').nullable()
      table.uuid('charge_id').nullable()
      table.uuid('journal_entry_id').nullable()
      table.string('receipt_email', 254).nullable()
      table.timestamp('receipt_sent_at', { useTz: true }).nullable()
      timestamps(table)

      tenantForeign(table, 'unit_id', 'units', 'RESTRICT')
      tenantForeign(table, 'visit_id', 'visits', 'SET NULL')
      tenantForeign(table, 'cash_account_id', 'cash_accounts', 'RESTRICT')
      tenantForeign(table, 'charge_id', 'charges', 'RESTRICT')
      tenantForeign(table, 'journal_entry_id', 'journal_entries', 'RESTRICT')
      checkIn(table, 'status', PARKING_STAY_STATUSES)
      checkIn(table, 'vehicle_type', VEHICLE_TYPES)
      checkIn(table, 'authorization_method', PARKING_AUTHORIZATIONS)
      checkIn(table, 'settlement', PARKING_SETTLEMENTS)
      checkIn(table, 'payment_method', PAYMENT_METHODS)
      table.unique(['tenant_id', 'number'])
      table.index(['tenant_id', 'status'])
      table.index(['tenant_id', 'plate', 'exited_at'])
      table.index(['tenant_id', 'entered_at'])
    })
    // A vehicle cannot be inside twice
    this.schema.raw(
      `CREATE UNIQUE INDEX parking_stays_inside_plate_unique ON parking_stays (tenant_id, plate) WHERE status = 'inside' AND plate IS NOT NULL`
    )

    this.schema.alterTable('journal_entries', (table) => {
      table.dropChecks(['journal_entries_type_check'])
      checkIn(table, 'type', JOURNAL_ENTRY_TYPES, 'journal_entries_type_check')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
    this.schema.alterTable('journal_entries', (table) => {
      table.dropChecks(['journal_entries_type_check'])
      checkIn(
        table,
        'type',
        JOURNAL_ENTRY_TYPES.filter((type) => type !== 'visitor_parking'),
        'journal_entries_type_check'
      )
    })
  }
}
