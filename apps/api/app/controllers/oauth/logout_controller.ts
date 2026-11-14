import type { HttpContext } from '@adonisjs/core/http'
import OauthClient from '#models/oauth_client'
import { buildRedirectUrl, redirectTo } from '#services/oauth_authorize_request'

/**
 * Ends the session on the authorization server (SSO cookie).
 * GET /oauth/logout?client_id=…&post_logout_redirect_uri=…&state=…
 *
 * Clients should also call /oauth/revoke with their refresh token.
 */
export default class LogoutController {
  async handle(ctx: HttpContext) {
    await ctx.auth.use('web').logout()

    const clientId = ctx.request.input('client_id')
    const redirectUri = ctx.request.input('post_logout_redirect_uri')
    const client = clientId ? await OauthClient.findActiveByClientId(String(clientId)) : null

    if (client && redirectUri && client.allowsPostLogoutRedirectUri(String(redirectUri))) {
      return redirectTo(
        ctx,
        buildRedirectUrl(String(redirectUri), { state: String(ctx.request.input('state', '')) })
      )
    }

    const html = await ctx.view.render('oauth/logged_out')
    return ctx.response.header('Content-Type', 'text/html; charset=utf-8').send(html)
  }
}
