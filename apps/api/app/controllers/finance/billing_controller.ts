import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { fromCents, toCents } from '@aptoph/shared'
import Charge from '#models/finance/charge'
import { BillingService } from '#services/finance/billing'
import { notifyChargesGenerated } from '#services/notifications/finance_notifications'
import { ChargeService } from '#services/finance/charges'
import { todayFor } from '#services/finance/support'
import { paginated, serializeCharge, serializePeriod } from '#transformers/finance/finance'
import {
  createChargeValidator,
  creditNoteValidator,
  listChargesValidator,
  periodValidator,
  reasonValidator,
} from '#validators/finance/finance'
import { finance, normalizePeriod } from '#controllers/finance/helpers'

/**
 * Monthly billing periods and the charges of the units.
 */
export default class BillingController {
  async periods({ tenant }: HttpContext) {
    const periods = await tenant
      .related('billingPeriods')
      .query()
      .select('billing_periods.*')
      .select(
        db.raw(
          "(SELECT COALESCE(SUM(c.balance), 0) FROM charges c WHERE c.billing_period_id = billing_periods.id AND c.status <> 'cancelled') AS balance"
        )
      )
      .orderBy('period', 'desc')
      .limit(36)
    return { data: periods.map(serializePeriod) }
  }

  /** GET /finance/periods/preview?period=2026-11 */
  async preview({ tenant, request }: HttpContext) {
    const { period } = await request.validateUsing(periodValidator, { data: request.qs() })
    const month = normalizePeriod(period)
    const plan = await BillingService.plan(tenant, month)
    const existing = await tenant.related('billingPeriods').query().where('period', month).first()
    const byConcept = new Map<
      string,
      { conceptId: string; name: string; count: number; total: number }
    >()
    for (const line of plan.lines) {
      const entry = byConcept.get(line.conceptId) ?? {
        conceptId: line.conceptId,
        name: line.conceptName,
        count: 0,
        total: 0,
      }
      entry.count += 1
      entry.total += line.amount
      byConcept.set(line.conceptId, entry)
    }
    return {
      data: {
        period: month,
        dueOn: plan.dueOn,
        discountUntil: plan.discountUntil,
        discountRate: plan.discountRate,
        interestRate: plan.interestRate,
        existing: existing ? serializePeriod(existing) : null,
        concepts: [...byConcept.values()].map((entry) => ({
          ...entry,
          total: fromCents(entry.total),
        })),
        lines: plan.lines.map((line) => ({
          unitId: line.unitId,
          unitCode: line.unitCode,
          conceptId: line.conceptId,
          conceptName: line.conceptName,
          description: line.description,
          kind: line.kind,
          amount: fromCents(line.amount),
          discountAmount: fromCents(line.item.discountAmount ?? 0),
        })),
        count: plan.lines.length,
        total: fromCents(plan.lines.reduce((sum, line) => sum + line.amount, 0)),
        reserveFund: fromCents(plan.reserveFund),
        warnings: plan.warnings,
      },
    }
  }

  async generate(ctx: HttpContext) {
    const { period } = await ctx.request.validateUsing(periodValidator)
    const result = await finance(ctx, (scope) =>
      new BillingService(scope).generate(normalizePeriod(period))
    )
    await notifyChargesGenerated(ctx.tenant, normalizePeriod(period), result.charges ?? [])
    return {
      data: {
        period: serializePeriod(result.period),
        created: result.created,
        total: fromCents(result.total),
        reserveFund: fromCents(result.reserveFund),
        warnings: result.warnings,
      },
    }
  }

  async showPeriod({ tenant, params }: HttpContext) {
    const period = await tenant
      .related('billingPeriods')
      .query()
      .where('id', params.id)
      .firstOrFail()
    const concepts = await db
      .from('charges as c')
      .join('charge_concepts as k', 'k.id', 'c.charge_concept_id')
      .where('c.billing_period_id', period.id)
      .whereNot('c.status', 'cancelled')
      .groupBy('k.id', 'k.name')
      .select('k.id', 'k.name')
      .count('* as count')
      .sum('c.amount as total')
      .sum('c.balance as balance')
      .orderBy('k.name')
    return {
      data: {
        ...serializePeriod(period),
        concepts: concepts.map((row) => ({
          conceptId: row.id,
          name: row.name,
          count: Number(row.count),
          total: fromCents(toCents(row.total)),
          balance: fromCents(toCents(row.balance)),
        })),
      },
    }
  }

  async close(ctx: HttpContext) {
    const period = await ctx.tenant
      .related('billingPeriods')
      .query()
      .where('id', ctx.params.id)
      .firstOrFail()
    await finance(ctx, (scope) => new BillingService(scope).close(period))
    return { data: serializePeriod(period) }
  }

  async reopen(ctx: HttpContext) {
    const period = await ctx.tenant
      .related('billingPeriods')
      .query()
      .where('id', ctx.params.id)
      .firstOrFail()
    await finance(ctx, (scope) => new BillingService(scope).reopen(period))
    return { data: serializePeriod(period) }
  }

  async charges({ tenant, request }: HttpContext) {
    const filters = await request.validateUsing(listChargesValidator, { data: request.qs() })
    const query = tenant
      .related('charges')
      .query()
      .preload('unit', (units) => units.preload('building'))
      .preload('chargeConcept')
      .orderBy('period', 'desc')
      .orderBy('due_on', 'desc')
      .orderBy('created_at', 'desc')
    if (filters.unitId) query.where('unit_id', filters.unitId)
    if (filters.conceptId) query.where('charge_concept_id', filters.conceptId)
    if (filters.billingPeriodId) query.where('billing_period_id', filters.billingPeriodId)
    if (filters.period) query.where('period', normalizePeriod(filters.period))
    if (filters.status === 'open') query.whereIn('status', ['pending', 'partially_paid'])
    else if (filters.status === 'overdue')
      query.whereIn('status', ['pending', 'partially_paid']).where('due_on', '<', todayFor(tenant))
    else if (filters.status) query.where('status', filters.status)
    if (filters.search) {
      query.whereHas('unit', (units) => units.whereILike('code', `%${filters.search}%`))
    }
    const page = await query.paginate(filters.page ?? 1, filters.perPage ?? 50)
    return paginated(page, serializeCharge)
  }

  async showCharge({ tenant, params }: HttpContext) {
    const charge = await tenant
      .related('charges')
      .query()
      .where('id', params.id)
      .preload('unit', (units) => units.preload('building'))
      .preload('chargeConcept')
      .preload('adjustments', (adjustments) => adjustments.orderBy('created_at'))
      .firstOrFail()
    const allocations = await db
      .from('payment_allocations as a')
      .join('payments as p', 'p.id', 'a.payment_id')
      .where('a.charge_id', charge.id)
      .select('p.id', 'p.number', 'p.paid_at', 'p.method', 'a.amount')
      .orderBy('p.paid_at')
    return {
      data: {
        ...serializeCharge(charge),
        payments: allocations.map((row) => ({
          id: row.id,
          number: row.number,
          paidAt: row.paid_at instanceof Date ? row.paid_at.toISOString() : row.paid_at,
          method: row.method,
          amount: fromCents(toCents(row.amount)),
        })),
      },
    }
  }

  /** Manual charges to one or many units */
  async storeCharges(ctx: HttpContext) {
    const data = await ctx.request.validateUsing(createChargeValidator)
    const charges = await finance(ctx, async (scope) => {
      const service = new ChargeService(scope)
      const concept = await service.concept({ id: data.conceptId })
      return service.issue([...new Set(data.unitIds)], {
        concept,
        amount: toCents(data.amount),
        dueOn: data.dueOn,
        period: data.period ? normalizePeriod(data.period) : undefined,
        description: data.description,
      })
    })
    ctx.response.status(201)
    return {
      data: {
        created: charges.length,
        total: fromCents(charges.reduce((sum, charge) => sum + toCents(charge.amount), 0)),
      },
    }
  }

  async cancelCharge(ctx: HttpContext) {
    const { reason } = await ctx.request.validateUsing(reasonValidator)
    const charge = await finance(ctx, async (scope) => {
      const found = await Charge.query({ client: scope.trx })
        .where('tenant_id', ctx.tenant.id)
        .where('id', ctx.params.id)
        .forUpdate()
        .firstOrFail()
      return new ChargeService(scope).cancel(found, reason)
    })
    await charge.load('chargeConcept')
    return { data: serializeCharge(charge) }
  }

  async creditNote(ctx: HttpContext) {
    const { amount, reason } = await ctx.request.validateUsing(creditNoteValidator)
    const charge = await finance(ctx, async (scope) => {
      const found = await Charge.query({ client: scope.trx })
        .where('tenant_id', ctx.tenant.id)
        .where('id', ctx.params.id)
        .forUpdate()
        .firstOrFail()
      return new ChargeService(scope).creditNote(found, toCents(amount), reason)
    })
    await charge.load('chargeConcept')
    return { data: serializeCharge(charge) }
  }
}
