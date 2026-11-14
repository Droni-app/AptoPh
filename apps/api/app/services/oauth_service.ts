import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import oauthConfig from '#config/oauth'
import OAuthException from '#exceptions/oauth_exception'
import OauthAuthorizationCode from '#models/oauth_authorization_code'
import type OauthClient from '#models/oauth_client'
import OauthRefreshToken from '#models/oauth_refresh_token'
import User from '#models/user'

export type TokenResponse = {
  access_token: string
  token_type: 'Bearer'
  expires_in: number
  refresh_token: string
  scope?: string
}

/** RFC 7636 §4.1: 43-128 chars from the unreserved set */
const CODE_VERIFIER_REGEX = /^[A-Za-z0-9\-._~]{43,128}$/
/** base64url(sha256(...)) is always 43 chars */
const S256_CHALLENGE_REGEX = /^[A-Za-z0-9\-_]{43}$/

/** Lucid returns `[count]` for updates on PostgreSQL */
function affectedRows(result: unknown) {
  return Number(Array.isArray(result) ? result[0] : result)
}

export default class OAuthService {
  static randomToken(bytes = 32) {
    return randomBytes(bytes).toString('base64url')
  }

  static hashToken(value: string) {
    return createHash('sha256').update(value).digest('hex')
  }

  static isValidCodeChallenge(challenge: string) {
    return S256_CHALLENGE_REGEX.test(challenge)
  }

  static verifyPkce(codeVerifier: string, codeChallenge: string) {
    if (!CODE_VERIFIER_REGEX.test(codeVerifier)) return false
    const computed = Buffer.from(createHash('sha256').update(codeVerifier).digest('base64url'))
    const expected = Buffer.from(codeChallenge)
    return computed.length === expected.length && timingSafeEqual(computed, expected)
  }

  /**
   * Creates a single-use authorization code and returns its raw value.
   * Only the SHA-256 hash is persisted.
   */
  async createAuthorizationCode(params: {
    client: OauthClient
    user: User
    redirectUri: string
    codeChallenge: string
    codeChallengeMethod: string
    scope?: string | null
  }) {
    const code = OAuthService.randomToken()

    await OauthAuthorizationCode.create({
      codeHash: OAuthService.hashToken(code),
      oauthClientId: params.client.id,
      userId: params.user.id,
      redirectUri: params.redirectUri,
      codeChallenge: params.codeChallenge,
      codeChallengeMethod: params.codeChallengeMethod,
      scope: params.scope ?? null,
      expiresAt: DateTime.now().plus({ seconds: oauthConfig.authorizationCodeTtlSeconds }),
    })

    return code
  }

  /**
   * grant_type=authorization_code
   */
  async exchangeAuthorizationCode(params: {
    client: OauthClient
    code: string
    redirectUri: string
    codeVerifier: string
  }): Promise<TokenResponse> {
    const authCode = await OauthAuthorizationCode.findBy(
      'codeHash',
      OAuthService.hashToken(params.code)
    )

    if (!authCode || authCode.oauthClientId !== params.client.id) {
      throw new OAuthException('invalid_grant', 'Invalid authorization code')
    }

    /**
     * Mark as consumed atomically so the same code can never be exchanged twice,
     * even with concurrent requests.
     */
    const consumed = await OauthAuthorizationCode.query()
      .where('id', authCode.id)
      .whereNull('consumed_at')
      .update({ consumed_at: DateTime.now().toSQL() })

    if (affectedRows(consumed) !== 1) {
      throw new OAuthException('invalid_grant', 'Authorization code already used')
    }

    if (authCode.expiresAt < DateTime.now()) {
      throw new OAuthException('invalid_grant', 'Authorization code expired')
    }

    if (authCode.redirectUri !== params.redirectUri) {
      throw new OAuthException(
        'invalid_grant',
        'redirect_uri does not match the authorization request'
      )
    }

    if (!OAuthService.verifyPkce(params.codeVerifier, authCode.codeChallenge)) {
      throw new OAuthException('invalid_grant', 'Invalid code_verifier')
    }

    const user = await User.find(authCode.userId)
    if (!user || user.isBlocked) {
      throw new OAuthException('invalid_grant', 'User is not allowed to sign in')
    }

    user.lastLoginAt = DateTime.now()
    await user.save()

    return this.issueTokens(params.client, user, authCode.scope, randomUUID())
  }

  /**
   * grant_type=refresh_token. Refresh tokens are rotated on every use; reusing an
   * already rotated token revokes the whole family (RFC 9700 §4.14.2).
   */
  async refresh(params: { client: OauthClient; refreshToken: string }): Promise<TokenResponse> {
    const stored = await OauthRefreshToken.findBy(
      'tokenHash',
      OAuthService.hashToken(params.refreshToken)
    )

    if (!stored || stored.oauthClientId !== params.client.id) {
      throw new OAuthException('invalid_grant', 'Invalid refresh token')
    }

    const revoked = await OauthRefreshToken.query()
      .where('id', stored.id)
      .whereNull('revoked_at')
      .update({ revoked_at: DateTime.now().toSQL() })

    if (affectedRows(revoked) !== 1) {
      await this.revokeFamily(stored.familyId)
      throw new OAuthException('invalid_grant', 'Refresh token already used')
    }

    if (stored.expiresAt < DateTime.now()) {
      throw new OAuthException('invalid_grant', 'Refresh token expired')
    }

    const user = await User.find(stored.userId)
    if (!user || user.isBlocked) {
      await this.revokeFamily(stored.familyId)
      throw new OAuthException('invalid_grant', 'User is not allowed to sign in')
    }

    return this.issueTokens(params.client, user, stored.scope, stored.familyId)
  }

  /**
   * RFC 7009. Revoking a refresh token revokes its family and deletes the
   * access tokens issued with it. Unknown tokens are ignored (as the RFC requires).
   */
  async revoke(params: { client: OauthClient; token: string }) {
    const stored = await OauthRefreshToken.findBy('tokenHash', OAuthService.hashToken(params.token))
    if (stored && stored.oauthClientId === params.client.id) {
      await this.revokeFamily(stored.familyId)
    }
  }

  async revokeFamily(familyId: string) {
    await db.transaction(async (trx) => {
      const accessTokenIds = await trx
        .from('oauth_refresh_tokens')
        .where('family_id', familyId)
        .whereNotNull('access_token_id')
        .select('access_token_id')

      await trx
        .from('oauth_refresh_tokens')
        .where('family_id', familyId)
        .whereNull('revoked_at')
        .update({ revoked_at: DateTime.now().toSQL() })

      if (accessTokenIds.length) {
        await trx
          .from('auth_access_tokens')
          .whereIn(
            'id',
            accessTokenIds.map((row) => row.access_token_id)
          )
          .delete()
      }
    })
  }

  private async issueTokens(
    client: OauthClient,
    user: User,
    scope: string | null,
    familyId: string
  ): Promise<TokenResponse> {
    const accessToken = await User.accessTokens.create(user, ['*'], { name: client.clientId })
    const refreshToken = OAuthService.randomToken()

    await OauthRefreshToken.create({
      tokenHash: OAuthService.hashToken(refreshToken),
      familyId,
      oauthClientId: client.id,
      userId: user.id,
      accessTokenId: Number(accessToken.identifier),
      scope,
      expiresAt: DateTime.now().plus({ days: oauthConfig.refreshTokenTtlDays }),
    })

    const expiresIn = accessToken.expiresAt
      ? Math.round((accessToken.expiresAt.getTime() - Date.now()) / 1000)
      : 0

    return {
      access_token: accessToken.value!.release(),
      token_type: 'Bearer',
      expires_in: expiresIn,
      refresh_token: refreshToken,
      ...(scope ? { scope } : {}),
    }
  }
}
