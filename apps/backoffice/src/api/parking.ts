import type {
  ApiItem,
  ApiPaginated,
  ParkingAssignInput,
  ParkingApplication,
  ParkingApplicationStatus,
  ParkingApplyInput,
  ParkingAssignment,
  ParkingAssignmentStatus,
  ParkingLottery,
  ParkingLotteryInput,
  ParkingEligibility,
  ParkingEndInput,
  ParkingOwnership,
  ParkingSettings,
  ParkingSpot,
  ParkingSpotBatchInput,
  ParkingSpotInput,
  ParkingSpotLookup,
  ParkingSpotsSummary,
  VehicleType,
} from '@aptoph/shared'
import { api } from '@/lib/http'

const base = '/api/v1/parking'

export type SpotFilters = {
  ownership?: ParkingOwnership | ''
  vehicleType?: VehicleType | ''
  state?: 'free' | 'assigned' | 'inactive' | ''
  search?: string
  page?: number
  perPage?: number
}

export type AssignmentFilters = {
  status?: ParkingAssignmentStatus | ''
  current?: boolean
  unitId?: string
  spotId?: string
  search?: string
  page?: number
  perPage?: number
}

/** Without empty filters: '' is not a valid value for the API */
const clean = (query: Record<string, string | number | boolean | undefined>) =>
  Object.fromEntries(
    Object.entries(query).filter(([, v]) => v !== '' && v !== undefined),
  ) as Record<string, string | number | boolean>

/** Parking of the conjunto: spots and assignments (docs/parking.md) */
export const parkingApi = {
  summary: () => api<ApiItem<ParkingSpotsSummary>>(`${base}/summary`),
  settings: () => api<ApiItem<ParkingSettings>>(`${base}/settings`),
  saveSettings: (body: ParkingSettings) =>
    api<ApiItem<ParkingSettings>>(`${base}/settings`, { method: 'PUT', body }),
  spots: (query: SpotFilters) =>
    api<ApiPaginated<ParkingSpot>>(`${base}/spots`, { query: clean(query) }),
  createSpot: (body: ParkingSpotInput) =>
    api<ApiItem<ParkingSpot>>(`${base}/spots`, { method: 'POST', body }),
  createBatch: (body: ParkingSpotBatchInput) =>
    api<ApiItem<{ created: number }>>(`${base}/spots/batch`, { method: 'POST', body }),
  importSpots: () => api<ApiItem<{ created: number }>>(`${base}/spots/import`, { method: 'POST' }),
  updateSpot: (id: string, body: Partial<ParkingSpotInput>) =>
    api<ApiItem<ParkingSpot>>(`${base}/spots/${id}`, { method: 'PATCH', body }),
  removeSpot: (id: string) => api<void>(`${base}/spots/${id}`, { method: 'DELETE' }),
  assignments: (query: AssignmentFilters) =>
    api<ApiPaginated<ParkingAssignment>>(`${base}/assignments`, { query: clean(query) }),
  eligibility: (unitId: string, vehicleType: VehicleType) =>
    api<ApiItem<ParkingEligibility>>(`${base}/eligibility`, { query: { unitId, vehicleType } }),
  assign: (body: ParkingAssignInput) =>
    api<ApiItem<ParkingAssignment> & { warnings: string[] }>(`${base}/assignments`, {
      method: 'POST',
      body,
    }),
  updateAssignment: (
    id: string,
    body: { vehicleId?: string | null; endsOn?: string | null; notes?: string | null },
  ) => api<ApiItem<ParkingAssignment>>(`${base}/assignments/${id}`, { method: 'PATCH', body }),
  endAssignment: (id: string, body: ParkingEndInput) =>
    api<
      ApiItem<ParkingAssignment> & {
        credited: number
        paidPeriods: string[]
        offeredTo: { applicationId: string; unitId: string } | null
      }
    >(`${base}/assignments/${id}/end`, { method: 'POST', body }),
  lookup: (q: string) => api<ApiItem<ParkingSpotLookup>>(`${base}/lookup`, { query: { q } }),

  // Sorteo
  lotteries: () => api<{ data: ParkingLottery[] }>(`${base}/lotteries`),
  lottery: (id: string) => api<ApiItem<ParkingLottery>>(`${base}/lotteries/${id}`),
  createLottery: (body: ParkingLotteryInput) =>
    api<ApiItem<ParkingLottery> & { warning: string | null }>(`${base}/lotteries`, {
      method: 'POST',
      body,
    }),
  updateLottery: (id: string, body: Partial<ParkingLotteryInput>) =>
    api<ApiItem<ParkingLottery>>(`${base}/lotteries/${id}`, { method: 'PATCH', body }),
  cancelLottery: (id: string) =>
    api<ApiItem<ParkingLottery>>(`${base}/lotteries/${id}/cancel`, { method: 'POST' }),
  drawLottery: (id: string) =>
    api<ApiItem<ParkingLottery>>(`${base}/lotteries/${id}/draw`, { method: 'POST' }),
  offerFree: (id: string) =>
    api<{ offered: number }>(`${base}/lotteries/${id}/offer`, { method: 'POST' }),
  applications: (id: string, query: ApplicationFilters = {}) =>
    api<{ data: ParkingApplication[] }>(`${base}/lotteries/${id}/applications`, {
      query: clean(query),
    }),
  applyFor: (id: string, body: ParkingApplyInput) =>
    api<ApiItem<ParkingApplication>>(`${base}/lotteries/${id}/applications`, {
      method: 'POST',
      body,
    }),
  withdrawApplication: (id: string) =>
    api<ApiItem<ParkingApplication>>(`${base}/applications/${id}/withdraw`, { method: 'POST' }),
  assignApplication: (id: string, spotId: string) =>
    api<ApiItem<ParkingApplication>>(`${base}/applications/${id}/assign`, {
      method: 'POST',
      body: { spotId },
    }),
}

export type ApplicationFilters = {
  status?: ParkingApplicationStatus | ''
  vehicleType?: VehicleType | ''
  search?: string
}
