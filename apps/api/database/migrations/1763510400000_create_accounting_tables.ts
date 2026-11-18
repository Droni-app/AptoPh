import { BaseSchema } from '@adonisjs/lucid/schema'
import {
  ACCOUNT_CLASSES,
  BANK_ACCOUNT_KINDS,
  CASH_ACCOUNT_TYPES,
  DOCUMENT_TYPES,
  JOURNAL_ENTRY_TYPES,
} from '@aptoph/shared'
import {
  checkIn,
  tenantForeign,
  tenantTable,
  timestamps,
  userForeign,
} from '#database/tenant_schema'

/**
 * Double-entry accounting of each conjunto: chart of accounts, numbered
 * vouchers with their lines, third parties (vendors) and bank/cash accounts.
 * See docs/finance.md §9.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('ledger_accounts', (table) => {
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

    // Consecutive numbers per conjunto: vouchers, cash receipts, payment vouchers
    this.schema.createTable('document_sequences', (table) => {
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE')
      table.string('key', 30).notNullable()
      table.integer('next_value').notNullable().defaultTo(1)
      table.primary(['tenant_id', 'key'])
    })

    this.schema.createTable('vendors', (table) => {
      tenantTable(table, this.raw.bind(this))
      table.string('name', 150).notNullable()
      table.string('document_type', 5).nullable()
      table.string('document_number', 30).nullable()
      table.string('email', 254).nullable()
      table.string('phone', 30).nullable()
      table.string('address', 200).nullable()
      table.string('contact_name', 150).nullable()
      table.string('bank_name', 80).nullable()
      table.string('bank_account_kind', 10).nullable()
      table.string('bank_account_number', 40).nullable()
      table.uuid('default_account_id').nullable()
      table.text('notes').nullable()
      table.boolean('is_active').notNullable().defaultTo(true)
      timestamps(table)
      tenantForeign(table, 'default_account_id', 'ledger_accounts', 'SET NULL')
      checkIn(table, 'document_type', DOCUMENT_TYPES)
      checkIn(table, 'bank_account_kind', BANK_ACCOUNT_KINDS)
    })
    this.schema.raw(
      'CREATE UNIQUE INDEX vendors_document_unique ON vendors (tenant_id, document_number) WHERE document_number IS NOT NULL'
    )

    this.schema.createTable('journal_entries', (table) => {
      tenantTable(table, this.raw.bind(this))
      table.integer('number').notNullable()
      table.date('date').notNullable()
      table.string('type', 20).notNullable()
      table.string('description', 255).notNullable()
      // What produced the voucher (billing_period, payment, bill…)
      table.string('source_type', 30).nullable()
      table.uuid('source_id').nullable()
      table.uuid('reverses_entry_id').nullable()
      table.uuid('reversed_by_entry_id').nullable()
      table.decimal('total', 16, 2).notNullable()
      userForeign(table, 'created_by_id')
      table.timestamp('created_at', { useTz: true }).notNullable()
      tenantForeign(table, 'reverses_entry_id', 'journal_entries', 'RESTRICT')
      tenantForeign(table, 'reversed_by_entry_id', 'journal_entries', 'RESTRICT')
      checkIn(table, 'type', JOURNAL_ENTRY_TYPES)
      table.unique(['tenant_id', 'number'])
      table.index(['tenant_id', 'date'])
      table.index(['tenant_id', 'source_type', 'source_id'])
    })

    this.schema.createTable('journal_lines', (table) => {
      tenantTable(table, this.raw.bind(this))
      table.uuid('entry_id').notNullable()
      table.uuid('account_id').notNullable()
      table.decimal('debit', 16, 2).notNullable().defaultTo(0)
      table.decimal('credit', 16, 2).notNullable().defaultTo(0)
      // Third party: the unit (resident account) or the vendor
      table.uuid('unit_id').nullable()
      table.uuid('vendor_id').nullable()
      table.string('description', 255).nullable()
      tenantForeign(table, 'entry_id', 'journal_entries', 'CASCADE')
      tenantForeign(table, 'account_id', 'ledger_accounts', 'RESTRICT')
      tenantForeign(table, 'unit_id', 'units', 'RESTRICT')
      tenantForeign(table, 'vendor_id', 'vendors', 'RESTRICT')
      table.check('debit >= 0 AND credit >= 0 AND (debit = 0 OR credit = 0) AND debit + credit > 0')
      table.index(['entry_id'])
      table.index(['tenant_id', 'account_id'])
      table.index(['tenant_id', 'unit_id'])
      table.index(['tenant_id', 'vendor_id'])
    })

    this.schema.createTable('cash_accounts', (table) => {
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
    this.schema.dropTable('cash_accounts')
    this.schema.dropTable('journal_lines')
    this.schema.dropTable('journal_entries')
    this.schema.dropTable('vendors')
    this.schema.dropTable('document_sequences')
    this.schema.dropTable('ledger_accounts')
  }
}
