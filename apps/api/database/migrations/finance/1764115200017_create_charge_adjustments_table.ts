import { BaseSchema } from '@adonisjs/lucid/schema'
import { CHARGE_ADJUSTMENT_TYPES } from '@aptoph/shared'
import { checkIn, tenantForeign, tenantTable, userForeign } from '#database/tenant_schema'

/** Credit notes, early payment discounts and cancellations of a charge */
export default class extends BaseSchema {
  protected tableName = 'charge_adjustments'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      tenantTable(table, this.raw.bind(this))
      table.uuid('charge_id').notNullable()
      table.string('type', 30).notNullable()
      table.decimal('amount', 14, 2).notNullable()
      table.string('reason', 255).nullable()
      table.uuid('payment_id').nullable()
      userForeign(table, 'created_by_id')
      table.timestamp('created_at', { useTz: true }).notNullable()
      tenantForeign(table, 'charge_id', 'charges', 'RESTRICT')
      tenantForeign(table, 'payment_id', 'payments', 'SET NULL')
      checkIn(table, 'type', CHARGE_ADJUSTMENT_TYPES)
      table.check('amount > 0')
      table.index(['tenant_id', 'charge_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
