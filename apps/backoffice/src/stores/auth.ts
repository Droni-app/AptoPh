import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type {
  ApiItem,
  AuthSession,
  LoginInput,
  SignupInput,
  SignupSession,
  UserProfile,
} from '@aptoph/shared'
import { api } from '@/lib/http'
import { readJson, writeJson } from '@/lib/storage'

type Session = { token: string; expiresAt: string | null }

const SESSION_KEY = 'aptoph.backoffice.session'
/** Label of the token in the API (auth_access_tokens.name) */
const DEVICE = 'Backoffice'

/**
 * Email + password session with an AdonisJS access token (see docs/authentication.md).
 * The token lives in localStorage until it expires or the user signs out.
 */
export const useAuthStore = defineStore('auth', () => {
  // Ignores anything else stored under the key (e.g. an old OAuth session)
  const stored = readJson<Session>(localStorage, SESSION_KEY)
  const session = ref<Session | null>(typeof stored?.token === 'string' ? stored : null)
  const user = ref<UserProfile | null>(null)

  const isAuthenticated = computed(() => {
    if (!session.value) return false
    return !session.value.expiresAt || new Date(session.value.expiresAt).getTime() > Date.now()
  })
  const token = computed(() => (isAuthenticated.value ? session.value!.token : null))

  function start(data: AuthSession) {
    session.value = { token: data.token, expiresAt: data.expiresAt }
    writeJson(localStorage, SESSION_KEY, session.value)
    user.value = data.user
  }

  function clear() {
    session.value = null
    user.value = null
    writeJson(localStorage, SESSION_KEY, null)
  }

  async function login(input: Omit<LoginInput, 'device'>) {
    const { data } = await api<ApiItem<AuthSession>>('/api/v1/auth/login', {
      method: 'POST',
      body: { ...input, device: DEVICE },
      tenant: false,
      auth: false,
    })
    start(data)
    return data
  }

  /** Creates the administrator's account, the conjunto and the trial */
  async function signup(input: Omit<SignupInput, 'device'>) {
    const { data } = await api<ApiItem<SignupSession>>('/api/v1/auth/signup', {
      method: 'POST',
      body: { ...input, device: DEVICE },
      tenant: false,
      auth: false,
    })
    start(data)
    return data
  }

  async function loadProfile() {
    const { data } = await api<ApiItem<UserProfile>>('/api/v1/account/profile', { tenant: false })
    user.value = data
    return data
  }

  /** Revokes the token on the API (best effort) and goes back to the login page */
  async function logout() {
    if (token.value) {
      await api('/api/v1/auth/logout', { method: 'POST', tenant: false }).catch(() => undefined)
    }
    clear()
    window.location.assign('/login')
  }

  /** The profile changed (edited, email confirmed): keep the menu up to date */
  function setUser(profile: UserProfile) {
    user.value = profile
  }

  return {
    session,
    user,
    token,
    isAuthenticated,
    device: DEVICE,
    start,
    setUser,
    login,
    signup,
    loadProfile,
    logout,
    clear,
  }
})
