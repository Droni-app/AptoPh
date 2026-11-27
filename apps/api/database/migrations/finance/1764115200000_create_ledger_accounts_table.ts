import { BaseSchema } from '@adonisjs/lucid/schema'
import { ACCOUNT_CLASSES } from '@aptoph/shared'
import { checkIn, tenantTable, timestamps } from '#database/tenant_schema'

/**
 * Chart of accounts (PUC) of each conjunto, for its double-entry accounting.
 * docs/finance.md §9.
 */
export default class extends BaseSchema {
  protected tableName = 'ledger_accounts'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      tenantTable(table, this.raw.bind(this))
      // PUC code: 1 class, 2 group, 4 account, 6 subaccount, 8 auxiliary
      table.string('code', 12).notNullable()
      table.string('name', 150).notNullable()
      table.string('class', 12).notNullable()
      table.string('nature', 6).notNullable()
      // Only leaf accounts receive postings
      table.boolean('is_postable').notNullable().defaultTo(true)
      // Accounts the system posts to automatically ("receivable.ordinary_fee"…)
      table.string('system_key', 60).nullable()
      table.boolean('is_active').notNullable().defaultTo(true)
      timestamps(table)
      checkIn(table, 'class', ACCOUNT_CLASSES)
      checkIn(table, 'nature', ['debit', 'credit'])
      table.unique(['tenant_id', 'code'])
    })
    this.schema.raw(
      'CREATE UNIQUE INDEX ledger_accounts_system_key_unique ON ledger_accounts (tenant_id, system_key) WHERE system_key IS NOT NULL'
    )
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
