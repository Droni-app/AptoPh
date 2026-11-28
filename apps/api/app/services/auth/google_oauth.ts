import { randomBytes } from 'node:crypto'
import encryption from '@adonisjs/core/services/encryption'
import type { GoogleAuthApp, GoogleAuthIntent } from '@aptoph/shared'
import env from '#start/env'
import { appUrl } from '#services/app_urls'

const AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const ISSUERS = ['accounts.google.com', 'https://accounts.google.com']
const STATE_PURPOSE = 'google_oauth_state'
const TICKET_PURPOSE = 'google_signup'

export type GoogleState = { app: GoogleAuthApp; intent: GoogleAuthIntent; nonce: string }

/** The Google account, from the ID token */
export type GoogleProfile = {
  subject: string
  email: string
  emailVerified: boolean
  fullName: string
}

export class GoogleAuthError extends Error {}

type TokenResponse = { id_token?: string; error?: string; error_description?: string }

/**
 * "Sign in with Google" with the authorization code flow. The web app sends the
 * browser to Google and receives the code on its own page (`/auth/google`); the
 * API exchanges the code with the client secret, which never leaves the server.
 */
export class GoogleOAuth {
  /** Swappable in tests: posts the code to Google's token endpoint */
  static requestToken = async (body: URLSearchParams): Promise<TokenResponse> => {
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    return (await response.json()) as TokenResponse
  }

  static get clientId() {
    return env.get('GOOGLE_CLIENT_ID') || null
  }

  static get enabled() {
    return Boolean(GoogleOAuth.clientId && env.get('GOOGLE_CLIENT_SECRET'))
  }

  /** Google returns the browser here; it must be listed in the OAuth client */
  static redirectUri(app: GoogleAuthApp) {
    return new URL('/auth/google', appUrl(app)).toString()
  }

  /** The Google page to open, with a state that only this API can read */
  static start(app: GoogleAuthApp, intent: GoogleAuthIntent) {
    const nonce = randomBytes(16).toString('base64url')
    const state = String(
      encryption.encrypt({ app, intent, nonce } satisfies GoogleState, '10 minutes', STATE_PURPOSE)
    )
    const url = new URL(AUTHORIZE_URL)
    url.searchParams.set('client_id', GoogleOAuth.clientId!)
    url.searchParams.set('redirect_uri', GoogleOAuth.redirectUri(app))
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('scope', 'openid email profile')
    url.searchParams.set('state', state)
    url.searchParams.set('nonce', nonce)
    url.searchParams.set('prompt', 'select_account')
    return { url: url.toString(), state }
  }

  static readState(state: string) {
    return encryption.decrypt<GoogleState>(state, STATE_PURPOSE)
  }

  /** Exchanges the code for the ID token and checks it was issued to us, for this login */
  static async profile(code: string, state: GoogleState): Promise<GoogleProfile> {
    const body = new URLSearchParams({
      code,
      client_id: GoogleOAuth.clientId!,
      client_secret: env.get('GOOGLE_CLIENT_SECRET')!,
      redirect_uri: GoogleOAuth.redirectUri(state.app),
      grant_type: 'authorization_code',
    })
    const response = await GoogleOAuth.requestToken(body)
    if (!response.id_token) throw new GoogleAuthError(response.error ?? 'no id_token')

    // Received straight from Google over TLS: the claims are checked, not the
    // signature (OpenID Connect Core 3.1.3.7)
    const claims = decodeJwt(response.id_token)
    const now = Math.floor(Date.now() / 1000)
    if (
      !ISSUERS.includes(String(claims.iss)) ||
      claims.aud !== GoogleOAuth.clientId ||
      typeof claims.exp !== 'number' ||
      claims.exp < now ||
      claims.nonce !== state.nonce ||
      typeof claims.sub !== 'string' ||
      typeof claims.email !== 'string'
    ) {
      throw new GoogleAuthError('invalid id_token')
    }
    const email = claims.email.trim().toLowerCase()
    return {
      subject: claims.sub,
      email,
      emailVerified: claims.email_verified === true || claims.email_verified === 'true',
      fullName: typeof claims.name === 'string' && claims.name.trim() ? claims.name.trim() : email,
    }
  }

  /** The Google account, encrypted for 30 minutes, to finish the sign-up */
  static ticket(profile: GoogleProfile) {
    return String(encryption.encrypt(profile, '30 minutes', TICKET_PURPOSE))
  }

  static readTicket(ticket: string) {
    return encryption.decrypt<GoogleProfile>(ticket, TICKET_PURPOSE)
  }
}

function decodeJwt(token: string): Record<string, unknown> {
  const payload = token.split('.')[1]
  if (!payload) throw new GoogleAuthError('malformed id_token')
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  } catch {
    throw new GoogleAuthError('malformed id_token')
  }
}
