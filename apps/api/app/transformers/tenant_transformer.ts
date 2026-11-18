import type Tenant from '#models/tenant'
import type { EnrollmentRole } from '@aptoph/shared'
import { BaseTransformer } from '@adonisjs/core/transformers'

/**
 * Serializes a tenant. When the user's roles in it were attached to
 * `tenant.$extras.roles`, they are included as `roles`.
 */
export default class TenantTransformer extends BaseTransformer<Tenant> {
  toObject() {
    const roles = this.resource.$extras.roles as EnrollmentRole[] | undefined
    return {
      ...this.pick(this.resource, [
        'id',
        'name',
        'slug',
        'propertyType',
        'city',
        'countryCode',
        'timezone',
        'currency',
        'status',
      ]),
      ...(roles ? { roles } : {}),
    }
  }
}
