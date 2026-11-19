import { BaseSchema } from '@adonisjs/lucid/schema'
import { checkIn, tenantForeign, tenantTable } from '#database/tenant_schema'

const OWNER_TYPES = ['bill', 'vendor_payment', 'payment', 'journal_entry']

/**
 * Comunicados (docs/announcements.md):
 *  - `published_at` in the future = scheduled
 *  - optional email to the audience when it is published (once: `emailed_at`)
 *  - segmentation by tower (`announcement_buildings`; none = every tower)
 *  - attachments (`attachments.owner_type = 'announcement'`)
 */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('announcements', (table) => {
      table.boolean('send_email').notNullable().defaultTo(false)
      table.timestamp('emailed_at', { useTz: true }).nullable()
      table.integer('email_count').nullable()
    })

    this.schema.createTable('announcement_buildings', (table) => {
      tenantTable(table, this.raw.bind(this))
      table.uuid('announcement_id').notNullable()
      table.uuid('building_id').notNullable()
      tenantForeign(table, 'announcement_id', 'announcements', 'CASCADE')
      tenantForeign(table, 'building_id', 'buildings', 'CASCADE')
      table.unique(['announcement_id', 'building_id'])
    })

    this.schema.alterTable('attachments', (table) => {
      table.dropChecks(['attachments_owner_type_check'])
      checkIn(table, 'owner_type', [...OWNER_TYPES, 'announcement'], 'attachments_owner_type_check')
    })
  }

  async down() {
    this.schema.raw("DELETE FROM attachments WHERE owner_type = 'announcement'")
    this.schema.alterTable('attachments', (table) => {
      table.dropChecks(['attachments_owner_type_check'])
      checkIn(table, 'owner_type', OWNER_TYPES, 'attachments_owner_type_check')
    })
    this.schema.dropTable('announcement_buildings')
    this.schema.alterTable('announcements', (table) => {
      table.dropColumn('send_email')
      table.dropColumn('emailed_at')
      table.dropColumn('email_count')
    })
  }
}
