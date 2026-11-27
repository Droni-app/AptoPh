import { BaseSchema } from '@adonisjs/lucid/schema'
import {
  AMENITY_PAYMENT_MODES,
  ATTACHMENT_OWNER_TYPES,
  BOOKING_MODES,
  BOOKING_TYPES,
  DEPOSIT_STATUSES,
  JOURNAL_ENTRY_TYPES,
} from '@aptoph/shared'
import { checkIn } from '#database/tenant_schema'

/**
 * The common area booking module (docs/amenities.md): how each area is
 * booked and paid, bookings for guests, third parties and maintenance blocks,
 * the payment receipt, the review and the deposit.
 *
 * The exclusion constraint now covers the cleaning time after each booking
 * (`blocked_until`), so two bookings never touch inside that margin.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('amenities', (table) => {
      table.string('booking_mode', 10).notNullable().defaultTo('hours')
      table.decimal('external_fee', 14, 2).nullable()
      table.decimal('deposit_amount', 14, 2).nullable()
      table.string('payment_mode', 10).notNullable().defaultTo('statement')
      table.boolean('allow_delinquent').notNullable().defaultTo(true)
      table.boolean('allow_guests').notNullable().defaultTo(false)
      table.boolean('allow_external').notNullable().defaultTo(false)
      table.text('terms').nullable()
      table.string('color', 7).nullable()
      checkIn(table, 'booking_mode', BOOKING_MODES, 'amenities_booking_mode_check')
      checkIn(table, 'payment_mode', AMENITY_PAYMENT_MODES, 'amenities_payment_mode_check')
    })

    this.schema.raw('ALTER TABLE amenity_bookings DROP CONSTRAINT amenity_bookings_no_overlap')
    this.schema.alterTable('amenity_bookings', (table) => {
      table.integer('number').nullable()
      table.string('booking_type', 10).notNullable().defaultTo('resident')
      table.uuid('unit_id').nullable().alter()
      table.string('holder_name', 150).nullable()
      table.string('holder_document', 30).nullable()
      table.string('holder_phone', 30).nullable()
      table.string('holder_email', 254).nullable()
      table.text('notes').nullable()
      table.timestamp('blocked_until', { useTz: true }).nullable()
      table.decimal('fee_amount', 14, 2).notNullable().defaultTo(0)
      table.decimal('deposit_amount', 14, 2).notNullable().defaultTo(0)
      table.string('payment_mode', 10).nullable()
      table.string('payment_reference', 100).nullable()
      table.text('review_note').nullable()
      table.timestamp('reviewed_at', { useTz: true }).nullable()
      table.uuid('payment_id').nullable()
      table.uuid('journal_entry_id').nullable()
      table.string('deposit_status', 10).nullable()
      table.decimal('deposit_retained', 14, 2).nullable()
      table.text('deposit_note').nullable()
      table.uuid('deposit_journal_entry_id').nullable()
      table.timestamp('cancelled_at', { useTz: true }).nullable()
      table.text('cancellation_reason').nullable()
      table
        .uuid('cancelled_by_id')
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.timestamp('reminded_at', { useTz: true }).nullable()

      table
        .foreign(['tenant_id', 'payment_id'])
        .references(['tenant_id', 'id'])
        .inTable('payments')
        .onDelete('SET NULL (payment_id)' as 'SET NULL')
      table
        .foreign(['tenant_id', 'journal_entry_id'])
        .references(['tenant_id', 'id'])
        .inTable('journal_entries')
        .onDelete('SET NULL (journal_entry_id)' as 'SET NULL')
      table
        .foreign(['tenant_id', 'deposit_journal_entry_id'])
        .references(['tenant_id', 'id'])
        .inTable('journal_entries')
        .onDelete('SET NULL (deposit_journal_entry_id)' as 'SET NULL')
      checkIn(table, 'booking_type', BOOKING_TYPES, 'amenity_bookings_booking_type_check')
      checkIn(table, 'payment_mode', AMENITY_PAYMENT_MODES, 'amenity_bookings_payment_mode_check')
      checkIn(table, 'deposit_status', DEPOSIT_STATUSES, 'amenity_bookings_deposit_status_check')
      // Residents and their guests book for a unit; third parties need a name
      table.check(
        `(booking_type IN ('resident', 'guest') AND unit_id IS NOT NULL) OR booking_type IN ('external', 'block')`,
        [],
        'amenity_bookings_unit_check'
      )
      table.check(
        `booking_type NOT IN ('guest', 'external') OR holder_name IS NOT NULL`,
        [],
        'amenity_bookings_holder_check'
      )
    })

    this.defer(async (db) => {
      await db.rawQuery(`
        UPDATE amenity_bookings b SET
          number = n.number,
          blocked_until = b.ends_at,
          fee_amount = coalesce((SELECT a.booking_fee FROM amenities a WHERE a.id = b.amenity_id), 0),
          payment_mode = 'statement'
        FROM (
          SELECT id, row_number() OVER (PARTITION BY tenant_id ORDER BY created_at, id) AS number
          FROM amenity_bookings
        ) n
        WHERE n.id = b.id
      `)
      await db.rawQuery('ALTER TABLE amenity_bookings ALTER COLUMN number SET NOT NULL')
      await db.rawQuery('ALTER TABLE amenity_bookings ALTER COLUMN blocked_until SET NOT NULL')
      await db.rawQuery(
        'ALTER TABLE amenity_bookings ADD CONSTRAINT amenity_bookings_number_unique UNIQUE (tenant_id, number)'
      )
      await db.rawQuery(
        'ALTER TABLE amenity_bookings ADD CONSTRAINT amenity_bookings_blocked_check CHECK (blocked_until >= ends_at)'
      )
      // No two active bookings (or blocks) of an area overlap, cleaning time included
      await db.rawQuery(`
        ALTER TABLE amenity_bookings
        ADD CONSTRAINT amenity_bookings_no_overlap
        EXCLUDE USING gist (amenity_id WITH =, tstzrange(starts_at, blocked_until) WITH &&)
        WHERE (status IN ('pending', 'approved'))
      `)
      await db.rawQuery(
        `CREATE INDEX amenity_bookings_reminder ON amenity_bookings (starts_at) WHERE status = 'approved' AND reminded_at IS NULL`
      )
    })

    this.schema.alterTable('journal_entries', (table) => {
      table.dropChecks(['journal_entries_type_check'])
      checkIn(table, 'type', JOURNAL_ENTRY_TYPES, 'journal_entries_type_check')
    })
    this.schema.alterTable('attachments', (table) => {
      table.dropChecks(['attachments_owner_type_check'])
      checkIn(table, 'owner_type', ATTACHMENT_OWNER_TYPES, 'attachments_owner_type_check')
    })
  }

  async down() {
    this.defer(async (db) => {
      await db.from('attachments').where('owner_type', 'amenity_booking').delete()
      await db.from('amenity_bookings').whereIn('booking_type', ['external', 'block']).delete()
    })
    this.schema.alterTable('attachments', (table) => {
      table.dropChecks(['attachments_owner_type_check'])
      checkIn(
        table,
        'owner_type',
        ATTACHMENT_OWNER_TYPES.filter((type) => type !== 'amenity_booking'),
        'attachments_owner_type_check'
      )
    })
    this.schema.alterTable('journal_entries', (table) => {
      table.dropChecks(['journal_entries_type_check'])
      checkIn(
        table,
        'type',
        JOURNAL_ENTRY_TYPES.filter((type) => !type.startsWith('amenity_')),
        'journal_entries_type_check'
      )
    })
    this.schema.raw('DROP INDEX IF EXISTS amenity_bookings_reminder')
    this.schema.raw('ALTER TABLE amenity_bookings DROP CONSTRAINT amenity_bookings_no_overlap')
    this.schema.alterTable('amenity_bookings', (table) => {
      table.dropChecks([
        'amenity_bookings_booking_type_check',
        'amenity_bookings_payment_mode_check',
        'amenity_bookings_deposit_status_check',
        'amenity_bookings_unit_check',
        'amenity_bookings_holder_check',
        'amenity_bookings_blocked_check',
      ])
      table.dropUnique(['tenant_id', 'number'], 'amenity_bookings_number_unique')
      table.dropForeign(['tenant_id', 'payment_id'])
      table.dropForeign(['tenant_id', 'journal_entry_id'])
      table.dropForeign(['tenant_id', 'deposit_journal_entry_id'])
      table.dropColumns(
        'number',
        'booking_type',
        'holder_name',
        'holder_document',
        'holder_phone',
        'holder_email',
        'notes',
        'blocked_until',
        'fee_amount',
        'deposit_amount',
        'payment_mode',
        'payment_reference',
        'review_note',
        'reviewed_at',
        'payment_id',
        'journal_entry_id',
        'deposit_status',
        'deposit_retained',
        'deposit_note',
        'deposit_journal_entry_id',
        'cancelled_at',
        'cancellation_reason',
        'cancelled_by_id',
        'reminded_at'
      )
      table.uuid('unit_id').notNullable().alter()
    })
    this.schema.raw(`
      ALTER TABLE amenity_bookings
      ADD CONSTRAINT amenity_bookings_no_overlap
      EXCLUDE USING gist (amenity_id WITH =, tstzrange(starts_at, ends_at) WITH &&)
      WHERE (status IN ('pending', 'approved'))
    `)
    this.schema.alterTable('amenities', (table) => {
      table.dropChecks(['amenities_booking_mode_check', 'amenities_payment_mode_check'])
      table.dropColumns(
        'booking_mode',
        'external_fee',
        'deposit_amount',
        'payment_mode',
        'allow_delinquent',
        'allow_guests',
        'allow_external',
        'terms',
        'color'
      )
    })
  }
}
