import { AnnouncementReadSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Announcement from '#models/announcement'
import User from '#models/user'

export default class AnnouncementRead extends AnnouncementReadSchema {
  @belongsTo(() => Announcement)
  declare announcement: BelongsTo<typeof Announcement>

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
