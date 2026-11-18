import type {
  ApiItem,
  DocumentType,
  HouseholdMember,
  HouseholdRelationship,
  PetSpecies,
  ResidentAmenity,
  ResidentBooking,
  ResidentHome,
  ResidentParcel,
  ResidentPet,
  ResidentTicket,
  ResidentTicketComment,
  ResidentTicketDetail,
  ResidentUnitDetail,
  ResidentVehicle,
  ResidentVisit,
  TicketType,
  VehicleType,
  VisitType,
} from '@aptoph/shared'
import { api } from '@/lib/http'

/**
 * Resident endpoints (/api/v1/resident/*). Dates go out as ISO strings with offset.
 */
const base = '/api/v1/resident'
type List<T> = { data: T[] }

export type VehicleInput = {
  plate: string
  type: VehicleType
  brand: string | null
  model: string | null
  color: string | null
}
export type PetInput = {
  name: string
  species: PetSpecies
  breed: string | null
  isPotentiallyDangerous: boolean
}
export type HouseholdInput = {
  fullName: string
  relationship: HouseholdRelationship
  documentType: DocumentType | null
  documentNumber: string | null
  phone: string | null
}
export type VisitInput = {
  unitId: string
  visitorName: string
  visitorDocument: string | null
  vehiclePlate: string | null
  type: VisitType
  expectedAt: string
}
export type BookingInput = {
  amenityId: string
  unitId: string
  startsAt: string
  endsAt: string
  guestsCount: number | null
}
export type TicketInput = {
  unitId: string | null
  type: TicketType
  subject: string
  description: string
}

export const residentApi = {
  home: () => api<ApiItem<ResidentHome>>(`${base}/home`),
  unit: (id: string) => api<ApiItem<ResidentUnitDetail>>(`${base}/units/${encodeURIComponent(id)}`),

  vehicles: {
    create: (unitId: string, body: VehicleInput) =>
      api<ApiItem<ResidentVehicle>>(`${base}/units/${unitId}/vehicles`, { method: 'POST', body }),
    update: (id: string, body: Partial<VehicleInput>) =>
      api<ApiItem<ResidentVehicle>>(`${base}/vehicles/${id}`, { method: 'PATCH', body }),
    remove: (id: string) => api<void>(`${base}/vehicles/${id}`, { method: 'DELETE' }),
  },
  pets: {
    create: (unitId: string, body: PetInput) =>
      api<ApiItem<ResidentPet>>(`${base}/units/${unitId}/pets`, { method: 'POST', body }),
    update: (id: string, body: Partial<PetInput>) =>
      api<ApiItem<ResidentPet>>(`${base}/pets/${id}`, { method: 'PATCH', body }),
    remove: (id: string) => api<void>(`${base}/pets/${id}`, { method: 'DELETE' }),
  },
  household: {
    create: (unitId: string, body: HouseholdInput) =>
      api<ApiItem<HouseholdMember>>(`${base}/units/${unitId}/household`, { method: 'POST', body }),
    update: (id: string, body: Partial<HouseholdInput>) =>
      api<ApiItem<HouseholdMember>>(`${base}/household/${id}`, { method: 'PATCH', body }),
    remove: (id: string) => api<void>(`${base}/household/${id}`, { method: 'DELETE' }),
  },
  visits: {
    list: () => api<List<ResidentVisit>>(`${base}/visits`),
    create: (body: VisitInput) =>
      api<ApiItem<ResidentVisit>>(`${base}/visits`, { method: 'POST', body }),
    cancel: (id: string) => api<void>(`${base}/visits/${id}`, { method: 'DELETE' }),
  },
  parcels: () => api<List<ResidentParcel>>(`${base}/parcels`),
  amenities: () => api<List<ResidentAmenity>>(`${base}/amenities`),
  bookings: {
    list: () => api<List<ResidentBooking>>(`${base}/bookings`),
    create: (body: BookingInput) =>
      api<ApiItem<ResidentBooking>>(`${base}/bookings`, { method: 'POST', body }),
    cancel: (id: string) =>
      api<ApiItem<ResidentBooking>>(`${base}/bookings/${id}`, { method: 'DELETE' }),
  },
  tickets: {
    list: () => api<List<ResidentTicket>>(`${base}/tickets`),
    show: (id: string) =>
      api<ApiItem<ResidentTicketDetail>>(`${base}/tickets/${encodeURIComponent(id)}`),
    create: (body: TicketInput) =>
      api<ApiItem<ResidentTicketDetail>>(`${base}/tickets`, { method: 'POST', body }),
    comment: (id: string, body: string) =>
      api<ApiItem<ResidentTicketComment>>(`${base}/tickets/${id}/comments`, {
        method: 'POST',
        body: { body },
      }),
  },
}
