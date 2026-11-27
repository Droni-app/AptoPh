import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'
import { ROLE_LABELS, type EnrollmentRole } from '@aptoph/shared'
import Enrollment from '#models/tenants/enrollment'
import type Tenant from '#models/tenants/tenant'
import User from '#models/auth/user'
import FieldException from '#exceptions/field_exception'
import ResourceException from '#exceptions/resource_exception'
import { generateToken, hashToken } from '#services/secure_token'

/** How long an invitation link works */
export const INVITATION_TTL_DAYS = 7

export type InviteInput = {
  email: string
  fullName: string
  role: EnrollmentRole
  title?: string | null
  startsOn?: DateTime | null
  endsOn?: DateTime | null
  /** Resident invitations can link the account to an occupant of a unit */
  occupantId?: string | null
}

export type AcceptInput = { password?: string; fullName?: string }

const INVALID_INVITATION =
  'La invitación no es válida o ya venció. Pide a la administración que te la reenvíe.'

/**
 * Invitations by email: an enrollment in status `invited` with a single-use token.
 * Accepting it activates the enrollment and, for new people, sets their password.
 */
export default class InvitationService {
  /**
   * Invites a person to the conjunto with a role. Creates the account when the
   * email is new (without password) and reuses revoked enrollments.
   */
  async invite(tenant: Tenant, inviter: User, input: InviteInput) {
    return db.transaction(async (trx) => {
      const user =
        (await User.query({ client: trx }).where('email', input.email).forUpdate().first()) ??
        (await User.create({ fullName: input.fullName, email: input.email }, { client: trx }))

      const existing = await Enrollment.query({ client: trx })
        .where({ tenantId: tenant.id, userId: user.id, role: input.role })
        .forUpdate()
        .first()

      if (existing && existing.status !== 'revoked') {
        const label = ROLE_LABELS[input.role].toLowerCase()
        throw new FieldException(
          'email',
          existing.status === 'invited'
            ? `Esta persona ya tiene una invitación pendiente como ${label}. Puedes reenviarla.`
            : `Esta persona ya tiene el rol ${label} en el conjunto.`
        )
      }

      if (input.occupantId) {
        await this.linkOccupant(tenant, user, input.occupantId, trx)
      }

      const { plain, hash } = generateToken()
      const values = {
        status: 'invited' as const,
        title: input.title ?? null,
        startsOn: input.startsOn ?? null,
        endsOn: input.endsOn ?? null,
        invitedById: inviter.id,
        invitationTokenHash: hash,
        invitationExpiresAt: DateTime.now().plus({ days: INVITATION_TTL_DAYS }),
        invitationSentAt: DateTime.now(),
        acceptedAt: null,
      }

      let enrollment: Enrollment
      if (existing) {
        enrollment = existing.merge(values)
        await enrollment.useTransaction(trx).save()
      } else {
        enrollment = await Enrollment.create(
          { ...values, tenantId: tenant.id, userId: user.id, role: input.role },
          { client: trx }
        )
      }

      return { enrollment, user, token: plain }
    })
  }

  /**
   * New link for a pending invitation (the previous one stops working)
   */
  async resend(enrollment: Enrollment, inviter: User) {
    if (enrollment.status !== 'invited') {
      throw ResourceException.conflict('Solo se pueden reenviar invitaciones pendientes')
    }
    const { plain, hash } = generateToken()
    enrollment.merge({
      invitedById: inviter.id,
      invitationTokenHash: hash,
      invitationExpiresAt: DateTime.now().plus({ days: INVITATION_TTL_DAYS }),
      invitationSentAt: DateTime.now(),
    })
    await enrollment.save()
    return plain
  }

  /**
   * Pending, unexpired invitation for a link, with its conjunto, person and inviter
   */
  async find(plain: string, trx?: TransactionClientContract) {
    const enrollment = await Enrollment.query({ client: trx })
      .where('invitation_token_hash', hashToken(plain))
      .where('status', 'invited')
      .where('invitation_expires_at', '>', DateTime.now().toSQL())
      .preload('tenant')
      .preload('user')
      .preload('invitedBy')
      .if(trx, (query) => query.forUpdate())
      .first()

    if (!enrollment || !enrollment.tenant.isOperational || enrollment.user.isBlocked) {
      throw ResourceException.notFound(INVALID_INVITATION)
    }
    return enrollment
  }

  /**
   * Accepts the invitation: activates the enrollment, sets the password of new
   * accounts and confirms the email (the link proves the person owns it).
   */
  async accept(plain: string, input: AcceptInput) {
    return db.transaction(async (trx) => {
      const enrollment = await this.find(plain, trx)
      const user = enrollment.user.useTransaction(trx)

      if (!user.hasPassword) {
        if (!input.password) {
          throw new FieldException('password', 'Crea una contraseña para tu cuenta')
        }
        user.password = input.password
      }
      if (input.fullName) user.fullName = input.fullName
      user.emailVerifiedAt ??= DateTime.now()
      await user.save()

      enrollment.merge({
        status: 'active',
        acceptedAt: DateTime.now(),
        invitationTokenHash: null,
        invitationExpiresAt: null,
      })
      await enrollment.useTransaction(trx).save()

      return { enrollment, user }
    })
  }

  private async linkOccupant(
    tenant: Tenant,
    user: User,
    occupantId: string,
    trx: TransactionClientContract
  ) {
    const occupant = await tenant
      .related('unitOccupants')
      .query()
      .useTransaction(trx)
      .where('id', occupantId)
      .forUpdate()
      .first()
    if (!occupant) {
      throw new FieldException('occupantId', 'El ocupante no existe en este conjunto')
    }
    if (occupant.userId && occupant.userId !== user.id) {
      throw new FieldException('occupantId', 'Este ocupante ya está vinculado a otra cuenta')
    }
    occupant.userId = user.id
    occupant.email ??= user.email
    await occupant.useTransaction(trx).save()
  }
}
