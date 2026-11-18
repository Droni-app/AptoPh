import type { HttpContext } from '@adonisjs/core/http'
import { errors as authErrors } from '@adonisjs/auth'
import mail from '@adonisjs/mail/services/main'
import logger from '@adonisjs/core/services/logger'
import env from '#start/env'
import User from '#models/user'
import WelcomeMail from '#mails/welcome_mail'
import FieldException from '#exceptions/field_exception'
import ResourceException from '#exceptions/resource_exception'
import SignupService, { EmailTakenError } from '#services/signup_service'
import UserTransformer from '#transformers/user_transformer'
import { loginValidator } from '#validators/auth'
import { signupValidator } from '#validators/signup'

/**
 * Email + password authentication with AdonisJS access tokens (opaque `oat_…`
 * bearer tokens stored hashed in `auth_access_tokens`). See docs/authentication.md.
 */
export default class AuthController {
  /**
   * POST /api/v1/auth/login
   */
  async login(ctx: HttpContext) {
    const { email, password, device } = await ctx.request.validateUsing(loginValidator)

    let user: User
    try {
      // Constant time: also hashes a dummy password when the email does not exist
      user = await User.verifyCredentials(email, password)
    } catch (error) {
      if (error instanceof authErrors.E_INVALID_CREDENTIALS) {
        throw ResourceException.badRequest('El correo o la contraseña no son correctos')
      }
      throw error
    }

    if (user.isBlocked) {
      throw ResourceException.forbidden('Tu cuenta está bloqueada. Contacta a la administración.')
    }

    return { data: await this.session(ctx, user, device) }
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

    mail
      .sendLater(
        new WelcomeMail(
          result.user,
          result.tenant,
          result.subscription,
          env.get('BACKOFFICE_URL', 'http://localhost:5174')
        )
      )
      .catch((error) => logger.error({ err: error }, 'Could not queue the welcome mail'))

    ctx.response.status(201)
    return {
      data: {
        ...(await this.session(ctx, result.user, data.device)),
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

  private async session(ctx: HttpContext, user: User, device?: string) {
    const token = await User.accessTokens.create(user, ['*'], { name: device ?? 'web' })
    return {
      token: token.value!.release(),
      type: 'bearer' as const,
      expiresAt: token.expiresAt?.toISOString() ?? null,
      user: await ctx.serialize.withoutWrapping(UserTransformer.transform(user)),
    }
  }
}
