/*
|--------------------------------------------------------------------------
| In-process scheduler (web server only)
|--------------------------------------------------------------------------
|
| Every minute, sends the emails of the comunicados whose publication time
| came. Claiming is atomic in the database, so several instances never send
| the same email twice. docs/announcements.md
|
*/

import app from '@adonisjs/core/services/app'
import { dispatchDueAnnouncementEmails } from '#services/announcements'

const EVERY_MINUTE = 60_000

const timer = setInterval(() => {
  dispatchDueAnnouncementEmails().catch(() => {})
}, EVERY_MINUTE)
timer.unref()

app.terminating(() => clearInterval(timer))
