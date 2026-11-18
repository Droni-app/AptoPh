import type { HttpContext } from '@adonisjs/core/http'
import mail from '@adonisjs/mail/services/main'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'
import env from '#start/env'
import ActivationRequestMail from '#mails/activation_request_mail'
import type Subscription from '#models/subscription'
import type Tenant from '#models/tenant'
import SubscriptionTransformer from '#transformers/subscription_transformer'
import { activationRequestValidator } from '#validators/subscription'

export default class SubscriptionController {
  /**
   * GET /api/v1/subscription — 404 for managed tenants without a subscription
   */
  async show({ tenant, serialize }: HttpContext) {
    const subscription = await tenant.related('subscription').query().firstOrFail()
    return serialize(
      SubscriptionTransformer.transform(await withBillableUnits(tenant, subscription))
    )
  }

  /**
   * POST /api/v1/subscription/activation — records the chosen plan and cycle and
   * notifies sales, who confirm the payment and activate it. Allowed while locked.
   */
  async requestActivation({ tenant, auth, request, serialize }: HttpContext) {
    const subscription = await tenant.related('subscription').query().firstOrFail()
    const data = await request.validateUsing(activationRequestValidator)

    subscription.merge({ ...data, activationRequestedAt: DateTime.now() })
    await subscription.save()
    await withBillableUnits(tenant, subscription)

    const salesEmail = env.get('SALES_EMAIL')
    if (salesEmail) {
      mail
        .sendLater(
          new ActivationRequestMail(
            salesEmail,
            tenant,
            subscription,
            auth.getUserOrFail(),
            subscription.$extras.billableUnits
          )
        )
        .catch((error) => logger.error({ err: error }, 'Could not queue the activation request'))
    }

    return serialize(SubscriptionTransformer.transform(subscription))
  }
}

/**
 * Units used to quote: the registered ones or, before loading the census, the declared ones
 */
async function withBillableUnits(tenant: Tenant, subscription: Subscription) {
  const [row] = await tenant.related('units').query().whereNull('deleted_at').count('* as total')
  const registered = Number(row.$extras.total)
  subscription.$extras.billableUnits = registered > 0 ? registered : subscription.declaredUnits
  return subscription
}
