import { BaseSchema } from '@adonisjs/lucid/schema'
import { NOTIFICATION_APPS, NOTIFICATION_CATEGORIES, PUSH_PLATFORMS } from '@aptoph/shared'
import { checkIn, tenantTable, timestamps, userForeign } from '#database/tenant_schema'

/**
 * Notifications (docs/notifications.md):
 * - `notifications`: the bell of each person in a conjunto (portal or back-office).
 * - `push_devices`: tokens of the mobile app (Firebase Cloud Messaging).
 * - `users.notification_preferences`: channels by category.
 * - `announcements.notified_at`: the bell and push of a comunicado go out once.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('notifications', (table) => {
      tenantTable(table, this.raw.bind(this))
      userForeign(table, 'user_id', { nullable: false, onDelete: 'CASCADE' })
      table.string('app', 12).notNullable()
      table.string('category', 20).notNullable()
      table.string('type', 60).notNullable()
      table.string('title', 200).notNullable()
      table.text('body').nullable()
      table.string('path', 300).nullable()
      /** The same event never notifies twice (reminders, retries) */
      table.string('dedupe_key', 160).nullable()
      table.timestamp('read_at', { useTz: true }).nullable()
      timestamps(table)

      checkIn(table, 'app', NOTIFICATION_APPS)
      checkIn(table, 'category', NOTIFICATION_CATEGORIES)
      table.index(['user_id', 'tenant_id', 'app', 'created_at'])
    })
    this.schema.raw(
      `CREATE UNIQUE INDEX notifications_dedupe_unique ON notifications (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL`
    )
    this.schema.raw(
      `CREATE INDEX notifications_unread ON notifications (user_id, tenant_id, app) WHERE read_at IS NULL`
    )

    this.schema.createTable('push_devices', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuidv7()'))
      userForeign(table, 'user_id', { nullable: false, onDelete: 'CASCADE' })
      table.string('token', 500).notNullable().unique()
      table.string('platform', 10).notNullable()
      table.string('device_name', 120).nullable()
      table.string('app_version', 30).nullable()
      table.timestamp('last_seen_at', { useTz: true }).notNullable()
      timestamps(table)

      checkIn(table, 'platform', PUSH_PLATFORMS)
      table.index(['user_id'])
    })

    this.schema.alterTable('users', (table) => {
      table.jsonb('notification_preferences').nullable()
    })
    this.schema.alterTable('announcements', (table) => {
      table.timestamp('notified_at', { useTz: true }).nullable()
    })
    // Already published ones are not notified when this goes live
    this.defer(async (db) => {
      await db
        .from('announcements')
        .whereNotNull('published_at')
        .update({ notified_at: new Date() })
    })
  }

  async down() {
    this.schema.alterTable('announcements', (table) => table.dropColumn('notified_at'))
    this.schema.alterTable('users', (table) => table.dropColumn('notification_preferences'))
    this.schema.dropTable('push_devices')
    this.schema.dropTable('notifications')
  }
}
