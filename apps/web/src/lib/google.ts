import { ref } from 'vue'
import type {
  ApiItem,
  GoogleAuthApp,
  GoogleAuthIntent,
  GoogleAuthResult,
  GoogleAuthStart,
} from '@aptoph/shared'
import { api } from '@/lib/http'
import { readJson, writeJson } from '@/lib/storage'

/** This app, for the API: Google sends the browser back to `<this app>/auth/google` */
const APP: GoogleAuthApp = 'web'
const PENDING_KEY = 'aptoph.google.pending'

type Pending = { state: string; intent: GoogleAuthIntent; redirect: string | null }

/** Whether the API has the Google credentials (the button is hidden otherwise) */
export const googleEnabled = ref<boolean | null>(null)
let checking: Promise<void> | null = null

export function checkGoogle() {
  checking ??= api<ApiItem<{ google: boolean }>>('/api/v1/auth/providers', {
    tenant: false,
    auth: false,
  })
    .then(({ data }) => {
      googleEnabled.value = data.google
    })
    .catch(() => {
      googleEnabled.value = false
      checking = null
    })
  return checking
}

/** Sends the browser to Google; it comes back to /auth/google */
export async function startGoogle(intent: GoogleAuthIntent, redirect?: string | null) {
  const { data } = await api<ApiItem<GoogleAuthStart>>('/api/v1/auth/google/url', {
    query: { app: APP, intent },
    tenant: false,
    auth: false,
  })
  writeJson(sessionStorage, PENDING_KEY, {
    state: data.state,
    intent,
    redirect: redirect ?? null,
  } satisfies Pending)
  window.location.assign(data.url)
}

/**
 * The login this tab started, if Google came back with its state (a page opened
 * from another site, or with an old link, does not match)
 */
export function takePending(state: string): Pending | null {
  const pending = readJson<Pending>(sessionStorage, PENDING_KEY)
  writeJson(sessionStorage, PENDING_KEY, null)
  return pending && pending.state === state ? pending : null
}

export function finishGoogle(code: string, state: string, device: string) {
  return api<ApiItem<GoogleAuthResult>>('/api/v1/auth/google', {
    method: 'POST',
    body: { code, state, device },
    tenant: false,
    auth: false,
  })
}
