import type { HttpContext } from '@adonisjs/core/http'
import type { ChargeRequestResult } from '@aptoph/shared'
import { BillingService } from '#services/billing/billing'
import { EmailQuotaService } from '#services/announcements/email_quota'
import { serializeCharge } from '#transformers/billing/billing_transformer'
import { emailPacksValidator } from '#validators/billing/billing'

/**
 * Monthly bulk email quota of the conjunto. docs/email-quota.md
 */
export default class EmailQuotaController {
  /** GET /api/v1/email-quota — this month */
  async show({ tenant }: HttpContext) {
    return { data: await new EmailQuotaService(tenant).of() }
  }

  /**
   * POST /api/v1/email-quota/packs — buys additional packs for this month:
   * charged to the saved payment method, or paid in Wompi's checkout.
   * They are added when Wompi approves the payment. docs/billing.md
   */
  async buy({
    tenant,
    auth,
    request,
    response,
  }: HttpContext): Promise<{ data: ChargeRequestResult }> {
    const { packs } = await request.validateUsing(emailPacksValidator)
    const result = await new BillingService(tenant).buyEmailPacks(packs, auth.getUserOrFail())
    response.status(201)
    return { data: { charge: serializeCharge(result.charge), checkoutUrl: result.checkoutUrl } }
  }
}
