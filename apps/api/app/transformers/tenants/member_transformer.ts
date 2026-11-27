import type Enrollment from '#models/tenants/enrollment'
import { BaseTransformer } from '@adonisjs/core/transformers'

/**
 * A tenant member = enrollment + the user's public data
 */
export default class MemberTransformer extends BaseTransformer<Enrollment> {
  toObject() {
    const user = this.resource.user
    const invitedBy = this.resource.invitedBy
    return {
      ...this.pick(this.resource, [
        'id',
        'role',
        'status',
        'title',
        'acceptedAt',
        'invitationSentAt',
        'invitationExpiresAt',
        'createdAt',
      ]),
      invitationExpired: this.resource.isInvitationExpired,
      startsOn: this.resource.startsOn?.toISODate() ?? null,
      endsOn: this.resource.endsOn?.toISODate() ?? null,
      invitedBy: invitedBy ? { id: invitedBy.id, fullName: invitedBy.fullName } : null,
      user: user
        ? { id: user.id, fullName: user.fullName, email: user.email, phone: user.phone }
        : null,
    }
  }
}
