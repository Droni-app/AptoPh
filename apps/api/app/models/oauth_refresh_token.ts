import { OauthRefreshTokenSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import OauthClient from '#models/oauth_client'
import User from '#models/user'

export default class OauthRefreshToken extends OauthRefreshTokenSchema {
  @belongsTo(() => OauthClient, { foreignKey: 'oauthClientId' })
  declare client: BelongsTo<typeof OauthClient>

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
