import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import type { AppNotification } from '@aptoph/shared'
import Notification from '#models/notifications/notification'
import ResourceException from '#exceptions/resource_exception'
import {
  listNotificationsValidator,
  readAllValidator,
} from '#validators/notifications/notifications'

const present = (notification: Notification): AppNotification => ({
  id: notification.id,
  category: notification.category,
  type: notification.type,
  title: notification.title,
  body: notification.body,
  path: notification.path,
  readAt: notification.readAt?.toISO() ?? null,
  createdAt: notification.createdAt.toISO()!,
})

/**
 * The bell of the signed-in person in the conjunto (X-Tenant-Id), of the
 * portal or the back-office. docs/notifications.md
 *
 *   GET  /notifications?app=web          GET /notifications/unread?app=web
 *   POST /notifications/:id/read         POST /notifications/read-all
 */
export default class NotificationsController {
  private query({ tenant, auth }: HttpContext, app: string) {
    return Notification.query()
      .where('tenant_id', tenant.id)
      .where('user_id', auth.getUserOrFail().id)
      .where('app', app)
  }

  private async unread(ctx: HttpContext, app: string) {
    const row = await this.query(ctx, app).whereNull('read_at').count('* as total').first()
    return Number(row?.$extras.total ?? 0)
  }

  async index(ctx: HttpContext) {
    const { app, limit } = await ctx.request.validateUsing(listNotificationsValidator, {
      data: ctx.request.qs(),
    })
    const notifications = await this.query(ctx, app)
      .orderBy('created_at', 'desc')
      .limit(limit ?? 20)
    return { data: notifications.map(present), unread: await this.unread(ctx, app) }
  }

  /** Cheap: what the bell asks every minute */
  async unreadCount(ctx: HttpContext) {
    const { app } = await ctx.request.validateUsing(readAllValidator, { data: ctx.request.qs() })
    return { unread: await this.unread(ctx, app) }
  }

  async read(ctx: HttpContext) {
    const notification = await Notification.query()
      .where('tenant_id', ctx.tenant.id)
      .where('user_id', ctx.auth.getUserOrFail().id)
      .where('id', ctx.params.id)
      .first()
    if (!notification) throw ResourceException.notFound('La notificación no existe')
    if (!notification.readAt) {
      notification.readAt = DateTime.now()
      await notification.save()
    }
    return { data: present(notification), unread: await this.unread(ctx, notification.app) }
  }

  async readAll(ctx: HttpContext) {
    const { app } = await ctx.request.validateUsing(readAllValidator)
    await this.query(ctx, app).whereNull('read_at').update({ readAt: DateTime.now() })
    return { unread: 0 }
  }
}
