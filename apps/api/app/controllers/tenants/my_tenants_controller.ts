import type { HttpContext } from '@adonisjs/core/http'
import Enrollment from '#models/tenants/enrollment'
import type Tenant from '#models/tenants/tenant'
import TenantTransformer from '#transformers/tenants/tenant_transformer'

export default class MyTenantsController {
  /**
   * GET /api/v1/account/tenants
   * Tenants where the user has an active enrollment, with their roles.
   * The client uses this list to pick the tenant sent in `X-Tenant-Id`.
   */
  async index({ auth, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    const enrollments = await Enrollment.query()
      .apply((scopes) => scopes.active())
      .where('user_id', user.id)
      .preload('tenant')
      .orderBy('created_at')

    const tenants = new Map<string, Tenant>()
    for (const enrollment of enrollments) {
      if (!enrollment.tenant.isOperational) continue
      const tenant = tenants.get(enrollment.tenantId) ?? enrollment.tenant
      tenant.$extras.roles = [...(tenant.$extras.roles ?? []), enrollment.role]
      tenants.set(enrollment.tenantId, tenant)
    }

    return serialize(TenantTransformer.transform([...tenants.values()]))
  }

  /**
   * GET /api/v1/tenant — active tenant context (requires X-Tenant-Id)
   */
  async current({ tenant, tenantRoles, serialize }: HttpContext) {
    tenant.$extras.roles = tenantRoles
    return serialize(TenantTransformer.transform(tenant))
  }
}
