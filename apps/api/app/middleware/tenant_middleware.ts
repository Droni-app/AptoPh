import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { EnrollmentRole } from '@aptoph/shared'
import { DateTime } from 'luxon'
import Enrollment from '#models/enrollment'
import type Tenant from '#models/tenant'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Resolves the active tenant from the `X-Tenant-Id` header and verifies the
 * authenticated user has an active enrollment in it. Must run after `auth`.
 *
 * Usage: .use([middleware.auth(), middleware.tenant({ roles: ['administrator'] })])
 */
export default class TenantMiddleware {
  async handle(ctx: HttpContext, next: NextFn, options: { roles?: EnrollmentRole[] } = {}) {
    const tenantId = ctx.request.header('x-tenant-id')
    if (!tenantId || !UUID_REGEX.test(tenantId)) {
      return ctx.response.badRequest({
        errors: [{ message: 'Missing or invalid X-Tenant-Id header' }],
      })
    }

    const user = ctx.auth.getUserOrFail()
    const today = DateTime.now().toISODate()

    const enrollments = await Enrollment.query()
      .apply((scopes) => scopes.active())
      .where('tenant_id', tenantId)
      .where('user_id', user.id)
      .where((query) => query.whereNull('starts_on').orWhere('starts_on', '<=', today))
      .where((query) => query.whereNull('ends_on').orWhere('ends_on', '>=', today))
      .preload('tenant')

    const tenant = enrollments[0]?.tenant
    if (!tenant || !tenant.isOperational) {
      return ctx.response.forbidden({
        errors: [{ message: 'You do not have access to this tenant' }],
      })
    }

    const roles = enrollments.map((enrollment) => enrollment.role)
    if (options.roles && !roles.some((role) => options.roles!.includes(role))) {
      return ctx.response.forbidden({ errors: [{ message: 'Insufficient role for this action' }] })
    }

    ctx.tenant = tenant
    ctx.tenantRoles = roles
    return next()
  }
}

declare module '@adonisjs/core/http' {
  export interface HttpContext {
    tenant: Tenant
    tenantRoles: EnrollmentRole[]
  }
}
