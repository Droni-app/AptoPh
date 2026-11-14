import { BaseSchema } from '@adonisjs/lucid/schema'
import { CHARGE_STATUSES } from '@apartadock/shared'
import {
  checkIn,
  tenantForeign,
  tenantTable,
  timestamps,
  userForeign,
} from '#database/tenant_schema'

export default class extends BaseSchema {
  protected tableName = 'charges'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      tenantTable(table, this.raw.bind(this))
      table.uuid('unit_id').notNullable()
      table.uuid('charge_concept_id').notNullable()
      /**
       * First day of the billed month
       */
      table.date('period').notNullable()
      table.string('description').nullable()
      table.decimal('amount', 14, 2).notNullable()
      table.decimal('balance', 14, 2).notNullable()
      table.date('due_on').notNullable()
      table.string('status', 20).notNullable().defaultTo('pending')
      userForeign(table, 'created_by_id')
      timestamps(table)

      tenantForeign(table, 'unit_id', 'units', 'RESTRICT')
      tenantForeign(table, 'charge_concept_id', 'charge_concepts', 'RESTRICT')
      checkIn(table, 'status', CHARGE_STATUSES)
      table.check('amount >= 0 AND balance >= 0 AND balance <= amount')
      table.index(['tenant_id', 'unit_id', 'status'])
      table.index(['tenant_id', 'period'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
