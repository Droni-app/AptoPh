import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import {
  notificationPreferences,
  type EnrollmentRole,
  type NotificationApp,
  type NotificationCategory,
} from '@aptoph/shared'
import type Tenant from '#models/tenants/tenant'
import NotificationMail from '#mails/notifications/notification_mail'
import { appUrl } from '#services/app_urls'
import { queueMail } from '#services/mailer'
import { sendPush } from '#services/notifications/push'
import { tenantToday } from '#services/resident_scope'

/** Email of an event: its text, or nothing (bell and push only) */
export type NotificationEmail = {
  paragraphs?: string[]
  rows?: Array<{ label: string; value: string }>
  /** Button label */
  action?: string
}

export type NotifyInput = {
  app: NotificationApp
  category: NotificationCategory
  /** Event, e.g. `ticket.reply` */
  type: string
  title: string
  body?: string | null
  /** Path inside the app; the bell, the email button and the push open it */
  path?: string | null
  /** The same key never notifies the same person twice */
  dedupeKey?: string | null
  /** Omitted: this event has no email */
  email?: NotificationEmail
  /** false: no push for this event */
  push?: boolean
}

type Recipient = {
  id: string
  email: string | null
  full_name: string
  notification_preferences: unknown
}

/**
 * Notifications of a conjunto (docs/notifications.md): every event goes to
 * the bell of each person and, by their preferences of its category, by
 * email and push. Never fails the action that triggered it.
 */
export class NotificationService {
  constructor(private tenant: Tenant) {}

  async notify(userIds: Array<string | null | undefined>, input: NotifyInput) {
    const ids = [...new Set(userIds.filter((id): id is string => !!id))]
    if (!ids.length) return 0
    try {
      return await this.deliver(ids, input)
    } catch (err) {
      logger.error({ err, type: input.type }, 'could not notify')
      return 0
    }
  }

  private async deliver(ids: string[], input: NotifyInput) {
    const now = new Date()
    const rows = ids.map((userId) => ({
      tenant_id: this.tenant.id,
      user_id: userId,
      app: input.app,
      category: input.category,
      type: input.type,
      title: input.title.slice(0, 200),
      body: input.body ?? null,
      path: input.path ?? null,
      dedupe_key: input.dedupeKey ?? null,
      created_at: now,
      updated_at: now,
    }))
    // The dedupe index is partial: knex cannot infer it, so the clause goes by hand
    const insert = db.knexQuery().table('notifications').insert(rows).toSQL()
    const result = await db.rawQuery(
      `${insert.sql} ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING RETURNING user_id`,
      insert.bindings as unknown[]
    )
    const inserted = result.rows as Array<{ user_id: string }>
    const notified = inserted.map((row) => row.user_id)
    if (!notified.length) return 0

    const recipients = (await db
      .from('users')
      .whereIn('id', notified)
      .whereNull('deleted_at')
      .where('status', 'active')
      .select('id', 'email', 'full_name', 'notification_preferences')) as Recipient[]
    const url = new URL(input.path ?? '/', appUrl(input.app)).toString()
    const preferencesUrl = new URL('/perfil#notificaciones', appUrl(input.app)).toString()
    const pushTo: string[] = []
    for (const recipient of recipients) {
      const channels = notificationPreferences(recipient.notification_preferences)[input.category]
      if (input.email && channels.email && recipient.email) {
        queueMail(
          new NotificationMail(
            { email: recipient.email, fullName: recipient.full_name },
            this.tenant.name,
            {
              subject: `${this.tenant.name}: ${input.title}`,
              title: input.title,
              paragraphs: input.email.paragraphs ?? (input.body ? [input.body] : []),
              rows: input.email.rows ?? [],
              action: input.email.action ?? 'Ver en AptoPH',
              url,
              preferencesUrl,
            }
          ),
          `${input.type} notification`
        )
      }
      if (input.push !== false && channels.push) pushTo.push(recipient.id)
    }
    if (pushTo.length) {
      // Best effort and off the request: it never throws
      void sendPush(pushTo, {
        title: input.title,
        body: input.body ?? null,
        data: {
          tenantId: this.tenant.id,
          app: input.app,
          category: input.category,
          type: input.type,
          path: input.path ?? '/',
        },
      })
    }
    return notified.length
  }

  // Recipients

  /** People with an account who live in the units (active occupancy) */
  async residentsOf(unitIds: string[]) {
    if (!unitIds.length) return []
    const today = tenantToday(this.tenant)
    const rows = await db
      .from('unit_occupants')
      .where('tenant_id', this.tenant.id)
      .whereIn('unit_id', unitIds)
      .whereNotNull('user_id')
      .where((q) => q.whereNull('starts_on').orWhere('starts_on', '<=', today))
      .where((q) => q.whereNull('ends_on').orWhere('ends_on', '>=', today))
      .distinct('user_id')
    return rows.map((row) => row.user_id as string)
  }

  /** Staff of the conjunto with any of the roles (active) */
  async staffWith(roles: readonly EnrollmentRole[]) {
    const rows = await db
      .from('enrollments')
      .where('tenant_id', this.tenant.id)
      .where('status', 'active')
      .whereIn('role', [...roles])
      .distinct('user_id')
    return rows.map((row) => row.user_id as string)
  }
}

/**
 * Keeps the bells light: read notifications go after 90 days, unread ones
 * after a year. Runs from the scheduler.
 */
export async function pruneNotifications() {
  await db
    .from('notifications')
    .where((q) =>
      q
        .where((r) =>
          r
            .whereNotNull('read_at')
            .where('created_at', '<', DateTime.now().minus({ days: 90 }).toJSDate())
        )
        .orWhere('created_at', '<', DateTime.now().minus({ days: 365 }).toJSDate())
    )
    .delete()
}
