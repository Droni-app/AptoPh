import { randomUUID } from 'node:crypto'
import type { EnrollmentRole } from '@apartadock/shared'
import Enrollment from '#models/enrollment'
import Tenant from '#models/tenant'
import User from '#models/user'

/**
 * Creates a tenant and a user enrolled in it with the given role
 */
export async function createMember(role: EnrollmentRole, tenant?: Tenant) {
  const suffix = randomUUID().slice(0, 8)
  tenant ??= await Tenant.create({
    name: `Conjunto ${suffix}`,
    slug: `conjunto-${suffix}`,
    status: 'active',
  })
  const user = await User.create({
    fullName: `Usuario ${suffix}`,
    email: `user-${suffix}@example.com`,
    password: 'secret-password',
  })
  await Enrollment.create({ tenantId: tenant.id, userId: user.id, role, status: 'active' })
  return { tenant, user }
}
