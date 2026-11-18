import type { HttpContext } from '@adonisjs/core/http'
import { toCents } from '@aptoph/shared'
import FieldException from '#exceptions/field_exception'
import Payment from '#models/payment'
import { findOwnUnit, residentUnitIds } from '#services/resident_scope'
import { ensureFinanceSetup } from '#services/finance/setup'
import { serializePayment } from '#transformers/finance'
import { reportPaymentValidator, statementValidator } from '#validators/finance'
import { unitStatement } from '#controllers/finance/accounting_controller'
import { paidAtFrom } from '#controllers/finance/helpers'

/**
 * Residents: statement of their units, their payments and payment reports.
 */
export default class FinanceController {
  /** GET /resident/units/:unitId/statement */
  async statement({ tenant, auth, params, request }: HttpContext) {
    await findOwnUnit(tenant, auth.getUserOrFail().id, params.unitId)
    await ensureFinanceSetup(tenant)
    const range = await request.validateUsing(statementValidator, { data: request.qs() })
    return { data: await unitStatement(tenant, params.unitId, range) }
  }

  /** GET /resident/payments — payments of their units, newest first */
  async payments({ tenant, auth }: HttpContext) {
    const unitIds = await residentUnitIds(tenant, auth.getUserOrFail().id)
    if (unitIds.length === 0) return { data: [] }
    const payments = await Payment.query()
      .where('tenant_id', tenant.id)
      .whereIn('unit_id', unitIds)
      .preload('unit', (units) => units.preload('building'))
      .orderBy('paid_at', 'desc')
      .orderBy('created_at', 'desc')
      .limit(100)
    return {
      data: payments.map((payment) => {
        const { registeredBy, cashAccount, ...rest } = serializePayment(payment)
        void registeredBy
        void cashAccount
        return rest
      }),
    }
  }

  /** POST /resident/units/:unitId/payments — "ya pagué": the administration reviews it */
  async report({ tenant, auth, params, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    await findOwnUnit(tenant, user.id, params.unitId)
    const data = await request.validateUsing(reportPaymentValidator)
    const pending = await Payment.query()
      .where('tenant_id', tenant.id)
      .where('unit_id', params.unitId)
      .where('status', 'pending_review')
      .count('* as total')
    if (Number(pending[0]!.$extras.total) >= 5) {
      throw new FieldException(
        'amount',
        'Ya tienes 5 pagos por revisar. Espera a que la administración los revise.'
      )
    }
    const payment = await Payment.create({
      tenantId: tenant.id,
      unitId: params.unitId,
      amount: String(toCents(data.amount) / 100),
      paidAt: paidAtFrom(tenant, data.paidOn),
      method: data.method,
      reference: data.reference ?? null,
      notes: data.notes ?? null,
      status: 'pending_review',
      registeredById: user.id,
      unappliedAmount: '0.00',
    })
    await payment.load('unit', (units) => units.preload('building'))
    response.status(201)
    const { registeredBy, cashAccount, ...rest } = serializePayment(payment)
    void registeredBy
    void cashAccount
    return { data: rest }
  }
}
