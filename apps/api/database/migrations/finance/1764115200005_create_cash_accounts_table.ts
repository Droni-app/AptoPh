import { BaseSchema } from '@adonisjs/lucid/schema'
import { BANK_ACCOUNT_KINDS, CASH_ACCOUNT_TYPES } from '@aptoph/shared'
import { checkIn, tenantForeign, tenantTable, timestamps } from '#database/tenant_schema'

/** Banks and petty cash where the money of the conjunto is */
export default class extends BaseSchema {
  protected tableName = 'cash_accounts'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      tenantTable(table, this.raw.bind(this))
      table.string('name', 100).notNullable()
      table.string('type', 10).notNullable()
      table.string('bank_name', 80).nullable()
      table.string('account_kind', 10).nullable()
      table.string('account_number', 40).nullable()
      table.uuid('ledger_account_id').notNullable()
      table.boolean('is_active').notNullable().defaultTo(true)
      timestamps(table)
      tenantForeign(table, 'ledger_account_id', 'ledger_accounts', 'RESTRICT')
      checkIn(table, 'type', CASH_ACCOUNT_TYPES)
      checkIn(table, 'account_kind', BANK_ACCOUNT_KINDS)
      table.unique(['tenant_id', 'name'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
