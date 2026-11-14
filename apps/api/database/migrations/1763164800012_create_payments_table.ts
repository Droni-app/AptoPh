import { BaseSchema } from '@adonisjs/lucid/schema'
import { PAYMENT_METHODS, PAYMENT_STATUSES } from '@apartadock/shared'
import {
  checkIn,
  tenantForeign,
  tenantTable,
  timestamps,
  userForeign,
} from '#database/tenant_schema'

export default class extends BaseSchema {
  protected tableName = 'payments'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      tenantTable(table, this.raw.bind(this))
      table.uuid('unit_id').notNullable()
      table.decimal('amount', 14, 2).notNullable()
      table.timestamp('paid_at', { useTz: true }).notNullable()
      table.string('method', 20).notNullable()
      table.string('reference', 100).nullable()
      table.string('receipt_file_key').nullable()
      table.string('status', 20).notNullable().defaultTo('pending_review')
      userForeign(table, 'registered_by_id')
      userForeign(table, 'confirmed_by_id')
      timestamps(table)

      tenantForeign(table, 'unit_id', 'units', 'RESTRICT')
      checkIn(table, 'method', PAYMENT_METHODS)
      checkIn(table, 'status', PAYMENT_STATUSES)
      table.check('amount > 0')
      table.index(['tenant_id', 'unit_id'])
      table.index(['tenant_id', 'status'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
