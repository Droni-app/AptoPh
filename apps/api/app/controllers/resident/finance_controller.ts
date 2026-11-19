import type { HttpContext } from '@adonisjs/core/http'
import { RESIDENT_ATTACHMENT_MAX, toCents } from '@aptoph/shared'
import FieldException from '#exceptions/field_exception'
import ResourceException from '#exceptions/resource_exception'
import type Attachment from '#models/attachment'
import Payment from '#models/payment'
import type Tenant from '#models/tenant'
import { AttachmentsService } from '#services/attachments'
import { serializeAttachment } from '#transformers/attachment_transformer'
import { attachmentUrlValidator, uploadAttachmentValidator } from '#validators/attachment'
import { findOwnUnit, residentUnitIds } from '#services/resident_scope'
import { ensureFinanceSetup } from '#services/finance/setup'
import { serializePayment } from '#transformers/finance'
import { reportPaymentValidator, statementValidator } from '#validators/finance'
import { unitStatement } from '#controllers/finance/accounting_controller'
import { paidAtFrom } from '#controllers/finance/helpers'

/** A payment as residents see it, with its receipts */
function presentPayment(payment: Payment, userId: string, attachments: Attachment[]) {
  const { registeredBy, cashAccount, ...rest } = serializePayment(payment)
  void registeredBy
  void cashAccount
  return {
    ...rest,
    attachments: attachments.map(serializeAttachment),
    canAttach: payment.status === 'pending_review' && payment.registeredById === userId,
  }
}

/** A payment of one of the resident's units, or 404 */
async function findOwnPayment(tenant: Tenant, userId: string, paymentId: string) {
  const unitIds = await residentUnitIds(tenant, userId)
  const payment = await Payment.query()
    .where('tenant_id', tenant.id)
    .where('id', paymentId)
    .whereIn('unit_id', unitIds)
    .first()
  if (!payment) throw ResourceException.notFound('El pago no existe')
  return payment
}

/** Receipts can be added or removed only to a payment they reported that is still in review */
function assertCanAttach(payment: Payment, userId: string) {
  if (payment.status !== 'pending_review' || payment.registeredById !== userId) {
    throw new FieldException(
      'file',
      'Solo puedes cambiar los comprobantes de un pago que reportaste y sigue por revisar'
    )
  }
}

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
    const userId = auth.getUserOrFail().id
    const unitIds = await residentUnitIds(tenant, userId)
    if (unitIds.length === 0) return { data: [] }
    const payments = await Payment.query()
      .where('tenant_id', tenant.id)
      .whereIn('unit_id', unitIds)
      .preload('unit', (units) => units.preload('building'))
      .orderBy('paid_at', 'desc')
      .orderBy('created_at', 'desc')
      .limit(100)
    const attachments = await new AttachmentsService(tenant).list(
      'payment',
      payments.map((payment) => payment.id)
    )
    return {
      data: payments.map((payment) =>
        presentPayment(
          payment,
          userId,
          attachments.filter((attachment) => attachment.ownerId === payment.id)
        )
      ),
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
    return { data: presentPayment(payment, user.id, []) }
  }

  /** POST /resident/payments/:id/attachments — the receipt of a reported payment */
  async attach({ tenant, auth, params, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const payment = await findOwnPayment(tenant, user.id, params.id)
    assertCanAttach(payment, user.id)
    const { file } = await request.validateUsing(uploadAttachmentValidator)
    const attachment = await new AttachmentsService(tenant).upload(
      'payment',
      payment.id,
      file,
      user.id,
      { max: RESIDENT_ATTACHMENT_MAX }
    )
    response.status(201)
    return { data: serializeAttachment(attachment) }
  }

  /** GET /resident/attachments/:id/url — signed link to a receipt of their payments */
  async attachmentUrl({ tenant, auth, params, request }: HttpContext) {
    const { download } = await request.validateUsing(attachmentUrlValidator, {
      data: request.qs(),
    })
    const service = new AttachmentsService(tenant)
    const attachment = await service.find(params.id)
    if (attachment.ownerType !== 'payment') throw ResourceException.notFound('El archivo no existe')
    await findOwnPayment(tenant, auth.getUserOrFail().id, attachment.ownerId)
    return { data: { url: await service.url(attachment, download ?? false) } }
  }

  /** DELETE /resident/attachments/:id — only their own receipts of a payment in review */
  async detach({ tenant, auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const service = new AttachmentsService(tenant)
    const attachment = await service.find(params.id)
    if (attachment.ownerType !== 'payment' || attachment.uploadedById !== user.id)
      throw ResourceException.notFound('El archivo no existe')
    const payment = await findOwnPayment(tenant, user.id, attachment.ownerId)
    assertCanAttach(payment, user.id)
    await service.remove(attachment, user.id)
    response.status(204)
  }
}
