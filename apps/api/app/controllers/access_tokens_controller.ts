import User from '#models/user'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Access tokens are issued by the OAuth token endpoint (/oauth/token).
 * This controller only revokes the current one.
 */
export default class AccessTokensController {
  async destroy({ auth }: HttpContext) {
    const user = auth.getUserOrFail()
    if (user.currentAccessToken) {
      await User.accessTokens.delete(user, user.currentAccessToken.identifier)
    }

    return {
      message: 'Logged out successfully',
    }
  }
}
