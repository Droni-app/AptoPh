import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import db from '@adonisjs/lucid/services/db'
import { BACKOFFICE_ROLES, ENROLLMENT_STATUSES, EnrollmentRole } from '@aptoph/shared'
import Enrollment from '#models/tenants/enrollment'
import type Tenant from '#models/tenants/tenant'
import User from '#models/auth/user'
import InvitationMail from '#mails/tenants/invitation_mail'
import ResourceException from '#exceptions/resource_exception'
import FieldException from '#exceptions/field_exception'
import MemberTransformer from '#transformers/tenants/member_transformer'
import InvitationService from '#services/tenants/invitation_service'
import { appForRole, tokenLink } from '#services/app_urls'
import { queueMail } from '#services/mailer'
import {
  changeMemberStatusValidator,
  inviteMemberValidator,
  updateMemberValidator,
} from '#validators/tenants/member'

const listMembersValidator = vine.create({
  group: vine.enum(['staff', 'residents'] as const).optional(),
  status: vine.enum(ENROLLMENT_STATUSES).optional(),
  search: vine.string().trim().maxLength(100).optional(),
  page: vine.number().withoutDecimals().min(1).optional(),
  perPage: vine.number().withoutDecimals().min(1).max(100).optional(),
})

/**
 * Tenant members (enrollments): administration, council, workers and residents.
 * Each role is its own enrollment, so a person can appear once per role.
 */
export default class MembersController {
  async index({ tenant, request, serialize }: HttpContext) {
    const filters = await request.validateUsing(listMembersValidator, { data: request.qs() })

    const query = tenant
      .related('enrollments')
      .query()
      .preload('user')
      .preload('invitedBy')
      .join('users', 'users.id', 'enrollments.user_id')
      .select('enrollments.*')
      .orderBy('users.full_name')

    if (filters.group === 'staff') query.whereIn('enrollments.role', [...BACKOFFICE_ROLES])
    if (filters.group === 'residents') query.where('enrollments.role', EnrollmentRole.Resident)
    if (filters.status) query.where('enrollments.status', filters.status)
    else query.whereNot('enrollments.status', 'revoked')
    if (filters.search) {
      const term = `%${filters.search}%`
      query.where((q) => q.whereILike('users.full_name', term).orWhereILike('users.email', term))
    }

    const page = await query.paginate(filters.page ?? 1, filters.perPage ?? 25)
    return serialize(MemberTransformer.paginate(page.all(), page.getMeta()))
  }

  /**
   * POST /api/v1/members: invites a person by email with a role
   */
  async store({ tenant, auth, request, response, serialize }: HttpContext) {
    const data = await request.validateUsing(inviteMemberValidator)
    if (data.occupantId && data.role !== EnrollmentRole.Resident) {
      throw new FieldException('occupantId', 'Solo los residentes se vinculan a una unidad')
    }

    const inviter = auth.getUserOrFail()
    const { enrollment, user, token } = await new InvitationService().invite(tenant, inviter, data)
    this.sendInvitation(tenant, enrollment, user, token, inviter)

    await enrollment.load('user')
    await enrollment.load('invitedBy')
    response.status(201)
    return serialize(MemberTransformer.transform(enrollment))
  }

  /**
   * PATCH /api/v1/members/:id: title and validity dates
   */
  async update(ctx: HttpContext) {
    const enrollment = await this.find(ctx)
    const data = await ctx.request.validateUsing(updateMemberValidator)
    enrollment.merge(data)
    await enrollment.save()
    return ctx.serialize(MemberTransformer.transform(enrollment))
  }

  /**
   * POST /api/v1/members/:id/invitation: resends a pending invitation with a new link
   */
  async resendInvitation(ctx: HttpContext) {
    const enrollment = await this.find(ctx)
    const inviter = ctx.auth.getUserOrFail()
    const token = await new InvitationService().resend(enrollment, inviter)
    this.sendInvitation(ctx.tenant, enrollment, enrollment.user, token, inviter)
    await enrollment.load('invitedBy')
    return ctx.serialize(MemberTransformer.transform(enrollment))
  }

  /**
   * PATCH /api/v1/members/:id/status: suspend, reactivate or revoke (also cancels a
   * pending invitation). The conjunto always keeps an active administrator, and
   * nobody changes their own access.
   */
  async changeStatus(ctx: HttpContext) {
    const enrollment = await this.find(ctx)
    const { status } = await ctx.request.validateUsing(changeMemberStatusValidator)

    if (enrollment.userId === ctx.auth.getUserOrFail().id) {
      throw ResourceException.forbidden('No puedes cambiar tu propio acceso al conjunto')
    }
    if (status === enrollment.status) return ctx.serialize(MemberTransformer.transform(enrollment))

    if (status === 'active' && enrollment.status !== 'suspended') {
      throw ResourceException.conflict(
        enrollment.status === 'invited'
          ? 'La persona debe aceptar la invitación para quedar activa'
          : 'Para devolver el acceso, invita de nuevo a la persona'
      )
    }

    await db.transaction(async (trx) => {
      enrollment.useTransaction(trx)
      if (
        enrollment.role === EnrollmentRole.Administrator &&
        enrollment.status === 'active' &&
        status !== 'active'
      ) {
        const others = await Enrollment.query({ client: trx })
          .where({ tenantId: ctx.tenant.id, role: EnrollmentRole.Administrator, status: 'active' })
          .whereNot('id', enrollment.id)
          .forUpdate()
        if (others.length === 0) {
          throw ResourceException.conflict(
            'El conjunto debe tener al menos un administrador activo'
          )
        }
      }

      enrollment.status = status
      if (status === 'revoked') {
        enrollment.invitationTokenHash = null
        enrollment.invitationExpiresAt = null
      }
      await enrollment.save()
    })

    await this.signOutIfNoAccessLeft(enrollment.user)
    return ctx.serialize(MemberTransformer.transform(enrollment))
  }

  private async find({ tenant, params }: HttpContext) {
    return tenant
      .related('enrollments')
      .query()
      .where('id', params.id)
      .preload('user')
      .preload('invitedBy')
      .firstOrFail()
  }

  private sendInvitation(
    tenant: Tenant,
    enrollment: Enrollment,
    user: User,
    token: string,
    inviter: User
  ) {
    const link = tokenLink(appForRole(enrollment.role), '/invitacion', token)
    queueMail(new InvitationMail(user, tenant, enrollment, link, inviter), 'invitation')
  }

  /**
   * Without any active role left in any conjunto, the person's sessions are closed
   */
  private async signOutIfNoAccessLeft(user: User) {
    const active = await Enrollment.query().where({ userId: user.id, status: 'active' }).first()
    if (active) return
    for (const token of await User.accessTokens.all(user)) {
      await User.accessTokens.delete(user, token.identifier)
    }
  }
}
