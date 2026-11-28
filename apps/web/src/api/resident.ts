import type {
  ResidentSurveyDetail,
  ResidentSurveyItem,
  SurveyVoteInput,
  ApiPaginated,
  DocumentCategory,
  DocumentDetail,
  DocumentFolder,
  DocumentItem,
  Amenity,
  AmenityAvailability,
  ApiItem,
  Booking,
  BookingCreateInput,
  BookingQuote,
  ParkingApplication,
  ParkingApplyInput,
  ResidentParkingOverview,
  ResidentAnnouncement,
  ResidentAnnouncementDetail,
  Attachment,
  DocumentType,
  HouseholdMember,
  HouseholdRelationship,
  PetSpecies,
  ResidentHome,
  ResidentParcel,
  ResidentPayment,
  ReportPaymentInput,
  UnitStatement,
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
/** A booking with its receipts and the area's terms */
export type ResidentBookingDetail = Booking & { attachments: Attachment[]; terms: string | null }

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
export type TicketInput = {
  unitId: string | null
  type: TicketType
  subject: string
  description: string
}

export const residentApi = {
  home: () => api<ApiItem<ResidentHome>>(`${base}/home`),
  unit: (id: string) => api<ApiItem<ResidentUnitDetail>>(`${base}/units/${encodeURIComponent(id)}`),

  finance: {
    statement: (unitId: string, query: { from?: string; to?: string } = {}) =>
      api<ApiItem<UnitStatement>>(`${base}/units/${encodeURIComponent(unitId)}/statement`, {
        query,
      }),
    payments: () => api<List<ResidentPayment>>(`${base}/payments`),
    report: (unitId: string, body: ReportPaymentInput) =>
      api<ApiItem<ResidentPayment>>(`${base}/units/${encodeURIComponent(unitId)}/payments`, {
        method: 'POST',
        body,
      }),
    /** Receipt of a payment the resident reported (still in review) */
    attach: (paymentId: string, file: File) => {
      const body = new FormData()
      body.append('file', file)
      return api<ApiItem<Attachment>>(`${base}/payments/${paymentId}/attachments`, {
        method: 'POST',
        body,
      })
    },
    /** Signed link that expires in a few minutes */
    attachmentUrl: (id: string, download = false) =>
      api<ApiItem<{ url: string }>>(`${base}/attachments/${id}/url`, { query: { download } }),
    detach: (id: string) => api<void>(`${base}/attachments/${id}`, { method: 'DELETE' }),
  },

  announcements: {
    list: () => api<List<ResidentAnnouncement>>(`${base}/announcements`),
    /** Opening it marks it as read */
    show: (id: string) =>
      api<ApiItem<ResidentAnnouncementDetail>>(`${base}/announcements/${encodeURIComponent(id)}`),
    attachmentUrl: (id: string, download = false) =>
      api<ApiItem<{ url: string }>>(`${base}/announcements/attachments/${id}/url`, {
        query: { download },
      }),
  },

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
  parking: {
    overview: () => api<ApiItem<ResidentParkingOverview>>(`${base}/parking`),
    apply: (body: ParkingApplyInput) =>
      api<ApiItem<ParkingApplication>>(`${base}/parking/applications`, { method: 'POST', body }),
    respond: (id: string, action: 'withdraw' | 'accept' | 'decline') =>
      api<ApiItem<ParkingApplication>>(`${base}/parking/applications/${id}/${action}`, {
        method: 'POST',
      }),
  },
  parcels: () => api<List<ResidentParcel>>(`${base}/parcels`),
  amenities: () => api<List<Amenity>>(`${base}/amenities`),
  availability: (amenityId: string, from: string, to: string) =>
    api<ApiItem<AmenityAvailability>>(`${base}/amenities/${amenityId}/availability`, {
      query: { from, to },
    }),
  /** Surveys: the owners vote for their units (docs/surveys.md) */
  surveys: {
    list: () => api<List<ResidentSurveyItem> & { isOwner: boolean }>(`${base}/surveys`),
    show: (id: string) =>
      api<ApiItem<ResidentSurveyDetail>>(`${base}/surveys/${encodeURIComponent(id)}`),
    vote: (id: string, body: SurveyVoteInput) =>
      api<ApiItem<ResidentSurveyDetail>>(`${base}/surveys/${encodeURIComponent(id)}/vote`, {
        method: 'POST',
        body,
      }),
  },

  /** Documents the person can see as resident or owner (docs/documents.md) */
  documents: {
    list: (query: {
      search?: string
      category?: DocumentCategory | ''
      folder?: string
      page?: number
    }) =>
      api<ApiPaginated<DocumentItem> & { categories: DocumentCategory[] }>(`${base}/documents`, {
        query: {
          search: query.search || undefined,
          category: query.category || undefined,
          folder: query.folder || undefined,
          page: query.page,
          perPage: 30,
        },
      }),
    folders: () => api<List<DocumentFolder>>(`${base}/documents/folders`),
    show: (id: string) =>
      api<ApiItem<DocumentDetail>>(`${base}/documents/${encodeURIComponent(id)}`),
    /** Opening or downloading is logged */
    fileUrl: (id: string, download = false) =>
      api<ApiItem<{ url: string }>>(`${base}/documents/files/${id}/url`, { query: { download } }),
  },

  bookings: {
    list: () => api<List<Booking>>(`${base}/bookings`),
    show: (id: string) => api<ApiItem<ResidentBookingDetail>>(`${base}/bookings/${id}`),
    quote: (body: BookingCreateInput) =>
      api<ApiItem<BookingQuote & { startsAt: string; endsAt: string }>>(`${base}/bookings/quote`, {
        method: 'POST',
        body,
      }),
    create: (body: BookingCreateInput) =>
      api<ApiItem<ResidentBookingDetail>>(`${base}/bookings`, { method: 'POST', body }),
    cancel: (id: string, reason: string | null = null) =>
      api<ApiItem<ResidentBookingDetail>>(`${base}/bookings/${id}`, {
        method: 'DELETE',
        body: { reason },
      }),
    attach: (id: string, file: File) => {
      const body = new FormData()
      body.append('file', file)
      return api<ApiItem<Attachment>>(`${base}/bookings/${id}/attachments`, {
        method: 'POST',
        body,
      })
    },
    attachmentUrl: (id: string, download = false) =>
      api<ApiItem<{ url: string }>>(`${base}/bookings/attachments/${id}/url`, {
        query: { download },
      }),
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
