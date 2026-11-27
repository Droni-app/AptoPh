import type { ApiClient, ApiResponse } from '@japa/api-client'
import type { EnrollmentRole } from '@aptoph/shared'
import Unit from '#models/property/unit'
import type Tenant from '#models/tenants/tenant'
import type User from '#models/auth/user'
import { createMember } from '#tests/helpers'

export type Finance = Awaited<ReturnType<typeof financeSetup>>

/**
 * A conjunto with three apartments (coefficients 0.5 / 0.3 / 0.2), a parking
 * spot annexed to the first one, a bank account and a monthly fee of
 * $1.000.000 split by coefficient from January 2026.
 */
export async function financeSetup(client: ApiClient, options: { fees?: boolean } = {}) {
  const { tenant, user } = await createMember('administrator')
  const [a, b, c] = await Promise.all(
    [
      ['101', '0.500000', '80.00'],
      ['102', '0.300000', '48.00'],
      ['103', '0.200000', '32.00'],
    ].map(([code, ownershipCoefficient, privateArea]) =>
      Unit.create({
        tenantId: tenant.id,
        code,
        type: 'apartment',
        ownershipCoefficient,
        privateArea,
        status: 'occupied',
      })
    )
  )
  const parking = await Unit.create({
    tenantId: tenant.id,
    code: 'P-01',
    type: 'parking',
    ownershipCoefficient: '0',
    privateArea: '12.00',
    status: 'occupied',
    parentUnitId: a!.id,
  })

  const api = apiFor(client, tenant, user)
  const bank = await api.post('/finance/cash-accounts', {
    name: 'Banco principal',
    type: 'bank',
    bankName: 'Banco',
    accountKind: 'savings',
    openingBalance: 2_000_000,
    openingDate: '2025-12-31',
  })
  bank.assertStatus(201)

  const concepts = (await dataOf(api.get('/finance/concepts'))) as Array<{
    id: string
    code: string
  }>
  const concept = (code: string) => concepts.find((row) => row.code === code)!.id

  if (options.fees !== false) {
    const fees = await api.post('/finance/fee-schedules', {
      conceptId: concept('ordinary_fee'),
      method: 'coefficient',
      effectiveFrom: '2026-01',
      monthlyTotal: 1_000_000,
      unitTypes: ['apartment'],
      rounding: 100,
      roundingMode: 'nearest',
    })
    fees.assertStatus(201)
  }

  return {
    tenant,
    user,
    api,
    units: { a: a!, b: b!, c: c!, parking },
    bankId: bank.body().data.id as string,
    concept,
  }
}

/** A response whose body is not typed (the finance routes return plain objects) */
type Response = Omit<ApiResponse, 'body'> & { body(): any }

/** Awaits a request and checks its status */
export async function expectStatus(request: Promise<Response>, status: number) {
  const response = await request
  response.assertStatus(status)
  return response
}

/** The `data` of a response */
export async function dataOf(request: Promise<Response>) {
  const response = await request
  return response.body().data
}

/** Requests as `user` in `tenant` */
export function apiFor(client: ApiClient, tenant: Tenant, user: User) {
  const as = (request: any) =>
    request.loginAs(user).header('X-Tenant-Id', tenant.id) as Promise<Response>
  return {
    get: (path: string, qs: Record<string, unknown> = {}) =>
      as(client.get(`/api/v1${path}`).qs(qs)),
    post: (path: string, body: Record<string, unknown> = {}) =>
      as(client.post(`/api/v1${path}`).json(body)),
    put: (path: string, body: Record<string, unknown> = {}) =>
      as(client.put(`/api/v1${path}`).json(body)),
    patch: (path: string, body: Record<string, unknown> = {}) =>
      as(client.patch(`/api/v1${path}`).json(body)),
  }
}

export async function memberApi(client: ApiClient, tenant: Tenant, role: EnrollmentRole) {
  const { user } = await createMember(role, tenant)
  return { user, api: apiFor(client, tenant, user) }
}

/** Open balance of a unit's charges, in pesos */
export async function unitCharges(api: Finance['api'], unitId: string) {
  const response = await api.get('/finance/charges', { unitId, perPage: 200 })
  return response.body().data as Array<{
    id: string
    amount: string
    balance: string
    status: string
    period: string
    concept: { type: string; name: string }
    description: string | null
  }>
}

export async function trialBalanceIsBalanced(api: Finance['api']) {
  const response = await api.get('/finance/reports/trial-balance', {
    from: '2025-01-01',
    to: '2026-12-31',
  })
  const { totals } = response.body().data
  return totals.debit === totals.credit
}

export async function accountBalance(api: Finance['api'], code: string) {
  const response = await api.get('/finance/reports/trial-balance', {
    from: '2025-01-01',
    to: '2026-12-31',
  })
  const row = (response.body().data.rows as Array<{ code: string; closing: string }>).find(
    (r) => r.code === code
  )
  return row?.closing ?? '0.00'
}
