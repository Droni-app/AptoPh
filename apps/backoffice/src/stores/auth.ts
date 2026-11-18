import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { ApiItem, OAuthTokens, UserProfile } from '@aptoph/shared'
import { config } from '@/lib/config'
import { api } from '@/lib/http'
import { codeChallengeFor, randomString } from '@/lib/pkce'
import { readJson, writeJson } from '@/lib/storage'

type Session = { accessToken: string; refreshToken: string; expiresAt: number }
type PendingAuthorization = { state: string; verifier: string; redirectTo: string }

const SESSION_KEY = 'aptoph.backoffice.session'
const PENDING_KEY = 'aptoph.backoffice.oauth'
/** Refresh the access token this long before it expires */
const EXPIRY_MARGIN_MS = 30_000

export class OAuthCallbackError extends Error {}

/**
 * OAuth 2.1 Authorization Code + PKCE against the AptoPH API.
 * See docs/authentication.md.
 */
export const useAuthStore = defineStore('auth', () => {
  const session = ref<Session | null>(readJson<Session>(localStorage, SESSION_KEY))
  const user = ref<UserProfile | null>(null)

  const isAuthenticated = computed(() => session.value !== null)

  function setSession(value: Session | null) {
    session.value = value
    writeJson(localStorage, SESSION_KEY, value)
  }

  function clear() {
    setSession(null)
    user.value = null
  }

  /**
   * Redirects the browser to the hosted login page
   */
  async function login(redirectTo = '/') {
    const verifier = randomString()
    const state = randomString(16)
    writeJson(sessionStorage, PENDING_KEY, { state, verifier, redirectTo } satisfies PendingAuthorization)

    const url = new URL(`${config.apiUrl}/oauth/authorize`)
    url.search = new URLSearchParams({
      response_type: 'code',
      client_id: config.oauth.clientId,
      redirect_uri: config.oauth.redirectUri,
      code_challenge: await codeChallengeFor(verifier),
      code_challenge_method: 'S256',
      state,
    }).toString()

    window.location.assign(url)
  }

  async function tokenRequest(params: Record<string, string>) {
    const response = await fetch(`${config.apiUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({ client_id: config.oauth.clientId, ...params }),
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new OAuthCallbackError(body.error_description ?? body.error ?? 'No se pudo iniciar sesión')
    }
    const tokens = body as OAuthTokens
    setSession({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
    })
  }

  /**
   * Handles /auth/callback. Returns the path to continue to.
   */
  async function handleCallback(query: URLSearchParams) {
    const pending = readJson<PendingAuthorization>(sessionStorage, PENDING_KEY)
    writeJson(sessionStorage, PENDING_KEY, null)

    if (query.get('error')) {
      throw new OAuthCallbackError(query.get('error_description') ?? 'Inicio de sesión cancelado')
    }
    const code = query.get('code')
    if (!pending || !code || query.get('state') !== pending.state) {
      throw new OAuthCallbackError('La respuesta de inicio de sesión no es válida. Intenta de nuevo.')
    }

    await tokenRequest({
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.oauth.redirectUri,
      code_verifier: pending.verifier,
    })
    return pending.redirectTo
  }

  let refreshing: Promise<boolean> | null = null

  /**
   * Rotates the refresh token. Concurrent calls share the same request,
   * since a refresh token can only be used once.
   */
  function refresh(): Promise<boolean> {
    if (!session.value) return Promise.resolve(false)
    refreshing ??= tokenRequest({ grant_type: 'refresh_token', refresh_token: session.value.refreshToken })
      .then(() => true)
      .catch(() => {
        clear()
        return false
      })
      .finally(() => {
        refreshing = null
      })
    return refreshing
  }

  async function getAccessToken() {
    if (!session.value) return null
    if (session.value.expiresAt - Date.now() < EXPIRY_MARGIN_MS) await refresh()
    return session.value?.accessToken ?? null
  }

  async function loadProfile() {
    const { data } = await api<ApiItem<UserProfile>>('/api/v1/account/profile', { tenant: false })
    user.value = data
    return data
  }

  /**
   * Revokes the tokens and ends the SSO session on the API
   */
  async function logout() {
    const refreshToken = session.value?.refreshToken
    clear()
    if (refreshToken) {
      await fetch(`${config.apiUrl}/oauth/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: config.oauth.clientId, token: refreshToken }),
      }).catch(() => undefined)
    }

    const url = new URL(`${config.apiUrl}/oauth/logout`)
    url.search = new URLSearchParams({
      client_id: config.oauth.clientId,
      post_logout_redirect_uri: config.oauth.postLogoutRedirectUri,
    }).toString()
    window.location.assign(url)
  }

  return {
    session,
    user,
    isAuthenticated,
    login,
    handleCallback,
    refresh,
    getAccessToken,
    loadProfile,
    logout,
    clear,
  }
})
