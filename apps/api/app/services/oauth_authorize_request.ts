import type { HttpContext } from '@adonisjs/core/http'
import oauthConfig from '#config/oauth'
import OauthClient from '#models/oauth_client'
import OAuthService from '#services/oauth_service'

export type AuthorizeParams = {
  response_type: string
  client_id: string
  redirect_uri: string
  code_challenge: string
  code_challenge_method: string
  state: string
  scope: string
}

export type ResolvedAuthorizeRequest =
  | { kind: 'valid'; client: OauthClient; params: AuthorizeParams }
  /** client_id / redirect_uri cannot be trusted: show an error page, never redirect */
  | { kind: 'fatal'; message: string }
  /** Request is malformed but the redirect_uri is trusted: redirect with ?error= */
  | { kind: 'redirect_error'; url: string }

const PARAM_NAMES = [
  'response_type',
  'client_id',
  'redirect_uri',
  'code_challenge',
  'code_challenge_method',
  'state',
  'scope',
] as const

export function pickAuthorizeParams(input: Record<string, unknown>): AuthorizeParams {
  return Object.fromEntries(
    PARAM_NAMES.map((name) => [name, typeof input[name] === 'string' ? input[name] : ''])
  ) as AuthorizeParams
}

/**
 * Redirects to an exact URL. The app has `forwardQueryString` enabled, which would
 * otherwise append the incoming OAuth parameters to the client's redirect_uri.
 */
export function redirectTo(ctx: HttpContext, url: string) {
  return ctx.response.redirect().withQs(false).toPath(url)
}

export function buildRedirectUrl(redirectUri: string, query: Record<string, string>) {
  const url = new URL(redirectUri)
  for (const [key, value] of Object.entries(query)) {
    if (value) url.searchParams.set(key, value)
  }
  return url.toString()
}

/**
 * Validates an authorization request (RFC 6749 §4.1.1 + PKCE, OAuth 2.1)
 */
export async function resolveAuthorizeRequest(
  input: Record<string, unknown>
): Promise<ResolvedAuthorizeRequest> {
  const params = pickAuthorizeParams(input)

  const client = params.client_id ? await OauthClient.findActiveByClientId(params.client_id) : null
  if (!client) {
    return { kind: 'fatal', message: 'La aplicación que solicita el acceso no es válida.' }
  }

  if (!params.redirect_uri || !client.allowsRedirectUri(params.redirect_uri)) {
    return {
      kind: 'fatal',
      message: 'La dirección de retorno no está autorizada para esta aplicación.',
    }
  }

  const fail = (error: string, description: string): ResolvedAuthorizeRequest => ({
    kind: 'redirect_error',
    url: buildRedirectUrl(params.redirect_uri, {
      error,
      error_description: description,
      state: params.state,
    }),
  })

  if (params.response_type !== 'code') {
    return fail('unsupported_response_type', 'Only response_type=code is supported')
  }

  if (
    !(oauthConfig.codeChallengeMethods as readonly string[]).includes(
      params.code_challenge_method
    ) ||
    !OAuthService.isValidCodeChallenge(params.code_challenge)
  ) {
    return fail('invalid_request', 'PKCE with code_challenge_method=S256 is required')
  }

  return { kind: 'valid', client, params }
}
