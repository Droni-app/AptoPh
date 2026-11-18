import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'

vi.mock('@/router', () => ({
  default: { push: vi.fn<() => Promise<void>>(), currentRoute: { value: { fullPath: '/' } } },
}))

const SESSION_KEY = 'aptoph.backoffice.session'
const user = { id: 'u1', fullName: 'Ana Admin', email: 'ana@example.com', initials: 'AA' }

function respond(status: number, body: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  )
}

describe('auth store', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })
  afterEach(() => vi.unstubAllGlobals())

  it('logs in with email and password and keeps the token', async () => {
    const fetchMock = vi.fn<() => Promise<Response>>(() =>
      respond(200, {
        data: { token: 'oat_abc', type: 'bearer', expiresAt: '2999-01-01T00:00:00.000Z', user },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const auth = useAuthStore()
    await auth.login({ email: 'ana@example.com', password: 'secret-password' })

    const [url, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit]
    expect(String(url)).toMatch(/\/api\/v1\/auth\/login$/)
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toMatchObject({
      email: 'ana@example.com',
      device: 'Backoffice',
    })
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined()

    expect(auth.isAuthenticated).toBe(true)
    expect(auth.token).toBe('oat_abc')
    expect(auth.user?.fullName).toBe('Ana Admin')
    expect(JSON.parse(localStorage.getItem(SESSION_KEY)!)).toMatchObject({ token: 'oat_abc' })
  })

  it('sends the token as a bearer header', async () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ token: 'oat_abc', expiresAt: null }))
    const fetchMock = vi.fn<() => Promise<Response>>(() => respond(200, { data: user }))
    vi.stubGlobal('fetch', fetchMock)

    await useAuthStore().loadProfile()

    const [, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit]
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer oat_abc')
  })

  it('treats an expired token as signed out', () => {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ token: 'oat_old', expiresAt: '2000-01-01T00:00:00.000Z' }),
    )
    const auth = useAuthStore()
    expect(auth.isAuthenticated).toBe(false)
    expect(auth.token).toBeNull()
  })

  it('wrong credentials leave no session', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<() => Promise<Response>>(() =>
        respond(400, { errors: [{ message: 'El correo o la contraseña no son correctos' }] }),
      ),
    )
    const auth = useAuthStore()

    await expect(auth.login({ email: 'ana@example.com', password: 'nope' })).rejects.toThrow(
      'El correo o la contraseña no son correctos',
    )
    expect(auth.isAuthenticated).toBe(false)
  })
})
