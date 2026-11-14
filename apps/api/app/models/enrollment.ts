import { EnrollmentSchema } from '#database/schema'
import { belongsTo, scope } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { EnrollmentRole } from '@apartadock/shared'
import Tenant from '#models/tenant'
import User from '#models/user'

export default class Enrollment extends EnrollmentSchema {
  declare role: EnrollmentRole
  declare status: 'invited' | 'active' | 'suspended' | 'revoked'

  @belongsTo(() => Tenant)
  declare tenant: BelongsTo<typeof Tenant>

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  static active = scope((query) => {
    query.where('status', 'active')
  })
}
