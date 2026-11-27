import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import { toCents } from '@aptoph/shared'
import Payment from '#models/finance/payment'
import { PaymentService } from '#services/finance/payments'
import { paginated, serializePayment } from '#transformers/finance/finance'
import {
  confirmPaymentValidator,
  listPaymentsValidator,
  reasonValidator,
  registerPaymentValidator,
} from '#validators/finance/finance'
import { finance, paidAtFrom } from '#controllers/finance/helpers'
import type { FinanceScope } from '#services/finance/scope'

async function lockedPayment(scope: FinanceScope, id: string) {
  return Payment.query({ client: scope.trx })
    .where('tenant_id', scope.tenant.id)
    .where('id', id)
    .forUpdate()
    .firstOrFail()
}

async function present(payment: Payment) {
  await payment.load((loader) => {
    loader
      .load('unit', (units) => units.preload('building'))
      .load('cashAccount')
      .load('registeredBy')
      .load('allocations', (allocations) =>
        allocations.preload('charge', (charges) => charges.preload('chargeConcept'))
      )
  })
  return serializePayment(payment)
}

/**
 * Recaudo: payments registered by the administration or reported by residents.
 */
export default class PaymentsController {
  async index({ tenant, request }: HttpContext) {
    const filters = await request.validateUsing(listPaymentsValidator, { data: request.qs() })
    const zone = tenant.timezone || 'America/Bogota'
    const query = tenant
      .related('payments')
      .query()
      .preload('unit', (units) => units.preload('building'))
      .preload('cashAccount')
      .preload('registeredBy')
      .orderByRaw("CASE WHEN status = 'pending_review' THEN 0 ELSE 1 END")
      .orderBy('paid_at', 'desc')
      .orderBy('created_at', 'desc')
    if (filters.status) query.where('status', filters.status)
    if (filters.unitId) query.where('unit_id', filters.unitId)
    if (filters.from)
      query.where('paid_at', '>=', DateTime.fromISO(filters.from, { zone }).toSQL()!)
    if (filters.to)
      query.where('paid_at', '<', DateTime.fromISO(filters.to, { zone }).plus({ days: 1 }).toSQL()!)
    if (filters.search) {
      const search = filters.search
      query.where((q) => {
        q.whereHas('unit', (units) => units.whereILike('code', `%${search}%`)).orWhereILike(
          'reference',
          `%${search}%`
        )
        if (/^\d+$/.test(search)) q.orWhere('number', Number(search))
      })
    }
    const page = await query.paginate(filters.page ?? 1, filters.perPage ?? 25)
    return paginated(page, serializePayment)
  }

  async show({ tenant, params }: HttpContext) {
    const payment = await tenant.related('payments').query().where('id', params.id).firstOrFail()
    return { data: await present(payment) }
  }

  async store(ctx: HttpContext) {
    const data = await ctx.request.validateUsing(registerPaymentValidator)
    const payment = await finance(ctx, (scope) =>
      new PaymentService(scope).register({
        unitId: data.unitId,
        amount: toCents(data.amount),
        paidAt: paidAtFrom(ctx.tenant, data.paidOn),
        method: data.method,
        reference: data.reference,
        notes: data.notes,
        cashAccountId: data.cashAccountId,
        allocations: data.allocations?.map((item) => ({
          chargeId: item.chargeId,
          amount: toCents(item.amount),
        })),
      })
    )
    ctx.response.status(201)
    return { data: await present(payment) }
  }

  async confirm(ctx: HttpContext) {
    const { cashAccountId } = await ctx.request.validateUsing(confirmPaymentValidator)
    const payment = await finance(ctx, async (scope) =>
      new PaymentService(scope).confirm(await lockedPayment(scope, ctx.params.id), cashAccountId)
    )
    return { data: await present(payment) }
  }

  async reject(ctx: HttpContext) {
    const { reason } = await ctx.request.validateUsing(reasonValidator)
    const payment = await finance(ctx, async (scope) =>
      new PaymentService(scope).reject(await lockedPayment(scope, ctx.params.id), reason)
    )
    return { data: await present(payment) }
  }

  async reverse(ctx: HttpContext) {
    const { reason } = await ctx.request.validateUsing(reasonValidator)
    const payment = await finance(ctx, async (scope) =>
      new PaymentService(scope).reverse(await lockedPayment(scope, ctx.params.id), reason)
    )
    return { data: await present(payment) }
  }
}
