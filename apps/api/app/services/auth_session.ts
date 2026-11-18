import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import UserTransformer from '#transformers/user_transformer'

/**
 * New access token for the user, in the `AuthSession` shape of @aptoph/shared
 */
export async function createSession(ctx: HttpContext, user: User, device?: string) {
  const token = await User.accessTokens.create(user, ['*'], { name: device ?? 'web' })
  return {
    token: token.value!.release(),
    type: 'bearer' as const,
    expiresAt: token.expiresAt?.toISOString() ?? null,
    user: await ctx.serialize.withoutWrapping(UserTransformer.transform(user)),
  }
}
