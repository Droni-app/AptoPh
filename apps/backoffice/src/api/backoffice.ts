import type {
  ApiItem,
  BillingCharge,
  BillingConfig,
  BillingCycle,
  BillingOverview,
  ChargeRequestResult,
  PaymentMethodInput,
  PaymentTokenStatus,
  SubscriptionSummary,
  ApiPaginated,
  Building,
  DashboardSummary,
  InviteMemberInput,
  Member,
  MemberStatusChange,
  EnrollmentStatus,
  TenantSettings,
  TenantSettingsInput,
  Unit,
  UpdateMemberInput,
  UnitOccupant,
  UnitStatus,
  UnitType,
} from '@aptoph/shared'
import { api } from '@/lib/http'

export type BuildingInput = { name: string; floors?: number | null; sortOrder?: number }

export type UnitInput = {
  buildingId?: string | null
  code: string
  type?: UnitType
  floor?: number | null
  privateArea?: number | null
  ownershipCoefficient?: number
  parentUnitId?: string | null
  status?: UnitStatus
  notes?: string | null
}

export type UnitFilters = {
  page?: number
  perPage?: number
  buildingId?: string
  type?: UnitType | ''
  status?: UnitStatus | ''
  search?: string
}

export type OccupantInput = Partial<Omit<UnitOccupant, 'id' | 'unitId' | 'userId' | 'createdAt'>>

export const dashboardApi = {
  summary: () => api<ApiItem<DashboardSummary>>('/api/v1/dashboard'),
}

export const buildingsApi = {
  list: () => api<{ data: Building[] }>('/api/v1/buildings'),
  create: (input: BuildingInput) =>
    api<ApiItem<Building>>('/api/v1/buildings', { method: 'POST', body: input }),
  update: (id: string, input: Partial<BuildingInput>) =>
    api<ApiItem<Building>>(`/api/v1/buildings/${id}`, { method: 'PATCH', body: input }),
  remove: (id: string) => api<void>(`/api/v1/buildings/${id}`, { method: 'DELETE' }),
}

export const unitsApi = {
  list: (filters: UnitFilters) => api<ApiPaginated<Unit>>('/api/v1/units', { query: filters }),
  show: (id: string) => api<ApiItem<Unit>>(`/api/v1/units/${id}`),
  create: (input: UnitInput) =>
    api<ApiItem<Unit>>('/api/v1/units', { method: 'POST', body: input }),
  update: (id: string, input: Partial<UnitInput>) =>
    api<ApiItem<Unit>>(`/api/v1/units/${id}`, { method: 'PATCH', body: input }),
  remove: (id: string) => api<void>(`/api/v1/units/${id}`, { method: 'DELETE' }),
}

export const occupantsApi = {
  create: (unitId: string, input: OccupantInput) =>
    api<ApiItem<UnitOccupant>>(`/api/v1/units/${unitId}/occupants`, {
      method: 'POST',
      body: input,
    }),
  update: (unitId: string, id: string, input: OccupantInput) =>
    api<ApiItem<UnitOccupant>>(`/api/v1/units/${unitId}/occupants/${id}`, {
      method: 'PATCH',
      body: input,
    }),
  remove: (unitId: string, id: string) =>
    api<void>(`/api/v1/units/${unitId}/occupants/${id}`, { method: 'DELETE' }),
}

export type MemberFilters = {
  group?: 'staff' | 'residents'
  status?: EnrollmentStatus | ''
  search?: string
  page?: number
  perPage?: number
}

export const membersApi = {
  list: (query: MemberFilters) => api<ApiPaginated<Member>>('/api/v1/members', { query }),
  invite: (input: InviteMemberInput) =>
    api<ApiItem<Member>>('/api/v1/members', { method: 'POST', body: input }),
  update: (id: string, input: UpdateMemberInput) =>
    api<ApiItem<Member>>(`/api/v1/members/${id}`, { method: 'PATCH', body: input }),
  changeStatus: (id: string, status: MemberStatusChange) =>
    api<ApiItem<Member>>(`/api/v1/members/${id}/status`, { method: 'PATCH', body: { status } }),
  resendInvitation: (id: string) =>
    api<ApiItem<Member>>(`/api/v1/members/${id}/invitation`, { method: 'POST' }),
}

export const settingsApi = {
  tenant: () => api<ApiItem<TenantSettings>>('/api/v1/settings/tenant'),
  updateTenant: (input: TenantSettingsInput) =>
    api<ApiItem<TenantSettings>>('/api/v1/settings/tenant', { method: 'PATCH', body: input }),
}

export const subscriptionApi = {
  show: () => api<ApiItem<SubscriptionSummary>>('/api/v1/subscription'),
}

/** Payments of the conjunto to AptoPH with Wompi (administration). docs/billing.md */
export const billingApi = {
  show: () => api<ApiItem<BillingOverview>>('/api/v1/billing'),
  config: () => api<ApiItem<BillingConfig>>('/api/v1/billing/config'),
  savePaymentMethod: (body: PaymentMethodInput) =>
    api<ApiItem<BillingOverview>>('/api/v1/billing/payment-method', { method: 'PUT', body }),
  removePaymentMethod: () =>
    api<ApiItem<BillingOverview>>('/api/v1/billing/payment-method', { method: 'DELETE' }),
  nequiToken: (phoneNumber: string) =>
    api<ApiItem<PaymentTokenStatus>>('/api/v1/billing/tokens/nequi', {
      method: 'POST',
      body: { phoneNumber },
    }),
  daviplataToken: (body: { documentType: string; documentNumber: string; phoneNumber: string }) =>
    api<ApiItem<PaymentTokenStatus>>('/api/v1/billing/tokens/daviplata', { method: 'POST', body }),
  daviplataOtp: (body: { handle: string; code?: string }) =>
    api<ApiItem<PaymentTokenStatus>>('/api/v1/billing/tokens/daviplata/otp', {
      method: 'POST',
      body,
    }),
  bancolombiaToken: () =>
    api<ApiItem<PaymentTokenStatus>>('/api/v1/billing/tokens/bancolombia', { method: 'POST' }),
  tokenStatus: (type: 'nequi' | 'daviplata' | 'bancolombia_transfer', id: string) =>
    api<ApiItem<PaymentTokenStatus>>(`/api/v1/billing/tokens/${type}/${encodeURIComponent(id)}`),
  paySubscription: (billingCycle: BillingCycle) =>
    api<ApiItem<BillingCharge>>('/api/v1/billing/subscription/pay', {
      method: 'POST',
      body: { billingCycle },
    }),
  setAutoRenew: (enabled: boolean) =>
    api<ApiItem<BillingOverview>>('/api/v1/billing/subscription/auto-renew', {
      method: 'PUT',
      body: { enabled },
    }),
  charge: (id: string) => api<ApiItem<BillingCharge>>(`/api/v1/billing/charges/${id}`),
  buyEmailPacks: (packs: number) =>
    api<ApiItem<ChargeRequestResult>>('/api/v1/email-quota/packs', {
      method: 'POST',
      body: { packs },
    }),
}
