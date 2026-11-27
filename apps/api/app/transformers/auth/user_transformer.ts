import type User from '#models/auth/user'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class UserTransformer extends BaseTransformer<User> {
  toObject() {
    return this.pick(this.resource, [
      'id',
      'fullName',
      'phone',
      'documentType',
      'documentNumber',
      'isPlatformAdmin',
      'email',
      'emailVerifiedAt',
      'createdAt',
      'updatedAt',
      'initials',
    ])
  }
}
