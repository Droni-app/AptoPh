import logger from '@adonisjs/core/services/logger'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { RENEWAL_CHARGE_HOURS_BEFORE, RENEWAL_NOTICE_DAYS, findPlan } from '@aptoph/shared'
import wompiConfig from '#config/wompi'
import BillingCharge from '#models/billing_charge'
import Subscription from '#models/subscription'
import Tenant from '#models/tenant'
import { BillingService, billableUnits, refreshCharge } from '#services/billing'
import { notifyUpcomingRenewal } from '#services/billing_notifications'

/**
 * Periodic billing work (docs/billing.md), safe with several instances: every
 * step claims its rows atomically in the database.
 *  1. Pending charges: asked to Wompi (in case an event did not arrive)
 *  2. Upcoming renewals: notice with the amount, once per period
 *  3. Due renewals (first attempt or retry): charged to the saved method
 */
export async function runBillingTick() {
  if (!wompiConfig.configured) return
  await step('refresh pending charges', refreshPendingCharges)
  await step('renewal notices', sendRenewalNotices)
  await step('due renewals', chargeDueRenewals)
}

async function step(name: string, work: () => Promise<void>) {
  try {
    await work()
  } catch (err) {
    logger.error({ err }, `billing: ${name} failed`)
  }
}

async function refreshPendingCharges() {
  const charges = await BillingCharge.query()
    .where('status', 'pending')
    .where('environment', wompiConfig.environment)
    .where('created_at', '<', DateTime.now().minus({ seconds: 30 }).toJSDate())
    .orderBy('created_at')
    .limit(50)
  for (const charge of charges) {
    try {
      await refreshCharge(charge)
    } catch (err) {
      logger.error({ err, chargeId: charge.id }, 'billing: could not refresh a charge')
    }
  }
}

async function sendRenewalNotices() {
  const now = DateTime.now()
  const claimed = await db.rawQuery(
    `UPDATE subscriptions SET renewal_notice_for = current_period_ends_at, updated_at = now()
     WHERE auto_renew AND status = 'active'
       AND current_period_ends_at > ? AND current_period_ends_at <= ?
       AND renewal_notice_for IS DISTINCT FROM current_period_ends_at
     RETURNING id`,
    [now.toJSDate(), now.plus({ days: RENEWAL_NOTICE_DAYS }).toJSDate()]
  )
  for (const row of claimed.rows as Array<{ id: string }>) {
    const subscription = await Subscription.findOrFail(row.id)
    if (!findPlan(subscription.plan).selfServe) continue
    const tenant = await Tenant.findOrFail(subscription.tenantId)
    const service = new BillingService(tenant)
    const units = await billableUnits(tenant, subscription)
    const amount = await service.nextRenewalAmount(subscription)
    const method = await service.activeMethod()
    const end = subscription.currentPeriodEndsAt!
    await notifyUpcomingRenewal({
      tenantId: tenant.id,
      amount: amount ?? 0,
      units,
      chargeAt: DateTime.max(now, end.minus({ hours: RENEWAL_CHARGE_HOURS_BEFORE })),
      periodEndsAt: end,
      paymentMethod: method?.label ?? null,
    })
  }
}

async function chargeDueRenewals() {
  // Claim: the next attempt is cleared now and set again by the charge's result
  const claimed = await db.rawQuery(
    `UPDATE subscriptions SET next_renewal_at = NULL, updated_at = now()
     WHERE next_renewal_at <= clock_timestamp() AND auto_renew AND status IN ('active', 'past_due')
     RETURNING id`
  )
  for (const row of claimed.rows as Array<{ id: string }>) {
    const subscription = await Subscription.findOrFail(row.id)
    try {
      const tenant = await Tenant.findOrFail(subscription.tenantId)
      const charge = await new BillingService(tenant).renew(subscription)
      if (!charge) {
        // A charge of the plan is already in process: check again later
        await Subscription.query()
          .where('id', subscription.id)
          .whereNull('next_renewal_at')
          .where('auto_renew', true)
          .update({ nextRenewalAt: DateTime.now().plus({ hours: 1 }).toJSDate() })
      }
    } catch (err) {
      logger.error({ err, subscriptionId: subscription.id }, 'billing: renewal failed')
      await Subscription.query()
        .where('id', subscription.id)
        .whereNull('next_renewal_at')
        .where('auto_renew', true)
        .update({ nextRenewalAt: DateTime.now().plus({ hours: 1 }).toJSDate() })
    }
  }
}
