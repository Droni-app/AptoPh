import { BaseSchema } from '@adonisjs/lucid/schema'
import { tenantForeign, tenantTable, timestamps, userForeign } from '#database/tenant_schema'

export default class extends BaseSchema {
  protected tableName = 'ticket_comments'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      tenantTable(table, this.raw.bind(this))
      table.uuid('ticket_id').notNullable()
      userForeign(table, 'author_id', { nullable: false })
      table.text('body').notNullable()
      /**
       * Visible only to the back-office
       */
      table.boolean('is_internal').notNullable().defaultTo(false)
      timestamps(table)

      tenantForeign(table, 'ticket_id', 'tickets', 'CASCADE')
      table.index(['tenant_id', 'ticket_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
