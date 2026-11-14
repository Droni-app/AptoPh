import { BaseSeeder } from '@adonisjs/lucid/seeders'
import env from '#start/env'
import OauthClient from '#models/oauth_client'

/**
 * Production data: the first-party OAuth clients with the public URLs of the
 * web apps (WEB_URL, BACKOFFICE_URL). Idempotent; runs on every deploy.
 */
export default class extends BaseSeeder {
  static environment = ['production']

  async run() {
    const webUrl = env.get('WEB_URL')
    const backofficeUrl = env.get('BACKOFFICE_URL')
    if (!webUrl || !backofficeUrl) {
      throw new Error('WEB_URL and BACKOFFICE_URL are required to seed the OAuth clients')
    }

    const client = (clientId: string, name: string, baseUrl: string) => {
      const origin = new URL(baseUrl).origin
      return {
        clientId,
        name,
        type: 'public' as const,
        redirectUris: [`${origin}/auth/callback`],
        postLogoutRedirectUris: [`${origin}/`],
      }
    }

    await OauthClient.updateOrCreateMany('clientId', [
      client('web', 'AptoPH Residentes', webUrl),
      client('backoffice', 'AptoPH Administración', backofficeUrl),
    ])
  }
}
