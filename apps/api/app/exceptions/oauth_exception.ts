import { Exception } from '@adonisjs/core/exceptions'
import type { HttpContext } from '@adonisjs/core/http'

export type OAuthErrorCode =
  | 'invalid_request'
  | 'invalid_client'
  | 'invalid_grant'
  | 'unauthorized_client'
  | 'unsupported_grant_type'
  | 'unsupported_response_type'
  | 'invalid_scope'
  | 'access_denied'
  | 'server_error'

/**
 * Error returned by the token and revocation endpoints using the
 * RFC 6749 §5.2 format: { error, error_description }.
 */
export default class OAuthException extends Exception {
  constructor(
    public error: OAuthErrorCode,
    description: string,
    status = 400
  ) {
    super(description, { status, code: error })
  }

  async handle(error: this, ctx: HttpContext) {
    ctx.response
      .status(error.status)
      .header('Cache-Control', 'no-store')
      .json({ error: error.error, error_description: error.message })
  }
}
