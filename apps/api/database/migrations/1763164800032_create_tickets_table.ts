import { BaseSchema } from '@adonisjs/lucid/schema'
import { TICKET_PRIORITIES, TICKET_STATUSES, TICKET_TYPES } from '@apartadock/shared'
import {
  checkIn,
  tenantForeign,
  tenantTable,
  timestamps,
  userForeign,
} from '#database/tenant_schema'

export default class extends BaseSchema {
  protected tableName = 'tickets'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      tenantTable(table, this.raw.bind(this))
      /**
       * Sequential number per tenant (shown to users as #123)
       */
      table.integer('number').notNullable()
      table.uuid('unit_id').nullable()
      userForeign(table, 'created_by_id', { nullable: false })
      userForeign(table, 'assigned_to_id')
      table.string('type', 20).notNullable()
      table.string('subject', 200).notNullable()
      table.text('description').notNullable()
      table.string('priority', 10).notNullable().defaultTo('medium')
      table.string('status', 20).notNullable().defaultTo('open')
      table.timestamp('resolved_at', { useTz: true }).nullable()
      timestamps(table)

      tenantForeign(table, 'unit_id', 'units', 'SET NULL')
      checkIn(table, 'type', TICKET_TYPES)
      checkIn(table, 'priority', TICKET_PRIORITIES)
      checkIn(table, 'status', TICKET_STATUSES)
      table.unique(['tenant_id', 'number'])
      table.index(['tenant_id', 'status'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
