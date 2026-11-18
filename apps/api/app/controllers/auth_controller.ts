import type { HttpContext } from '@adonisjs/core/http'
import { errors as authErrors } from '@adonisjs/auth'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import User from '#models/user'
import WelcomeMail from '#mails/welcome_mail'
import PasswordResetMail from '#mails/password_reset_mail'
import PasswordChangedMail from '#mails/password_changed_mail'
import FieldException from '#exceptions/field_exception'
import ResourceException from '#exceptions/resource_exception'
import SignupService, { EmailTakenError } from '#services/signup_service'
import UserTokenService from '#services/user_token_service'
import { appUrl, tokenLink } from '#services/app_urls'
import { queueMail } from '#services/mailer'
import { createSession } from '#services/auth_session'
import {
  loginLimiter,
  passwordResetEmailLimiter,
  throwTooManyAttempts,
  tooManyAttempts,
} from '#start/limiter'
import { loginValidator } from '#validators/auth'
import { signupValidator } from '#validators/signup'
import {
  forgotPasswordValidator,
  resetPasswordValidator,
  verifyEmailValidator,
} from '#validators/account'

const INVALID_LINK = 'El enlace no es válido o ya venció. Solicita uno nuevo.'

/**
 * Email + password authentication with AdonisJS access tokens (opaque `oat_…`
 * bearer tokens stored hashed in `auth_access_tokens`). See docs/authentication.md.
 */
export default class AuthController {
  /**
   * POST /api/v1/auth/login. Five wrong passwords for the same email and IP block
   * that pair for 15 minutes; a successful login clears the count.
   */
  async login(ctx: HttpContext) {
    const { email, password, device } = await ctx.request.validateUsing(loginValidator)

    let result: Awaited<ReturnType<typeof loginLimiter.penalize<User>>>
    try {
      result = await loginLimiter.penalize(`login_${email}_${ctx.request.ip()}`, () =>
        // Constant time: also hashes a dummy password when the email does not exist
        User.verifyCredentials(email, password)
      )
    } catch (error) {
      if (error instanceof authErrors.E_INVALID_CREDENTIALS) {
        throw ResourceException.badRequest('El correo o la contraseña no son correctos')
      }
      throw error
    }
    const [throttled, user] = result
    if (throttled) throw tooManyAttempts(throttled)

    if (user.isBlocked) {
      throw ResourceException.forbidden('Tu cuenta está bloqueada. Contacta a la administración.')
    }

    user.lastLoginAt = DateTime.now()
    await user.save()
    return { data: await createSession(ctx, user, device) }
  }

  /**
   * POST /api/v1/auth/signup: the administrator's account, the conjunto and the
   * 30-day trial, then signs the administrator in.
   */
  async signup(ctx: HttpContext) {
    const data = await ctx.request.validateUsing(signupValidator)

    let result
    try {
      result = await new SignupService().register(data)
    } catch (error) {
      if (error instanceof EmailTakenError) {
        throw new FieldException(
          'email',
          'Ya existe una cuenta con este correo. Inicia sesión para continuar.'
        )
      }
      throw error
    }

    const verifyToken = await new UserTokenService().issue(result.user, 'email_verification')
    queueMail(
      new WelcomeMail(
        result.user,
        result.tenant,
        result.subscription,
        appUrl('backoffice'),
        tokenLink('backoffice', '/verificar-correo', verifyToken)
      ),
      'welcome'
    )

    ctx.response.status(201)
    return {
      data: {
        ...(await createSession(ctx, result.user, data.device)),
        tenantId: result.tenant.id,
      },
    }
  }

  /**
   * POST /api/v1/auth/logout: revokes the token used in the request
   */
  async logout({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    if (user.currentAccessToken) {
      await User.accessTokens.delete(user, user.currentAccessToken.identifier)
    }
    return response.noContent()
  }

  /**
   * POST /api/v1/auth/password/forgot: emails a link to choose a new password.
   * Always 204, so the response does not reveal whether the email has an account.
   */
  async forgotPassword({ request, response }: HttpContext) {
    const { email, app } = await request.validateUsing(forgotPasswordValidator)

    const key = `forgot_${email}`
    const sent = await passwordResetEmailLimiter.attempt(key, async () => {
      const user = await User.findBy('email', email)
      if (user && !user.isBlocked) {
        const token = await new UserTokenService().issue(user, 'password_reset')
        queueMail(
          new PasswordResetMail(user, tokenLink(app ?? 'web', '/restablecer-contrasena', token)),
          'password reset'
        )
      }
      return true
    })
    if (!sent) await throwTooManyAttempts(passwordResetEmailLimiter, key)

    return response.noContent()
  }

  /**
   * POST /api/v1/auth/password/reset: sets the new password with the emailed token,
   * closes every other session and signs the person in.
   */
  async resetPassword(ctx: HttpContext) {
    const { token, password, device } = await ctx.request.validateUsing(resetPasswordValidator)

    const user = await db.transaction(async (trx) => {
      const owner = await new UserTokenService().consume(token, 'password_reset', trx)
      if (!owner || owner.isBlocked) return null

      owner.useTransaction(trx)
      owner.password = password
      // The link arrived to the inbox: the email is confirmed
      owner.emailVerifiedAt ??= DateTime.now()
      await owner.save()
      return owner
    })
    if (!user) throw ResourceException.badRequest(INVALID_LINK)

    await revokeAllTokens(user)
    queueMail(new PasswordChangedMail(user), 'password changed')
    return { data: await createSession(ctx, user, device) }
  }

  /**
   * POST /api/v1/auth/email/verify: confirms the email with the emailed token.
   * Public, because the link may open in a browser without a session.
   */
  async verifyEmail({ request, response }: HttpContext) {
    const { token } = await request.validateUsing(verifyEmailValidator)

    const verified = await db.transaction(async (trx) => {
      const user = await new UserTokenService().consume(token, 'email_verification', trx)
      if (!user) return false
      user.useTransaction(trx)
      user.emailVerifiedAt ??= DateTime.now()
      await user.save()
      return true
    })
    if (!verified) throw ResourceException.badRequest(INVALID_LINK)

    return response.noContent()
  }
}

/** Signs the user out everywhere (after a password change) */
export async function revokeAllTokens(user: User, except?: string | number | BigInt) {
  const tokens = await User.accessTokens.all(user)
  for (const token of tokens) {
    if (except !== undefined && String(token.identifier) === String(except)) continue
    await User.accessTokens.delete(user, token.identifier)
  }
}
