import type {
  ApiItem,
  ApiPaginated,
  Building,
  DashboardSummary,
  Member,
  Unit,
  UnitOccupant,
  UnitStatus,
  UnitType,
} from '@apartadock/shared'
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
  create: (input: UnitInput) => api<ApiItem<Unit>>('/api/v1/units', { method: 'POST', body: input }),
  update: (id: string, input: Partial<UnitInput>) =>
    api<ApiItem<Unit>>(`/api/v1/units/${id}`, { method: 'PATCH', body: input }),
  remove: (id: string) => api<void>(`/api/v1/units/${id}`, { method: 'DELETE' }),
}

export const occupantsApi = {
  create: (unitId: string, input: OccupantInput) =>
    api<ApiItem<UnitOccupant>>(`/api/v1/units/${unitId}/occupants`, { method: 'POST', body: input }),
  update: (unitId: string, id: string, input: OccupantInput) =>
    api<ApiItem<UnitOccupant>>(`/api/v1/units/${unitId}/occupants/${id}`, {
      method: 'PATCH',
      body: input,
    }),
  remove: (unitId: string, id: string) =>
    api<void>(`/api/v1/units/${unitId}/occupants/${id}`, { method: 'DELETE' }),
}

export const membersApi = {
  list: (query: { group?: 'staff' | 'residents'; page?: number; perPage?: number }) =>
    api<ApiPaginated<Member>>('/api/v1/members', { query }),
}
