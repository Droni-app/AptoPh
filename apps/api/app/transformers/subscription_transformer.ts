import type Subscription from '#models/subscription'
import { BaseTransformer } from '@adonisjs/core/transformers'

/**
 * Subscription of the active tenant. `billableUnits` must be attached to
 * `subscription.$extras.billableUnits` by the controller.
 */
export default class SubscriptionTransformer extends BaseTransformer<Subscription> {
  toObject() {
    const subscription = this.resource
    const canWrite = subscription.canWrite()
    return {
      plan: subscription.plan,
      billingCycle: subscription.billingCycle,
      status: subscription.status,
      canWrite,
      locked: !canWrite,
      trialEndsAt: subscription.trialEndsAt?.toISO() ?? null,
      trialDaysLeft: subscription.trialDaysLeft(),
      currentPeriodEndsAt: subscription.currentPeriodEndsAt?.toISO() ?? null,
      activationRequestedAt: subscription.activationRequestedAt?.toISO() ?? null,
      billableUnits: Number(subscription.$extras.billableUnits ?? subscription.declaredUnits),
    }
  }
}
