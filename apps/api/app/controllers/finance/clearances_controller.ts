import type { HttpContext } from '@adonisjs/core/http'
import {
  ClearanceService,
  assertUnit,
  clearanceFileName,
  findPayment,
  receiptFileName,
  receiptPdf,
} from '#services/finance/finance_documents'
import { ensureFinanceSetup } from '#services/finance/setup'
import { serializeClearance } from '#transformers/finance/reconciliation'
import { verifyClearanceValidator } from '#validators/finance/reconciliation'
import { fromCents } from '@aptoph/shared'

/** Sends a PDF to download */
export function sendPdf(response: HttpContext['response'], bytes: Buffer, fileName: string) {
  response.header('Content-Type', 'application/pdf')
  response.header('Content-Disposition', `attachment; filename="${fileName}"`)
  response.header('Cache-Control', 'no-store')
  return response.send(bytes)
}

/** Whether the unit can get a paz y salvo now, and the ones it got */
export async function clearanceStatus(service: ClearanceService, unitId: string) {
  const [balances, certificates] = await Promise.all([
    service.balances(unitId),
    service.certificates(unitId),
  ])
  return {
    eligible: balances.overdue === 0,
    overdue: fromCents(balances.overdue),
    upcoming: fromCents(balances.upcoming),
    certificates: certificates.map(serializeClearance),
  }
}

/**
 * Recibo de caja and paz y salvo in PDF (back-office). docs/finance.md §5.
 */
export default class ClearancesController {
  /** GET /finance/payments/:id/receipt */
  async receipt({ tenant, params, response }: HttpContext) {
    const payment = await findPayment(tenant, params.id)
    return sendPdf(response, await receiptPdf(tenant, payment), receiptFileName(payment))
  }

  /** GET /finance/units/:unitId/clearance */
  async status({ tenant, params }: HttpContext) {
    await assertUnit(tenant, params.unitId)
    await ensureFinanceSetup(tenant)
    return { data: await clearanceStatus(new ClearanceService(tenant), params.unitId) }
  }

  /** POST /finance/units/:unitId/clearances */
  async store({ tenant, auth, params, response }: HttpContext) {
    await assertUnit(tenant, params.unitId)
    await ensureFinanceSetup(tenant)
    const certificate = await new ClearanceService(tenant).issue(
      params.unitId,
      auth.getUserOrFail().id
    )
    response.status(201)
    return { data: serializeClearance(certificate) }
  }

  /** GET /finance/clearances/:id/pdf */
  async pdf({ tenant, params, response }: HttpContext) {
    const service = new ClearanceService(tenant)
    const certificate = await service.find(params.id)
    return sendPdf(response, await service.pdf(certificate), clearanceFileName(certificate))
  }

  /** GET /public/clearances/:code — anyone with the code checks a certificate */
  async verify({ params, response }: HttpContext) {
    const { code } = await verifyClearanceValidator.validate({ code: params.code })
    const result = await ClearanceService.verify(code)
    if (!result) {
      return response.notFound({
        errors: [{ message: 'No encontramos un paz y salvo con ese código' }],
      })
    }
    return { data: result }
  }
}
