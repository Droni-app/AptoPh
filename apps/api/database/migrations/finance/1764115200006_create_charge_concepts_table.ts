import { BaseSchema } from '@adonisjs/lucid/schema'
import { CHARGE_CONCEPT_TYPES } from '@aptoph/shared'
import { checkIn, tenantForeign, tenantTable, timestamps } from '#database/tenant_schema'

/** What is charged to the units (cuota ordinaria, extraordinaria, multas…) */
export default class extends BaseSchema {
  protected tableName = 'charge_concepts'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      tenantTable(table, this.raw.bind(this))
      table.string('name', 100).notNullable()
      table.string('type', 20).notNullable()
      table.decimal('default_amount', 14, 2).nullable()
      table.boolean('is_active').notNullable().defaultTo(true)
      // Concepts the system relies on ("ordinary_fee", "interest"…); null for custom ones
      table.string('code', 40).nullable()
      table.boolean('accrues_interest').notNullable().defaultTo(false)
      table.boolean('allows_early_discount').notNullable().defaultTo(false)
      table.uuid('receivable_account_id').nullable()
      table.uuid('income_account_id').nullable()
      timestamps(table)
      tenantForeign(table, 'receivable_account_id', 'ledger_accounts', 'RESTRICT')
      tenantForeign(table, 'income_account_id', 'ledger_accounts', 'RESTRICT')
      checkIn(table, 'type', CHARGE_CONCEPT_TYPES)
      table.unique(['tenant_id', 'name'])
    })
    this.schema.raw(
      'CREATE UNIQUE INDEX charge_concepts_code_unique ON charge_concepts (tenant_id, code) WHERE code IS NOT NULL'
    )
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
