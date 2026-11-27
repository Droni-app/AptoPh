import { randomUUID } from 'node:crypto'
import type { EnrollmentRole } from '@aptoph/shared'
import Enrollment from '#models/tenants/enrollment'
import Tenant from '#models/tenants/tenant'
import User from '#models/auth/user'

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

/**
 * Rate limits live in memory during tests and every request comes from the same
 * IP: clear them before each test of the account flows
 */
export async function resetRateLimits() {
  const { default: limiter } = await import('@adonisjs/limiter/services/main')
  await limiter.clear(['memory'])
}

/** The `token` query parameter of a link sent by email */
export function tokenFrom(link: string) {
  return new URL(link).searchParams.get('token')!
}
