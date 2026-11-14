import { OauthClientSchema } from '#database/schema'
import hash from '@adonisjs/core/services/hash'

export default class OauthClient extends OauthClientSchema {
  declare type: 'public' | 'confidential'

  static findActiveByClientId(clientId: string) {
    return this.query().where('client_id', clientId).where('is_active', true).first()
  }

  /**
   * Redirect URIs are compared with exact string matching (RFC 6749 §3.1.2 / OAuth 2.1)
   */
  allowsRedirectUri(uri: string) {
    return this.redirectUris.includes(uri)
  }

  allowsPostLogoutRedirectUri(uri: string) {
    return this.postLogoutRedirectUris.includes(uri)
  }

  async verifySecret(secret: string | undefined) {
    if (this.type === 'public') return true
    if (!secret || !this.clientSecretHash) return false
    return hash.verify(this.clientSecretHash, secret)
  }
}
