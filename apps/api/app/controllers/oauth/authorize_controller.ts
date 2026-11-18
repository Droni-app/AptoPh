import type { HttpContext } from '@adonisjs/core/http'
import { errors as authErrors } from '@adonisjs/auth'
import User from '#models/user'
import OAuthService from '#services/oauth_service'
import type OauthClient from '#models/oauth_client'
import {
  type AuthorizeParams,
  buildRedirectUrl,
  redirectTo,
  resolveAuthorizeRequest,
} from '#services/oauth_authorize_request'

/**
 * Authorization endpoint (Authorization Code + PKCE).
 * Renders the hosted login page and redirects back to the client with a code.
 */
export default class AuthorizeController {
  /**
   * GET /oauth/authorize
   */
  async show(ctx: HttpContext) {
    const request = await resolveAuthorizeRequest(ctx.request.qs())

    if (request.kind === 'fatal') return this.renderError(ctx, request.message)
    if (request.kind === 'redirect_error') return redirectTo(ctx, request.url)

    const webAuth = ctx.auth.use('web')
    const user = (await webAuth.check()) ? webAuth.user! : null

    if (user && !user.isBlocked && ctx.request.input('prompt') !== 'login') {
      return this.redirectWithCode(ctx, request.client, request.params, user)
    }

    return this.renderLogin(ctx, request.client, request.params)
  }

  /**
   * POST /oauth/authorize — submitted by the hosted login form
   */
  async store(ctx: HttpContext) {
    const request = await resolveAuthorizeRequest(ctx.request.all())

    if (request.kind === 'fatal') return this.renderError(ctx, request.message)
    if (request.kind === 'redirect_error') return redirectTo(ctx, request.url)

    const email = String(ctx.request.input('email', '')).trim().toLowerCase()
    const password = String(ctx.request.input('password', ''))

    let user: User
    try {
      user = await User.verifyCredentials(email, password)
    } catch (error) {
      if (error instanceof authErrors.E_INVALID_CREDENTIALS) {
        return this.renderLogin(ctx, request.client, request.params, {
          email,
          error: 'Correo o contraseña incorrectos.',
        })
      }
      throw error
    }

    if (user.isBlocked) {
      return this.renderLogin(ctx, request.client, request.params, {
        email,
        error: 'Tu cuenta está bloqueada. Contacta a la administración.',
      })
    }

    await ctx.auth.use('web').login(user)
    return this.redirectWithCode(ctx, request.client, request.params, user)
  }

  private async redirectWithCode(
    ctx: HttpContext,
    client: OauthClient,
    params: AuthorizeParams,
    user: User
  ) {
    const code = await new OAuthService().createAuthorizationCode({
      client,
      user,
      redirectUri: params.redirect_uri,
      codeChallenge: params.code_challenge,
      codeChallengeMethod: params.code_challenge_method,
      scope: params.scope || null,
    })

    return redirectTo(ctx, buildRedirectUrl(params.redirect_uri, { code, state: params.state }))
  }

  private async renderLogin(
    ctx: HttpContext,
    client: OauthClient,
    params: AuthorizeParams,
    extra: { email?: string; error?: string } = {}
  ) {
    const html = await ctx.view.render('oauth/login', {
      clientName: client.name,
      // Only the administration can create a conjunto from the sign-up page
      signupUrl: client.clientId === 'backoffice' ? '/registro' : null,
      params,
      email: extra.email ?? '',
      error: extra.error ?? null,
    })
    return ctx.response
      .status(extra.error ? 422 : 200)
      .header('Content-Type', 'text/html; charset=utf-8')
      .header('Cache-Control', 'no-store')
      .send(html)
  }

  private async renderError(ctx: HttpContext, message: string) {
    const html = await ctx.view.render('oauth/error', { message })
    return ctx.response.status(400).header('Content-Type', 'text/html; charset=utf-8').send(html)
  }
}
