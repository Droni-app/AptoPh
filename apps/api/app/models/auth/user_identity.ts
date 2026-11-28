import { UserIdentitySchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { IdentityProvider } from '@aptoph/shared'
import User from '#models/auth/user'

/** An external account (Google) the user signs in with. See docs/authentication.md */
export default class UserIdentity extends UserIdentitySchema {
  declare provider: IdentityProvider

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
