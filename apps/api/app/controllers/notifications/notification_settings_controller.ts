import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import { notificationPreferences } from '@aptoph/shared'
import PushDevice from '#models/notifications/push_device'
import { pushEnabled } from '#services/notifications/push'
import { preferencesValidator, pushDeviceValidator } from '#validators/notifications/notifications'

/**
 * Account-wide (every conjunto): channels by category and the phones of the
 * mobile app. docs/notifications.md
 *
 *   GET /account/notification-preferences   PUT /account/notification-preferences
 *   POST /account/push-devices              DELETE /account/push-devices/:token
 */
export default class NotificationSettingsController {
  async show({ auth }: HttpContext) {
    const user = auth.getUserOrFail()
    const devices = await PushDevice.query().where('user_id', user.id).count('* as total').first()
    return {
      data: notificationPreferences(user.notificationPreferences),
      devices: Number(devices?.$extras.total ?? 0),
      pushAvailable: pushEnabled(),
    }
  }

  async update({ auth, request }: HttpContext) {
    const { preferences } = await request.validateUsing(preferencesValidator)
    const user = auth.getUserOrFail()
    user.notificationPreferences = notificationPreferences(preferences)
    await user.save()
    return { data: notificationPreferences(user.notificationPreferences) }
  }

  /** The app registers its token on sign-in and when FCM rotates it */
  async registerDevice({ auth, request, response }: HttpContext) {
    const input = await request.validateUsing(pushDeviceValidator)
    const user = auth.getUserOrFail()
    const now = DateTime.now()
    // A token belongs to one phone: if another account used it, it moves
    await PushDevice.updateOrCreate(
      { token: input.token },
      {
        userId: user.id,
        platform: input.platform,
        deviceName: input.deviceName ?? null,
        appVersion: input.appVersion ?? null,
        lastSeenAt: now,
      }
    )
    return response.noContent()
  }

  /** On sign-out from the app */
  async removeDevice({ auth, params, response }: HttpContext) {
    await PushDevice.query()
      .where('user_id', auth.getUserOrFail().id)
      .where('token', decodeURIComponent(params.token))
      .delete()
    return response.noContent()
  }
}
