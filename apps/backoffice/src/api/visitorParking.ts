import type {
  ApiItem,
  ApiPaginated,
  ParkingEntryInput,
  ParkingExitInput,
  ParkingLookup,
  ParkingSettlement,
  ParkingStay,
  ParkingStayStatus,
  ParkingSummary,
  VehicleType,
  VisitorParkingSettings,
} from '@aptoph/shared'
import { api } from '@/lib/http'

const base = '/api/v1/visitor-parking'

export type StayFilters = {
  status?: ParkingStayStatus
  vehicleType?: VehicleType | ''
  settlement?: ParkingSettlement | ''
  overstay?: boolean
  from?: string
  to?: string
  search?: string
  page?: number
  perPage?: number
}

/** Visitor parking at the gate (docs/visitor-parking.md) */
export const visitorParkingApi = {
  summary: () => api<ApiItem<ParkingSummary>>(`${base}/summary`),
  settings: () => api<ApiItem<VisitorParkingSettings>>(`${base}/settings`),
  saveSettings: (body: VisitorParkingSettings) =>
    api<ApiItem<VisitorParkingSettings>>(`${base}/settings`, { method: 'PUT', body }),
  lookup: (q: string) => api<ApiItem<ParkingLookup>>(`${base}/lookup`, { query: { q } }),
  stays: (query: StayFilters) =>
    api<ApiPaginated<ParkingStay>>(`${base}/stays`, { query: { ...query } }),
  stay: (id: string) => api<ApiItem<ParkingStay>>(`${base}/stays/${id}`),
  enter: (body: ParkingEntryInput) =>
    api<ApiItem<ParkingStay>>(`${base}/stays`, { method: 'POST', body }),
  correct: (id: string, body: Partial<ParkingEntryInput>) =>
    api<ApiItem<ParkingStay>>(`${base}/stays/${id}`, { method: 'PATCH', body }),
  exit: (id: string, body: ParkingExitInput) =>
    api<ApiItem<ParkingStay>>(`${base}/stays/${id}/exit`, { method: 'POST', body }),
  sendReceipt: (id: string, email: string) =>
    api<ApiItem<ParkingStay>>(`${base}/stays/${id}/receipt`, { method: 'POST', body: { email } }),
}
