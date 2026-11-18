import { UserTokenSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { UserTokenType } from '@aptoph/shared'
import User from '#models/user'

/**
 * Single-use token sent by email (password reset, email verification).
 * See app/services/user_token_service.ts.
 */
export default class UserToken extends UserTokenSchema {
  declare type: UserTokenType

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
