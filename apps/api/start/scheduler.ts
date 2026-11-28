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
import { pruneNotifications } from '#services/notifications/notifications'
import { remindDueCharges } from '#services/notifications/finance_notifications'
import { remindUpcomingBookings } from '#services/amenities/bookings'
import { remindExpiringDocuments } from '#services/documents/documents'
import { remindClosingSurveys } from '#services/surveys/surveys'

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

// Hourly: due reminders (once per unit and due date), bookings of tomorrow, expiring documents,
// surveys closing within a day and old notifications
const notifications = setInterval(() => {
  remindDueCharges()
    .then(() => remindUpcomingBookings())
    .then(() => remindExpiringDocuments())
    .then(() => remindClosingSurveys())
    .then(() => pruneNotifications())
    .catch(() => {})
}, 60 * EVERY_MINUTE)
notifications.unref()

app.terminating(() => {
  clearInterval(notifications)
  clearInterval(announcements)
  clearInterval(billing)
})
