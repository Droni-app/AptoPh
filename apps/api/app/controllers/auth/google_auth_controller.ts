import type { HttpContext } from '@adonisjs/core/http'
import { Exception } from '@adonisjs/core/exceptions'
import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'
import type { GoogleAuthResult } from '@aptoph/shared'
import User from '#models/auth/user'
import UserIdentity from '#models/auth/user_identity'
import ResourceException from '#exceptions/resource_exception'
import { createSession } from '#services/auth/auth_session'
import { GoogleAuthError, GoogleOAuth, type GoogleProfile } from '#services/auth/google_oauth'
import { googleCallbackValidator, googleStartValidator } from '#validators/auth/google'

const FAILED = 'No pudimos iniciar sesión con Google. Inténtalo de nuevo.'

/**
 * Sign in and sign up with Google (docs/authentication.md#google). The web app
 * asks for the Google URL, Google sends the browser back to the app with a code,
 * and the app posts the code here.
 */
export default class GoogleAuthController {
  /** GET /api/v1/auth/providers: which sign-in buttons the apps show */
  async providers() {
    return { data: { google: GoogleOAuth.enabled } }
  }

  /** GET /api/v1/auth/google/url?app=backoffice|web&intent=login|signup */
  async start({ request }: HttpContext) {
    const { app, intent } = await request.validateUsing(googleStartValidator, {
      data: request.qs(),
    })
    this.ensureEnabled()
    return { data: GoogleOAuth.start(app, intent ?? 'login') }
  }

  /** POST /api/v1/auth/google: the code Google gave the web app */
  async callback(ctx: HttpContext) {
    const {
      code,
      state: rawState,
      device,
    } = await ctx.request.validateUsing(googleCallbackValidator)
    this.ensureEnabled()
    const state = GoogleOAuth.readState(rawState)
    if (!state)
      throw ResourceException.badRequest(
        'El inicio de sesión con Google venció. Vuelve a intentarlo.'
      )

    let profile: GoogleProfile
    try {
      profile = await GoogleOAuth.profile(code, state)
    } catch (error) {
      logger.warn({ err: error }, 'google sign-in failed')
      if (error instanceof GoogleAuthError) throw ResourceException.badRequest(FAILED)
      throw error
    }
    if (!profile.emailVerified) {
      throw ResourceException.badRequest(
        'Tu cuenta de Google no tiene el correo confirmado. Confírmalo en Google o entra con tu contraseña.'
      )
    }

    const user = await this.userFor(profile)
    if (!user) {
      // Residents and staff are invited by the administration; only a new
      // conjunto signs up on its own, from the back-office
      if (state.app === 'web') {
        throw ResourceException.badRequest(
          `No hay una cuenta de AptoPH con ${profile.email}. Pide a la administración de tu conjunto que te invite, o entra con el correo al que llegó la invitación.`
        )
      }
      const result: GoogleAuthResult = {
        status: 'signup',
        ticket: GoogleOAuth.ticket(profile),
        profile: { fullName: profile.fullName, email: profile.email },
      }
      return { data: result }
    }
    if (user.isBlocked) {
      throw ResourceException.forbidden('Tu cuenta está bloqueada. Contacta a la administración.')
    }

    user.lastLoginAt = DateTime.now()
    // Google confirmed the email
    user.emailVerifiedAt ??= DateTime.now()
    await user.save()
    return {
      data: { status: 'session' as const, session: await createSession(ctx, user, device) },
    }
  }

  /**
   * The user of the Google account: already linked, or the account with the same
   * (Google-verified) email, which is linked now.
   */
  private async userFor(profile: GoogleProfile) {
    return db.transaction(async (trx) => {
      const identity = await UserIdentity.query({ client: trx })
        .where('provider', 'google')
        .where('provider_user_id', profile.subject)
        .preload('user')
        .forUpdate()
        .first()
      if (identity) {
        identity.useTransaction(trx)
        identity.email = profile.email
        identity.lastUsedAt = DateTime.now()
        await identity.save()
        return identity.user
      }

      const user = await User.query({ client: trx })
        .where('email', profile.email)
        .whereNull('deleted_at')
        .first()
      if (!user) return null
      // One Google account per user: a different one replaces the old link
      await UserIdentity.query({ client: trx })
        .where('user_id', user.id)
        .where('provider', 'google')
        .delete()
      await UserIdentity.create(
        {
          userId: user.id,
          provider: 'google',
          providerUserId: profile.subject,
          email: profile.email,
          lastUsedAt: DateTime.now(),
        },
        { client: trx }
      )
      return user
    })
  }

  private ensureEnabled() {
    if (!GoogleOAuth.enabled) {
      throw new Exception('El inicio de sesión con Google no está disponible', { status: 503 })
    }
  }
}
