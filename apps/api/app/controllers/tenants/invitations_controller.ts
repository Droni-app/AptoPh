import type { HttpContext } from '@adonisjs/core/http'
import { ROLE_LABELS } from '@aptoph/shared'
import InvitationService from '#services/tenants/invitation_service'
import { createSession } from '#services/auth/auth_session'
import { evidenceFrom } from '#services/legal/legal_acceptances'
import { acceptInvitationValidator } from '#validators/auth/account'
import ResourceException from '#exceptions/resource_exception'

/**
 * Public invitation links: /api/v1/invitations/*
 */
export default class InvitationsController {
  /**
   * GET /api/v1/invitations/:token: what the invitation is about, to show it
   * before accepting (and whether a password must be created)
   */
  async show({ params }: HttpContext) {
    const enrollment = await new InvitationService().find(params.token)
    return {
      data: {
        tenant: { id: enrollment.tenant.id, name: enrollment.tenant.name },
        role: enrollment.role,
        roleLabel: ROLE_LABELS[enrollment.role],
        title: enrollment.title,
        email: enrollment.user.email,
        fullName: enrollment.user.fullName,
        invitedBy: enrollment.invitedBy?.fullName ?? null,
        needsPassword: !enrollment.user.hasPassword,
        expiresAt: enrollment.invitationExpiresAt!.toISO(),
      },
    }
  }

  /**
   * POST /api/v1/invitations/accept: activates the role, sets the password of new
   * accounts, records the acceptance of the terms and the data policy and signs the
   * person in
   */
  async accept(ctx: HttpContext) {
    const { token, password, fullName, device } =
      await ctx.request.validateUsing(acceptInvitationValidator)

    const { enrollment, user } = await new InvitationService().accept(token, {
      password,
      fullName,
      evidence: evidenceFrom(ctx),
    })
    if (user.isBlocked) {
      throw ResourceException.forbidden('Tu cuenta está bloqueada. Contacta a la administración.')
    }

    return {
      data: {
        ...(await createSession(ctx, user, device)),
        tenantId: enrollment.tenantId,
        role: enrollment.role,
      },
    }
  }
}
