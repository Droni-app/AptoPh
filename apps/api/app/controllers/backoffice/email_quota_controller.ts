import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import mail from '@adonisjs/mail/services/main'
import env from '#start/env'
import EmailPacksRequestMail from '#mails/email_packs_request_mail'
import { EmailQuotaService } from '#services/email_quota'
import { emailPacksRequestValidator } from '#validators/email_quota'

/**
 * Monthly bulk email quota of the conjunto. docs/email-quota.md
 */
export default class EmailQuotaController {
  /** GET /api/v1/email-quota — this month */
  async show({ tenant }: HttpContext) {
    return { data: await new EmailQuotaService(tenant).of() }
  }

  /**
   * POST /api/v1/email-quota/packs — asks for additional packs for this month.
   * Sales confirm the payment and activate them (`node ace email:add-packs`).
   */
  async request({ tenant, auth, request }: HttpContext) {
    const { packs } = await request.validateUsing(emailPacksRequestValidator)
    const user = auth.getUserOrFail()
    const quota = await new EmailQuotaService(tenant).request(packs, user.id)

    const salesEmail = env.get('SALES_EMAIL')
    if (salesEmail) {
      mail
        .sendLater(new EmailPacksRequestMail(salesEmail, tenant, packs, quota, user))
        .catch((error) => logger.error({ err: error }, 'Could not queue the email packs request'))
    } else {
      logger.warn(
        { tenantId: tenant.id, packs },
        'email packs requested but SALES_EMAIL is not set'
      )
    }
    return { data: quota }
  }
}
