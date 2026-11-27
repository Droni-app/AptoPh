/*
|--------------------------------------------------------------------------
| In-process scheduler (web server only)
|--------------------------------------------------------------------------
|
| Every minute, sends the emails of the comunicados whose publication time
| came (docs/announcements.md). Every five minutes, the billing work: pending
| Wompi charges, renewal notices and due renewals (docs/billing.md).
| Claiming is atomic in the database, so several instances never do the same
| work twice.
|
*/

import app from '@adonisjs/core/services/app'
import { dispatchDueAnnouncementEmails } from '#services/announcements/announcements'
import { runBillingTick } from '#services/billing/billing_scheduler'

const EVERY_MINUTE = 60_000
const EVERY_FIVE_MINUTES = 5 * EVERY_MINUTE

const announcements = setInterval(() => {
  dispatchDueAnnouncementEmails().catch(() => {})
}, EVERY_MINUTE)
announcements.unref()

let billingRunning = false
const billing = setInterval(() => {
  if (billingRunning) return
  billingRunning = true
  runBillingTick()
    .catch(() => {})
    .finally(() => {
      billingRunning = false
    })
}, EVERY_FIVE_MINUTES)
billing.unref()

app.terminating(() => {
  clearInterval(announcements)
  clearInterval(billing)
})
