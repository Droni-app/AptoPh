/**
 * OAuth 2.1 authorization server settings.
 * Durations use the same string format as @adonisjs/auth ("1 hour", "30 days").
 */
const oauthConfig = {
  /** Lifetime of opaque access tokens (oat_…) */
  accessTokenTtl: '1 hour',
  /** Lifetime of refresh tokens (rotated on every use) */
  refreshTokenTtlDays: 30,
  /** Lifetime of authorization codes, in seconds */
  authorizationCodeTtlSeconds: 60,
  /** Only S256 is allowed (OAuth 2.1) */
  codeChallengeMethods: ['S256'] as const,
}

export default oauthConfig
