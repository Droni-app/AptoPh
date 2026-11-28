import type { ApiErrorBody } from '@aptoph/shared'
import { config } from '@/lib/config'
import { useAuthStore } from '@/stores/auth'
import { useTenantStore } from '@/stores/tenant'
import router from '@/router'

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: ApiErrorBody | null,
  ) {
    super(body?.errors?.[0]?.message ?? `Error ${status}`)
  }

  /** Field → message map for 422 validation errors */
  get fieldErrors(): Record<string, string> {
    const errors: Record<string, string> = {}
    for (const error of this.body?.errors ?? []) {
      if (error.field && !errors[error.field]) errors[error.field] = error.message
    }
    return errors
  }
}

type Query = Record<string, string | number | boolean | null | undefined>

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  /** JSON body, or a FormData for file uploads */
  body?: unknown
  query?: Query
  /** Send the active tenant in `X-Tenant-Id` (default: true) */
  tenant?: boolean
  /** Send the access token, and treat a 401 as an expired session (default: true) */
  auth?: boolean
}

function buildUrl(path: string, query?: Query) {
  const url = new URL(`${config.apiUrl}${path}`)
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '')
      url.searchParams.set(key, String(value))
  }
  return url
}

/**
 * Calls the API with the user's access token and the active tenant header.
 */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const auth = useAuthStore()
  const tenant = useTenantStore()

  const send = async () => {
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (options.auth !== false && auth.token) headers.Authorization = `Bearer ${auth.token}`
    if (options.tenant !== false && tenant.currentId) headers['X-Tenant-Id'] = tenant.currentId
    // FormData (file uploads) sets its own multipart Content-Type with the boundary
    const isForm = options.body instanceof FormData
    if (options.body !== undefined && !isForm) headers['Content-Type'] = 'application/json'

    return fetch(buildUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers,
      body:
        options.body === undefined
          ? undefined
          : isForm
            ? (options.body as FormData)
            : JSON.stringify(options.body),
    })
  }

  const response = await send()

  // Expired or revoked token: back to the login page
  if (response.status === 401 && options.auth !== false) {
    auth.clear()
    await router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } })
    throw new ApiError(401, null)
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null
    throw new ApiError(response.status, body)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

/**
 * Downloads a file the API builds (receipts, certificates) with the user's
 * session and the active tenant, and hands it to the browser as `filename`.
 */
export async function apiDownload(path: string, filename: string) {
  const auth = useAuthStore()
  const tenant = useTenantStore()
  const headers: Record<string, string> = {}
  if (auth.token) headers.Authorization = `Bearer ${auth.token}`
  if (tenant.currentId) headers['X-Tenant-Id'] = tenant.currentId
  const response = await fetch(buildUrl(path), { headers })
  if (response.status === 401) {
    auth.clear()
    await router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } })
    throw new ApiError(401, null)
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null
    throw new ApiError(response.status, body)
  }
  const url = URL.createObjectURL(await response.blob())
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
