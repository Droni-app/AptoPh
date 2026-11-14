import { AnnouncementSchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import type { ANNOUNCEMENT_AUDIENCES, ValueOf } from '@apartadock/shared'
import User from '#models/user'
import AnnouncementRead from '#models/announcement_read'

export default class Announcement extends AnnouncementSchema {
  declare audience: ValueOf<typeof ANNOUNCEMENT_AUDIENCES>

  @belongsTo(() => User, { foreignKey: 'createdById' })
  declare createdBy: BelongsTo<typeof User>

  @hasMany(() => AnnouncementRead)
  declare reads: HasMany<typeof AnnouncementRead>
}
