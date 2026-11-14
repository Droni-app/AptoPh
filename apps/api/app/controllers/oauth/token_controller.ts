import type { HttpContext } from '@adonisjs/core/http'
import OAuthException from '#exceptions/oauth_exception'
import OauthClient from '#models/oauth_client'
import OAuthService from '#services/oauth_service'

/**
 * Reads client credentials from the body or from HTTP Basic auth (RFC 6749 §2.3.1)
 */
export async function authenticateClient(ctx: HttpContext) {
  let clientId = ctx.request.input('client_id') as string | undefined
  let clientSecret = ctx.request.input('client_secret') as string | undefined

  const authorization = ctx.request.header('authorization')
  if (authorization?.startsWith('Basic ')) {
    const decoded = Buffer.from(authorization.slice(6), 'base64').toString('utf8')
    const separator = decoded.indexOf(':')
    if (separator > -1) {
      clientId = decodeURIComponent(decoded.slice(0, separator))
      clientSecret = decodeURIComponent(decoded.slice(separator + 1))
    }
  }

  const client = clientId ? await OauthClient.findActiveByClientId(String(clientId)) : null
  if (!client || !(await client.verifySecret(clientSecret))) {
    throw new OAuthException('invalid_client', 'Client authentication failed', 401)
  }

  return client
}

function requiredString(ctx: HttpContext, name: string) {
  const value = ctx.request.input(name)
  if (typeof value !== 'string' || value.length === 0) {
    throw new OAuthException('invalid_request', `Missing parameter: ${name}`)
  }
  return value
}

/**
 * Token endpoint. POST /oauth/token
 */
export default class TokenController {
  async handle(ctx: HttpContext) {
    const client = await authenticateClient(ctx)
    const service = new OAuthService()
    const grantType = ctx.request.input('grant_type')

    let tokens
    if (grantType === 'authorization_code') {
      tokens = await service.exchangeAuthorizationCode({
        client,
        code: requiredString(ctx, 'code'),
        redirectUri: requiredString(ctx, 'redirect_uri'),
        codeVerifier: requiredString(ctx, 'code_verifier'),
      })
    } else if (grantType === 'refresh_token') {
      tokens = await service.refresh({ client, refreshToken: requiredString(ctx, 'refresh_token') })
    } else {
      throw new OAuthException('unsupported_grant_type', 'Unsupported grant_type')
    }

    return ctx.response
      .header('Cache-Control', 'no-store')
      .header('Pragma', 'no-cache')
      .json(tokens)
  }
}
