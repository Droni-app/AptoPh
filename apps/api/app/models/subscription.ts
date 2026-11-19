import { SubscriptionSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import {
  PAST_DUE_GRACE_DAYS,
  type BillingCycle,
  type PlanId,
  type SubscriptionStatus,
} from '@aptoph/shared'
import { DateTime } from 'luxon'
import Tenant from '#models/tenant'

/**
 * Plan of a tenant. During the trial and while the paid period is current the
 * back-office can write; afterwards it stays read-only (data is never held hostage)
 * until the plan is activated.
 */
export default class Subscription extends SubscriptionSchema {
  declare plan: PlanId
  declare billingCycle: BillingCycle
  declare status: SubscriptionStatus

  @belongsTo(() => Tenant)
  declare tenant: BelongsTo<typeof Tenant>

  get isTrialing() {
    return this.status === 'trialing'
  }

  /** Whole days left in the trial, rounded up (0 once it ended) */
  trialDaysLeft(now = DateTime.now()) {
    if (!this.isTrialing || !this.trialEndsAt) return null
    return Math.max(0, Math.ceil(this.trialEndsAt.diff(now, 'days').days))
  }

  /**
   * Period over and not paid (renewal declined, or manual payment pending):
   * editing is still allowed until this date
   */
  get graceEndsAt() {
    const end = this.currentPeriodEndsAt
    if (!end) return null
    const overdue =
      this.status === 'past_due' || (this.status === 'active' && end <= DateTime.now())
    return overdue ? end.plus({ days: PAST_DUE_GRACE_DAYS }) : null
  }

  canWrite(now = DateTime.now()) {
    if (this.status === 'trialing') return !!this.trialEndsAt && this.trialEndsAt > now
    if (this.status === 'active') {
      const end = this.currentPeriodEndsAt
      return !end || end.plus({ days: PAST_DUE_GRACE_DAYS }) > now
    }
    if (this.status === 'past_due') return !!this.graceEndsAt && this.graceEndsAt > now
    return false
  }
}
