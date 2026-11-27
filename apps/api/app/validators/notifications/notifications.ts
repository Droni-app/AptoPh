import vine from '@vinejs/vine'
import { NOTIFICATION_APPS, NOTIFICATION_CATEGORIES, PUSH_PLATFORMS } from '@aptoph/shared'

/** docs/notifications.md */

export const listNotificationsValidator = vine.create({
  app: vine.enum(NOTIFICATION_APPS),
  limit: vine.number().min(1).max(50).optional(),
})

export const readAllValidator = vine.create({
  app: vine.enum(NOTIFICATION_APPS),
})

const channels = () => vine.object({ email: vine.boolean(), push: vine.boolean() })

export const preferencesValidator = vine.create({
  preferences: vine.object(
    Object.fromEntries(NOTIFICATION_CATEGORIES.map((category) => [category, channels()])) as Record<
      (typeof NOTIFICATION_CATEGORIES)[number],
      ReturnType<typeof channels>
    >
  ),
})

export const pushDeviceValidator = vine.create({
  token: vine.string().trim().minLength(20).maxLength(500),
  platform: vine.enum(PUSH_PLATFORMS),
  deviceName: vine.string().trim().maxLength(120).nullable().optional(),
  appVersion: vine.string().trim().maxLength(30).nullable().optional(),
})
