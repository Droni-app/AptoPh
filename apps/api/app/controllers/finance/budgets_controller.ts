import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'
import { Exception } from '@adonisjs/core/exceptions'
import FieldException from '#exceptions/field_exception'
import type Budget from '#models/budget'
import BudgetItem from '#models/budget_item'
import type Tenant from '#models/tenant'
import { budgetMonthlyBase } from '#services/finance/fees'
import { FinanceReports } from '#services/finance/reports'
import { fromCents } from '@aptoph/shared'
import { serializeBudget } from '#transformers/finance'
import { approveBudgetValidator, budgetValidator } from '#validators/finance'

type BudgetBody = Awaited<ReturnType<typeof budgetValidator.validate>>

const TOTALS = `
  (SELECT COALESCE(SUM(i.annual_amount), 0) FROM budget_items i JOIN ledger_accounts a ON a.id = i.account_id
    WHERE i.budget_id = budgets.id AND a.class = 'income') AS income,
  (SELECT COALESCE(SUM(i.annual_amount), 0) FROM budget_items i JOIN ledger_accounts a ON a.id = i.account_id
    WHERE i.budget_id = budgets.id AND a.class = 'expense') AS expense`

async function checkItems(tenant: Tenant, items: BudgetBody['items']) {
  const ids = [...new Set(items.map((item) => item.accountId))]
  if (ids.length !== items.length)
    throw new FieldException('items', 'Hay cuentas repetidas en el presupuesto')
  if (ids.length === 0) return
  const accounts = await tenant
    .related('ledgerAccounts')
    .query()
    .whereIn('id', ids)
    .where('is_postable', true)
    .whereIn('class', ['income', 'expense'])
  if (accounts.length !== ids.length) {
    throw new FieldException('items', 'Los rubros deben ser subcuentas de ingreso o gasto')
  }
}

async function present(budget: Budget) {
  await budget.load('items', (items) =>
    items
      .preload('account')
      .orderByRaw('(SELECT code FROM ledger_accounts a WHERE a.id = budget_items.account_id)')
  )
  const base = await budgetMonthlyBase(budget)
  return {
    ...serializeBudget(budget),
    monthlyBase: {
      expenses: fromCents(base.expenses),
      reserve: fromCents(base.reserve),
      otherIncome: fromCents(base.otherIncome),
      monthly: fromCents(base.monthly),
    },
  }
}

/** Annual budget (presupuesto) and its execution */
export default class BudgetsController {
  async index({ tenant }: HttpContext) {
    const budgets = await tenant
      .related('budgets')
      .query()
      .select('budgets.*')
      .select(db.raw(TOTALS))
      .orderBy('year', 'desc')
    return { data: budgets.map(serializeBudget) }
  }

  async show({ tenant, params }: HttpContext) {
    const budget = await tenant.related('budgets').query().where('id', params.id).firstOrFail()
    const data = await present(budget)
    return {
      data: { ...data, execution: await new FinanceReports(tenant).budgetExecution(budget) },
    }
  }

  async store({ tenant, request, response }: HttpContext) {
    const data = await request.validateUsing(budgetValidator)
    if (await tenant.related('budgets').query().where('year', data.year).first()) {
      throw new FieldException('year', `Ya hay un presupuesto para ${data.year}`)
    }
    await checkItems(tenant, data.items)
    const budget = await db.transaction(async (trx) => {
      const created = await tenant.related('budgets').create(
        {
          year: data.year,
          name: data.name,
          reserveFundRate: String(data.reserveFundRate),
          notes: data.notes ?? null,
          status: 'draft',
        },
        { client: trx }
      )
      await this.saveItems(tenant, created.id, data.items, trx)
      return created
    })
    response.status(201)
    return { data: await present(budget) }
  }

  async update({ tenant, params, request }: HttpContext) {
    const budget = await tenant.related('budgets').query().where('id', params.id).firstOrFail()
    if (budget.status === 'approved') {
      throw new Exception('El presupuesto ya fue aprobado: no se puede modificar', { status: 409 })
    }
    const data = await request.validateUsing(budgetValidator)
    if (
      data.year !== budget.year &&
      (await tenant.related('budgets').query().where('year', data.year).first())
    ) {
      throw new FieldException('year', `Ya hay un presupuesto para ${data.year}`)
    }
    await checkItems(tenant, data.items)
    await db.transaction(async (trx) => {
      budget.useTransaction(trx)
      budget.merge({
        year: data.year,
        name: data.name,
        reserveFundRate: String(data.reserveFundRate),
        notes: data.notes ?? null,
      })
      await budget.save()
      await BudgetItem.query({ client: trx }).where('budget_id', budget.id).delete()
      await this.saveItems(tenant, budget.id, data.items, trx)
    })
    return { data: await present(budget) }
  }

  /** Approved by the assembly: the base of the fees and of the reserve fund */
  async approve({ tenant, params, request }: HttpContext) {
    const budget = await tenant.related('budgets').query().where('id', params.id).firstOrFail()
    const data = await request.validateUsing(approveBudgetValidator)
    if (budget.status === 'approved')
      throw new Exception('El presupuesto ya está aprobado', { status: 409 })
    budget.merge({
      status: 'approved',
      approvedOn: DateTime.fromISO(data.approvedOn),
      approvalReference: data.approvalReference ?? null,
    })
    await budget.save()
    return { data: await present(budget) }
  }

  /** Back to draft, e.g. to fix a typo before the assembly */
  async reopen({ tenant, params }: HttpContext) {
    const budget = await tenant.related('budgets').query().where('id', params.id).firstOrFail()
    budget.merge({ status: 'draft', approvedOn: null, approvalReference: null })
    await budget.save()
    return { data: await present(budget) }
  }

  async destroy({ tenant, params, response }: HttpContext) {
    const budget = await tenant.related('budgets').query().where('id', params.id).firstOrFail()
    if (budget.status === 'approved') {
      throw new Exception('Un presupuesto aprobado no se puede eliminar', { status: 409 })
    }
    await budget.delete()
    return response.noContent()
  }

  private async saveItems(
    tenant: Tenant,
    budgetId: string,
    items: BudgetBody['items'],
    trx: TransactionClientContract
  ) {
    if (items.length === 0) return
    await BudgetItem.createMany(
      items.map((item) => ({
        tenantId: tenant.id,
        budgetId,
        accountId: item.accountId,
        description: item.description ?? null,
        annualAmount: String(item.annualAmount),
      })),
      { client: trx }
    )
  }
}
