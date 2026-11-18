import { BaseSchema } from '@adonisjs/lucid/schema'
import {
  BILLING_PERIOD_STATUSES,
  CHARGE_CALCULATIONS,
  BUDGET_STATUSES,
  CHARGE_ADJUSTMENT_TYPES,
  CHARGE_CONCEPT_TYPES,
  CHARGE_SOURCES,
  FEE_METHODS,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
} from '@aptoph/shared'
import {
  checkIn,
  tenantForeign,
  tenantTable,
  timestamps,
  userForeign,
} from '#database/tenant_schema'

// Values before this migration, restored by down()
const LEGACY_CONCEPT_TYPES = [
  'ordinary_fee',
  'extraordinary_fee',
  'fine',
  'interest',
  'service',
  'other',
]
const LEGACY_PAYMENT_METHODS = ['cash', 'bank_transfer', 'card', 'pse', 'other']
const LEGACY_PAYMENT_STATUSES = ['pending_review', 'confirmed', 'rejected']

/**
 * Receivables (cartera): fee schedules and per-unit recurring charges,
 * contribution modules, monthly billing periods, charge adjustments and the
 * extra columns charges and payments need. See docs/finance.md §2–§5 and §8.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.raw(
      'ALTER TABLE charge_concepts DROP CONSTRAINT IF EXISTS charge_concepts_type_check, DROP CONSTRAINT IF EXISTS charge_concepts_calculation_check'
    )
    this.schema.alterTable('charge_concepts', (table) => {
      table.dropColumn('calculation')
      // Concepts the system relies on ("ordinary_fee", "interest"…); null for custom ones
      table.string('code', 40).nullable()
      table.boolean('accrues_interest').notNullable().defaultTo(false)
      table.boolean('allows_early_discount').notNullable().defaultTo(false)
      table.uuid('receivable_account_id').nullable()
      table.uuid('income_account_id').nullable()
      tenantForeign(table, 'receivable_account_id', 'ledger_accounts', 'RESTRICT')
      tenantForeign(table, 'income_account_id', 'ledger_accounts', 'RESTRICT')
      checkIn(table, 'type', CHARGE_CONCEPT_TYPES, 'charge_concepts_type_check')
    })
    this.schema.raw(
      'CREATE UNIQUE INDEX charge_concepts_code_unique ON charge_concepts (tenant_id, code) WHERE code IS NOT NULL'
    )
    this.schema.raw(
      "UPDATE charge_concepts SET accrues_interest = true WHERE type IN ('ordinary_fee', 'extraordinary_fee')"
    )

    // Módulos de contribución (art. 29 Ley 675): sectors with their own shares
    this.schema.createTable('contribution_modules', (table) => {
      tenantTable(table, this.raw.bind(this))
      table.string('name', 100).notNullable()
      table.string('description', 255).nullable()
      timestamps(table)
      table.unique(['tenant_id', 'name'])
    })
    this.schema.createTable('contribution_module_units', (table) => {
      tenantTable(table, this.raw.bind(this))
      table.uuid('module_id').notNullable()
      table.uuid('unit_id').notNullable()
      table.decimal('share', 12, 6).notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      tenantForeign(table, 'module_id', 'contribution_modules', 'CASCADE')
      tenantForeign(table, 'unit_id', 'units', 'CASCADE')
      table.check('share > 0')
      table.unique(['module_id', 'unit_id'])
    })

    this.schema.createTable('budgets', (table) => {
      tenantTable(table, this.raw.bind(this))
      table.smallint('year').notNullable()
      table.string('name', 100).notNullable()
      table.string('status', 10).notNullable().defaultTo('draft')
      // Fondo de imprevistos (art. 35 Ley 675): at least 1 % of the expenses
      table.decimal('reserve_fund_rate', 5, 2).notNullable().defaultTo(1)
      table.date('approved_on').nullable()
      table.string('approval_reference', 150).nullable()
      table.text('notes').nullable()
      timestamps(table)
      checkIn(table, 'status', BUDGET_STATUSES)
      table.check('reserve_fund_rate >= 0 AND reserve_fund_rate <= 100')
      table.unique(['tenant_id', 'year'])
    })
    this.schema.createTable('budget_items', (table) => {
      tenantTable(table, this.raw.bind(this))
      table.uuid('budget_id').notNullable()
      table.uuid('account_id').notNullable()
      table.string('description', 150).nullable()
      table.decimal('annual_amount', 16, 2).notNullable()
      timestamps(table)
      tenantForeign(table, 'budget_id', 'budgets', 'CASCADE')
      tenantForeign(table, 'account_id', 'ledger_accounts', 'RESTRICT')
      table.check('annual_amount >= 0')
      table.unique(['budget_id', 'account_id'])
    })

    this.schema.createTable('fee_schedules', (table) => {
      tenantTable(table, this.raw.bind(this))
      table.uuid('charge_concept_id').notNullable()
      table.string('method', 20).notNullable()
      table.decimal('monthly_total', 14, 2).nullable()
      table.jsonb('parameters').notNullable().defaultTo('{}')
      table.date('effective_from').notNullable()
      table.uuid('budget_id').nullable()
      table.decimal('total_amount', 14, 2).notNullable()
      table.integer('units_count').notNullable()
      userForeign(table, 'created_by_id')
      table.timestamp('created_at', { useTz: true }).notNullable()
      tenantForeign(table, 'charge_concept_id', 'charge_concepts', 'RESTRICT')
      tenantForeign(table, 'budget_id', 'budgets', 'SET NULL')
      checkIn(table, 'method', FEE_METHODS)
    })

    // Tarifas: what each unit pays every month for a concept
    this.schema.createTable('recurring_charges', (table) => {
      tenantTable(table, this.raw.bind(this))
      table.uuid('unit_id').notNullable()
      table.uuid('charge_concept_id').notNullable()
      table.decimal('amount', 14, 2).notNullable()
      table.string('description', 255).nullable()
      // First day of the first and last billed months
      table.date('starts_on').notNullable()
      table.date('ends_on').nullable()
      table.uuid('fee_schedule_id').nullable()
      userForeign(table, 'created_by_id')
      timestamps(table)
      tenantForeign(table, 'unit_id', 'units', 'RESTRICT')
      tenantForeign(table, 'charge_concept_id', 'charge_concepts', 'RESTRICT')
      tenantForeign(table, 'fee_schedule_id', 'fee_schedules', 'SET NULL')
      table.check('amount >= 0')
      table.check('ends_on IS NULL OR ends_on >= starts_on')
      table.index(['tenant_id', 'unit_id'])
      table.index(['tenant_id', 'charge_concept_id'])
    })

    this.schema.createTable('billing_periods', (table) => {
      tenantTable(table, this.raw.bind(this))
      table.date('period').notNullable()
      table.date('due_on').notNullable()
      table.date('discount_until').nullable()
      table.decimal('discount_rate', 5, 2).nullable()
      table.decimal('interest_rate', 5, 2).nullable()
      table.string('status', 10).notNullable().defaultTo('open')
      table.timestamp('generated_at', { useTz: true }).nullable()
      userForeign(table, 'generated_by_id')
      table.timestamp('closed_at', { useTz: true }).nullable()
      userForeign(table, 'closed_by_id')
      table.integer('charges_count').notNullable().defaultTo(0)
      table.decimal('total_amount', 16, 2).notNullable().defaultTo(0)
      timestamps(table)
      checkIn(table, 'status', BILLING_PERIOD_STATUSES)
      table.unique(['tenant_id', 'period'])
    })

    this.schema.alterTable('charges', (table) => {
      table.uuid('billing_period_id').nullable()
      table.uuid('recurring_charge_id').nullable()
      table.string('source_type', 20).nullable()
      table.uuid('source_id').nullable()
      // Makes generation idempotent: "rec:{recurring}:{period}", "int:{charge}:{period}"…
      table.string('idempotency_key', 120).nullable()
      table.date('discount_until').nullable()
      table.decimal('discount_amount', 14, 2).notNullable().defaultTo(0)
      table.timestamp('cancelled_at', { useTz: true }).nullable()
      userForeign(table, 'cancelled_by_id')
      table.string('cancellation_reason', 255).nullable()
      tenantForeign(table, 'billing_period_id', 'billing_periods', 'RESTRICT')
      tenantForeign(table, 'recurring_charge_id', 'recurring_charges', 'SET NULL')
      checkIn(table, 'source_type', CHARGE_SOURCES, 'charges_source_type_check')
      table.check(
        'discount_amount >= 0 AND discount_amount <= amount',
        [],
        'charges_discount_amount_check'
      )
      table.index(['tenant_id', 'billing_period_id'])
    })
    this.schema.raw(
      'CREATE UNIQUE INDEX charges_idempotency_unique ON charges (tenant_id, idempotency_key) WHERE idempotency_key IS NOT NULL'
    )
    this.schema.raw("UPDATE charges SET source_type = 'manual' WHERE source_type IS NULL")

    this.schema.createTable('charge_adjustments', (table) => {
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

    this.schema.raw(
      'ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_method_check, DROP CONSTRAINT IF EXISTS payments_status_check'
    )
    this.schema.alterTable('payments', (table) => {
      // Recibo de caja: assigned when the payment is confirmed
      table.integer('number').nullable()
      table.uuid('cash_account_id').nullable()
      // Saldo a favor: what is left after paying the open charges
      table.decimal('unapplied_amount', 14, 2).notNullable().defaultTo(0)
      table.string('notes', 255).nullable()
      table.timestamp('reviewed_at', { useTz: true }).nullable()
      table.string('rejection_reason', 255).nullable()
      table.timestamp('reversed_at', { useTz: true }).nullable()
      userForeign(table, 'reversed_by_id')
      table.string('reversal_reason', 255).nullable()
      tenantForeign(table, 'cash_account_id', 'cash_accounts', 'RESTRICT')
      checkIn(table, 'method', PAYMENT_METHODS, 'payments_method_check')
      checkIn(table, 'status', PAYMENT_STATUSES, 'payments_status_check')
      table.check(
        'unapplied_amount >= 0 AND unapplied_amount <= amount',
        [],
        'payments_unapplied_amount_check'
      )
    })
    this.schema.raw(
      'CREATE UNIQUE INDEX payments_number_unique ON payments (tenant_id, number) WHERE number IS NOT NULL'
    )
    this.schema.raw(`
      UPDATE payments p SET unapplied_amount = p.amount - coalesce(
        (SELECT sum(a.amount) FROM payment_allocations a WHERE a.payment_id = p.id), 0)
    `)
  }

  async down() {
    this.schema.raw('DROP INDEX IF EXISTS payments_number_unique')
    this.schema.alterTable('payments', (table) => {
      table.dropForeign(['tenant_id', 'cash_account_id'])
      table.dropChecks([
        'payments_method_check',
        'payments_status_check',
        'payments_unapplied_amount_check',
      ])
      checkIn(table, 'method', LEGACY_PAYMENT_METHODS, 'payments_method_check')
      checkIn(table, 'status', LEGACY_PAYMENT_STATUSES, 'payments_status_check')
      table.dropColumns(
        'number',
        'cash_account_id',
        'unapplied_amount',
        'notes',
        'reviewed_at',
        'rejection_reason',
        'reversed_at',
        'reversed_by_id',
        'reversal_reason'
      )
    })
    this.schema.dropTable('charge_adjustments')
    this.schema.raw('DROP INDEX IF EXISTS charges_idempotency_unique')
    this.schema.alterTable('charges', (table) => {
      table.dropChecks(['charges_source_type_check', 'charges_discount_amount_check'])
      table.dropForeign(['tenant_id', 'billing_period_id'])
      table.dropForeign(['tenant_id', 'recurring_charge_id'])
      table.dropColumns(
        'billing_period_id',
        'recurring_charge_id',
        'source_type',
        'source_id',
        'idempotency_key',
        'discount_until',
        'discount_amount',
        'cancelled_at',
        'cancelled_by_id',
        'cancellation_reason'
      )
    })
    this.schema.dropTable('billing_periods')
    this.schema.dropTable('recurring_charges')
    this.schema.dropTable('fee_schedules')
    this.schema.dropTable('budget_items')
    this.schema.dropTable('budgets')
    this.schema.dropTable('contribution_module_units')
    this.schema.dropTable('contribution_modules')
    this.schema.raw('DROP INDEX IF EXISTS charge_concepts_code_unique')
    this.schema.alterTable('charge_concepts', (table) => {
      table.dropChecks(['charge_concepts_type_check'])
      table.dropForeign(['tenant_id', 'receivable_account_id'])
      table.dropForeign(['tenant_id', 'income_account_id'])
      table.dropColumns(
        'code',
        'accrues_interest',
        'allows_early_discount',
        'receivable_account_id',
        'income_account_id'
      )
      table.string('calculation', 20).notNullable().defaultTo('fixed')
      checkIn(table, 'type', LEGACY_CONCEPT_TYPES, 'charge_concepts_type_check')
      checkIn(table, 'calculation', CHARGE_CALCULATIONS, 'charge_concepts_calculation_check')
    })
  }
}
