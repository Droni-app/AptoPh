import type { HttpContext } from '@adonisjs/core/http'
import { billableUnits } from '#services/billing'
import SubscriptionTransformer from '#transformers/subscription_transformer'

export default class SubscriptionController {
  /**
   * GET /api/v1/subscription — 404 for managed tenants without a subscription.
   * Paying and renewing it: BillingController (docs/billing.md).
   */
  async show({ tenant, serialize }: HttpContext) {
    const subscription = await tenant.related('subscription').query().firstOrFail()
    subscription.$extras.billableUnits = await billableUnits(tenant, subscription)
    return serialize(SubscriptionTransformer.transform(subscription))
  }
}
