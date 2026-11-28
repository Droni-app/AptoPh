import { BaseSchema } from '@adonisjs/lucid/schema'
import { NOTIFICATION_CATEGORIES } from '@aptoph/shared'
import { checkIn } from '#database/tenant_schema'

/** The `documents` category: new documents and expiry warnings (docs/documents.md) */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('notifications', (table) => {
      table.dropChecks(['notifications_category_check'])
      checkIn(table, 'category', NOTIFICATION_CATEGORIES, 'notifications_category_check')
    })
  }

  async down() {
    this.defer(async (db) => {
      await db.from('notifications').where('category', 'documents').delete()
    })
    this.schema.alterTable('notifications', (table) => {
      table.dropChecks(['notifications_category_check'])
      checkIn(
        table,
        'category',
        NOTIFICATION_CATEGORIES.filter((category) => category !== 'documents'),
        'notifications_category_check'
      )
    })
  }
}
