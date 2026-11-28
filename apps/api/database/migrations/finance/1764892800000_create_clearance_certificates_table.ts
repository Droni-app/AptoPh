import { BaseSchema } from '@adonisjs/lucid/schema'
import { tenantForeign, tenantTable, timestamps, userForeign } from '#database/tenant_schema'

/**
 * Paz y salvo issued to a unit: numbered, with a code anyone can verify
 * (docs/finance.md §5).
 */
export default class extends BaseSchema {
  protected tableName = 'clearance_certificates'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      tenantTable(table, this.raw.bind(this))
      table.uuid('unit_id').notNullable()
      table.integer('number').notNullable()
      // Up to this date the unit owed nothing; valid until the end of that month
      table.date('as_of').notNullable()
      table.date('valid_until').notNullable()
      table.string('code', 16).notNullable().unique()
      // Who the certificate names (billing responsible or owner at issue time)
      table.string('holder_name', 150).nullable()
      // Charges billed and not due yet at issue time (not covered)
      table.decimal('upcoming_amount', 14, 2).notNullable().defaultTo(0)
      userForeign(table, 'issued_by_id')
      timestamps(table)

      tenantForeign(table, 'unit_id', 'units', 'RESTRICT')
      table.unique(['tenant_id', 'number'])
      table.index(['tenant_id', 'unit_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
