import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { BACKOFFICE_ROLES, ENROLLMENT_STATUSES, EnrollmentRole } from '@aptoph/shared'
import MemberTransformer from '#transformers/member_transformer'

const listMembersValidator = vine.create({
  group: vine.enum(['staff', 'residents'] as const).optional(),
  status: vine.enum(ENROLLMENT_STATUSES).optional(),
  page: vine.number().withoutDecimals().min(1).optional(),
  perPage: vine.number().withoutDecimals().min(1).max(100).optional(),
})

/**
 * Tenant members (enrollments): administration, council, workers and residents
 */
export default class MembersController {
  async index({ tenant, request, serialize }: HttpContext) {
    const filters = await request.validateUsing(listMembersValidator, { data: request.qs() })

    const query = tenant
      .related('enrollments')
      .query()
      .preload('user')
      .join('users', 'users.id', 'enrollments.user_id')
      .select('enrollments.*')
      .orderBy('users.full_name')

    if (filters.group === 'staff') query.whereIn('enrollments.role', [...BACKOFFICE_ROLES])
    if (filters.group === 'residents') query.where('enrollments.role', EnrollmentRole.Resident)
    if (filters.status) query.where('enrollments.status', filters.status)

    const page = await query.paginate(filters.page ?? 1, filters.perPage ?? 25)
    return serialize(MemberTransformer.paginate(page.all(), page.getMeta()))
  }
}
