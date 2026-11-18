import { BaseSchema } from '@adonisjs/lucid/schema'
import { ANNOUNCEMENT_AUDIENCES } from '@aptoph/shared'
import { checkIn, tenantTable, timestamps, userForeign } from '#database/tenant_schema'

export default class extends BaseSchema {
  protected tableName = 'announcements'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      tenantTable(table, this.raw.bind(this))
      table.string('title', 200).notNullable()
      /**
       * Markdown
       */
      table.text('body').notNullable()
      table.string('audience', 20).notNullable().defaultTo('all')
      /**
       * NULL = draft
       */
      table.timestamp('published_at', { useTz: true }).nullable()
      table.boolean('is_pinned').notNullable().defaultTo(false)
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
