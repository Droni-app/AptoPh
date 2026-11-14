import type Enrollment from '#models/enrollment'
import { BaseTransformer } from '@adonisjs/core/transformers'

/**
 * A tenant member = enrollment + the user's public data
 */
export default class MemberTransformer extends BaseTransformer<Enrollment> {
  toObject() {
    const user = this.resource.user
    return {
      ...this.pick(this.resource, ['id', 'role', 'status', 'title', 'acceptedAt', 'createdAt']),
      startsOn: this.resource.startsOn?.toISODate() ?? null,
      endsOn: this.resource.endsOn?.toISODate() ?? null,
      user: user
        ? { id: user.id, fullName: user.fullName, email: user.email, phone: user.phone }
        : null,
    }
  }
}
