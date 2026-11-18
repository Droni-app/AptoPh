import { DateTime, type DurationLike } from 'luxon'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { UserTokenType } from '@aptoph/shared'
import UserToken from '#models/user_token'
import type User from '#models/user'
import { generateToken, hashToken } from '#services/secure_token'

/** How long each kind of link works */
export const USER_TOKEN_TTL: Record<UserTokenType, DurationLike> = {
  password_reset: { hours: 1 },
  email_verification: { days: 3 },
}

/**
 * Issues and consumes single-use tokens for password reset and email verification
 */
export default class UserTokenService {
  /**
   * Creates a token and returns its plain value (to put in the link). Earlier
   * unused tokens of the same type stop working, so only the last email is valid.
   */
  async issue(user: User, type: UserTokenType, trx?: TransactionClientContract) {
    await UserToken.query({ client: trx })
      .where('user_id', user.id)
      .where('type', type)
      .whereNull('used_at')
      .delete()

    const { plain, hash } = generateToken()
    await UserToken.create(
      {
        userId: user.id,
        type,
        tokenHash: hash,
        expiresAt: DateTime.now().plus(USER_TOKEN_TTL[type]),
      },
      { client: trx }
    )
    return plain
  }

  /**
   * Marks the token as used and returns its user, or null when the token does not
   * exist, was already used or expired. Locks the row so it can be used only once.
   */
  async consume(plain: string, type: UserTokenType, trx: TransactionClientContract) {
    const token = await UserToken.query({ client: trx })
      .where('token_hash', hashToken(plain))
      .where('type', type)
      .forUpdate()
      .preload('user')
      .first()

    if (!token || token.usedAt || token.expiresAt < DateTime.now()) return null

    token.usedAt = DateTime.now()
    await token.save()
    return token.user
  }
}
