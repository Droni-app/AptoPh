import { BaseSchema } from '@adonisjs/lucid/schema'
import { ANNOUNCEMENT_AUDIENCES } from '@aptoph/shared'
import { checkIn, tenantTable, timestamps, userForeign } from '#database/tenant_schema'

/**
 * Comunicados (docs/announcements.md):
 *  - `published_at` NULL = draft; in the future = scheduled
 *  - optional email to the audience when it is published (once: `emailed_at`)
 *  - segmentation by tower in `announcement_buildings` (none = every tower)
 *  - attachments (`attachments.owner_type = 'announcement'`)
 */
export default class extends BaseSchema {
  protected tableName = 'announcements'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      tenantTable(table, this.raw.bind(this))
      table.string('title', 200).notNullable()
      /**
       * Rich text: HTML sanitized by the API ('' when the comunicado is just its image)
       */
      table.text('body').notNullable().defaultTo('')
      table.string('audience', 20).notNullable().defaultTo('all')
      table.timestamp('published_at', { useTz: true }).nullable()
      table.boolean('is_pinned').notNullable().defaultTo(false)
      table.boolean('send_email').notNullable().defaultTo(false)
      table.timestamp('emailed_at', { useTz: true }).nullable()
      table.integer('email_count').nullable()
      /** The email was not sent: the monthly quota was used up */
      table.boolean('email_skipped').notNullable().defaultTo(false)
      userForeign(table, 'created_by_id', { nullable: false })
      timestamps(table, { softDelete: true })

      checkIn(table, 'audience', ANNOUNCEMENT_AUDIENCES)
      table.index(['tenant_id', 'published_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
