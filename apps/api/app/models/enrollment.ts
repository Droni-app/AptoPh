import { EnrollmentSchema } from '#database/schema'
import { belongsTo, scope } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { EnrollmentRole } from '@aptoph/shared'
import Tenant from '#models/tenant'
import User from '#models/user'

export default class Enrollment extends EnrollmentSchema {
  declare role: EnrollmentRole
  declare status: 'invited' | 'active' | 'suspended' | 'revoked'

  @belongsTo(() => Tenant)
  declare tenant: BelongsTo<typeof Tenant>

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'invitedById' })
  declare invitedBy: BelongsTo<typeof User>

  /** Pending invitation whose link no longer works (it can be resent) */
  get isInvitationExpired() {
    return (
      this.status === 'invited' &&
      (!this.invitationExpiresAt || this.invitationExpiresAt < DateTime.now())
    )
  }

  static active = scope((query) => {
    query.where('status', 'active')
  })
}
