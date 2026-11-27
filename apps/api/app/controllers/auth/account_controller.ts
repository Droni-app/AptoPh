import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/auth/user'
import EmailVerificationMail from '#mails/auth/email_verification_mail'
import PasswordChangedMail from '#mails/auth/password_changed_mail'
import FieldException from '#exceptions/field_exception'
import ResourceException from '#exceptions/resource_exception'
import UserTransformer from '#transformers/auth/user_transformer'
import UserTokenService from '#services/auth/user_token_service'
import { tokenLink } from '#services/app_urls'
import { queueMail } from '#services/mailer'
import { revokeAllTokens } from '#controllers/auth/auth_controller'
import { throwTooManyAttempts, verificationEmailLimiter } from '#start/limiter'
import {
  changePasswordValidator,
  sendVerificationValidator,
  updateProfileValidator,
} from '#validators/auth/account'

/**
 * The signed-in person's own account: /api/v1/account/*
 */
export default class AccountController {
  /**
   * PATCH /api/v1/account/profile. The email is the login and is not changed here.
   */
  async updateProfile({ auth, request, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    const data = await request.validateUsing(updateProfileValidator)
    if (data.documentType && !data.documentNumber) {
      throw new FieldException('documentNumber', 'Escribe el número de documento')
    }
    user.merge({
      ...data,
      documentType: data.documentNumber ? data.documentType : null,
      documentNumber: data.documentType ? data.documentNumber : null,
    })
    await user.save()
    return serialize(UserTransformer.transform(user))
  }

  /**
   * PUT /api/v1/account/password: needs the current password; closes every other
   * session and emails a security notice
   */
  async changePassword({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const { currentPassword, password } = await request.validateUsing(changePasswordValidator)

    if (!(await user.verifyPassword(currentPassword))) {
      throw new FieldException('currentPassword', 'La contraseña actual no es correcta')
    }

    user.password = password
    await user.save()
    await revokeAllTokens(user, user.currentAccessToken?.identifier)
    queueMail(new PasswordChangedMail(user), 'password changed')
    return response.noContent()
  }

  /**
   * GET /api/v1/account/sessions: open sessions (access tokens), the current first
   */
  async sessions({ auth }: HttpContext) {
    const user = auth.getUserOrFail()
    const current = String(user.currentAccessToken?.identifier)
    const tokens = await User.accessTokens.all(user)

    const data = tokens
      .filter((token) => !token.isExpired())
      .map((token) => ({
        id: String(token.identifier),
        device: token.name ?? 'Sin nombre',
        createdAt: token.createdAt.toISOString(),
        lastUsedAt: token.lastUsedAt?.toISOString() ?? null,
        expiresAt: token.expiresAt?.toISOString() ?? null,
        current: String(token.identifier) === current,
      }))
      .sort((a, b) => Number(b.current) - Number(a.current))

    return { data }
  }

  /**
   * DELETE /api/v1/account/sessions/:sessionId: signs out one device
   */
  async destroySession({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const deleted = await User.accessTokens.delete(user, params.sessionId)
    if (!deleted) throw ResourceException.notFound('La sesión no existe')
    return response.noContent()
  }

  /**
   * DELETE /api/v1/account/sessions: signs out every other device
   */
  async destroyOtherSessions({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    await revokeAllTokens(user, user.currentAccessToken?.identifier)
    return response.noContent()
  }

  /**
   * POST /api/v1/account/email/verification: emails a new confirmation link
   * (3 per hour). 204 also when the email is already confirmed.
   */
  async sendVerification({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const { app } = await request.validateUsing(sendVerificationValidator)
    if (user.emailVerifiedAt) return response.noContent()

    const key = `verify_${user.id}`
    const sent = await verificationEmailLimiter.attempt(key, async () => {
      const token = await new UserTokenService().issue(user, 'email_verification')
      queueMail(
        new EmailVerificationMail(user, tokenLink(app ?? 'web', '/verificar-correo', token)),
        'email verification'
      )
      return true
    })
    if (!sent) await throwTooManyAttempts(verificationEmailLimiter, key)

    return response.noContent()
  }
}
