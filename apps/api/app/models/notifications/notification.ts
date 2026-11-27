import { NotificationSchema } from '#database/schema'
import type { NotificationApp, NotificationCategory } from '@aptoph/shared'

/** One entry of a person's bell in a conjunto. docs/notifications.md */
export default class Notification extends NotificationSchema {
  declare app: NotificationApp
  declare category: NotificationCategory
}
