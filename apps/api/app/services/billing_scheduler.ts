import logger from '@adonisjs/core/services/logger'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import {
  MANUAL_REMINDER_DAYS,
  RENEWAL_CHARGE_HOURS_BEFORE,
  RENEWAL_NOTICE_DAYS,
  PLANS,
  findPlan,
} from '@aptoph/shared'
import wompiConfig from '#config/wompi'
import BillingCharge from '#models/billing_charge'
import Subscription from '#models/subscription'
import Tenant from '#models/tenant'
import { BillingService, billableUnits, refreshCharge } from '#services/billing'
import {
  notifyPaymentDue,
  notifyPaymentOverdue,
  notifyUpcomingRenewal,
} from '#services/billing_notifications'

/**
 * Periodic billing work (docs/billing.md), safe with several instances: every
 * step claims its rows atomically in the database.
 *  1. Pending charges: asked to Wompi (in case an event did not arrive)
 *  2. Upcoming renewals: notice with the amount, once per period
 *  3. Due renewals (first attempt or retry): charged to the saved method
 *  4. Manual payment (no automatic renewal): reminders 7 and 3 days before the
 *     end, and "payment pending" with the grace days once it ends unpaid
 */
export async function runBillingTick() {
  if (!wompiConfig.configured) return
  await step('refresh pending charges', refreshPendingCharges)
  await step('renewal notices', sendRenewalNotices)
  await step('due renewals', chargeDueRenewals)
  await step('manual payment reminders', sendManualReminders)
  await step('overdue manual payments', markOverdueManualPayments)
}

/** Plans paid in AptoPH (the others are agreed with sales) */
const SELF_SERVE_PLAN_IDS = PLANS.filter((plan) => plan.selfServe).map((plan) => plan.id)

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

/**
 * Manual payment reminders, once per period each: the first one (7 days) is
 * claimed with `payment_reminder_for`, the last one (3 days) with
 * `renewal_notice_for`. A plan that enters manual mode late only gets the
 * ones still ahead.
 */
async function sendManualReminders() {
  const now = DateTime.now()
  const [early, last] = MANUAL_REMINDER_DAYS
  const claims = [
    {
      column: 'payment_reminder_for',
      from: now.plus({ days: last }),
      to: now.plus({ days: early }),
    },
    { column: 'renewal_notice_for', from: now, to: now.plus({ days: last }) },
  ]
  for (const claim of claims) {
    const claimed = await db.rawQuery(
      `UPDATE subscriptions SET ${claim.column} = current_period_ends_at, updated_at = now()
       WHERE NOT auto_renew AND status = 'active' AND plan = ANY(?)
         AND current_period_ends_at > ? AND current_period_ends_at <= ?
         AND ${claim.column} IS DISTINCT FROM current_period_ends_at
       RETURNING id`,
      [[...SELF_SERVE_PLAN_IDS], claim.from.toJSDate(), claim.to.toJSDate()]
    )
    for (const row of claimed.rows as Array<{ id: string }>) {
      const subscription = await Subscription.findOrFail(row.id)
      if (!findPlan(subscription.plan).selfServe) continue
      const tenant = await Tenant.findOrFail(subscription.tenantId)
      await notifyPaymentDue({
        tenantId: tenant.id,
        periodEndsAt: subscription.currentPeriodEndsAt!,
        units: await billableUnits(tenant, subscription),
        cycle: subscription.billingCycle,
      })
    }
  }
}

/** Manual plans whose period ended unpaid: "payment pending", with grace days */
async function markOverdueManualPayments() {
  const claimed = await db.rawQuery(
    `UPDATE subscriptions SET status = 'past_due', updated_at = now()
     WHERE NOT auto_renew AND status = 'active' AND plan = ANY(?)
       AND current_period_ends_at <= clock_timestamp()
     RETURNING id`,
    [[...SELF_SERVE_PLAN_IDS]]
  )
  for (const row of claimed.rows as Array<{ id: string }>) {
    const subscription = await Subscription.findOrFail(row.id)
    if (!findPlan(subscription.plan).selfServe || !subscription.graceEndsAt) continue
    const tenant = await Tenant.findOrFail(subscription.tenantId)
    await notifyPaymentOverdue({
      tenantId: tenant.id,
      graceEndsAt: subscription.graceEndsAt,
      units: await billableUnits(tenant, subscription),
    })
  }
}
