import { AnnouncementSchema } from '#database/schema'
import { belongsTo, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import type { AnnouncementAudience, AnnouncementStatus } from '@aptoph/shared'
import { DateTime } from 'luxon'
import User from '#models/user'
import Building from '#models/building'
import AnnouncementRead from '#models/announcement_read'

/** Comunicado. docs/announcements.md */
export default class Announcement extends AnnouncementSchema {
  declare audience: AnnouncementAudience

  @belongsTo(() => User, { foreignKey: 'createdById' })
  declare createdBy: BelongsTo<typeof User>

  @hasMany(() => AnnouncementRead)
  declare reads: HasMany<typeof AnnouncementRead>

  /** Towers it goes to; none = every tower */
  @manyToMany(() => Building, { pivotTable: 'announcement_buildings' })
  declare buildings: ManyToMany<typeof Building>

  get status(): AnnouncementStatus {
    if (!this.publishedAt) return 'draft'
    return this.publishedAt > DateTime.now() ? 'scheduled' : 'published'
  }
}
