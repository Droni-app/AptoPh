import type { HttpContext } from '@adonisjs/core/http'
import OAuthException from '#exceptions/oauth_exception'
import OAuthService from '#services/oauth_service'
import { authenticateClient } from '#controllers/oauth/token_controller'

/**
 * Token revocation endpoint (RFC 7009). POST /oauth/revoke
 * Accepts a refresh token; revokes its whole family and the related access tokens.
 */
export default class RevokeController {
  async handle(ctx: HttpContext) {
    const client = await authenticateClient(ctx)
    const token = ctx.request.input('token')
    if (typeof token !== 'string' || !token) {
      throw new OAuthException('invalid_request', 'Missing parameter: token')
    }

    await new OAuthService().revoke({ client, token })
    return ctx.response.status(200).send('')
  }
}
