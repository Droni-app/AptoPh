import type {
  Amenity,
  AmenityInput,
  ApiItem,
  ApiPaginated,
  Attachment,
  Booking,
  BookingApproveInput,
  BookingCreateInput,
  BookingDepositInput,
  BookingQuote,
} from '@aptoph/shared'
import { api } from '@/lib/http'

/** A booking with its payment receipts */
export type BookingDetail = Booking & { attachments: Attachment[] }
export type BookingQuoteResult = BookingQuote & { startsAt: string; endsAt: string }
export type BookingListStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'deposit'

/** Common areas and their bookings (docs/amenities.md) */
export const amenitiesApi = {
  list: () => api<{ data: Amenity[] }>('/api/v1/amenities'),
  create: (input: AmenityInput) =>
    api<ApiItem<Amenity>>('/api/v1/amenities', { method: 'POST', body: input }),
  update: (id: string, input: AmenityInput) =>
    api<ApiItem<Amenity>>(`/api/v1/amenities/${id}`, { method: 'PUT', body: input }),
  /** With bookings it is only deactivated (returns the area); otherwise deleted */
  remove: (id: string) =>
    api<ApiItem<Amenity> | undefined>(`/api/v1/amenities/${id}`, { method: 'DELETE' }),
}

const base = '/api/v1/bookings'

export const bookingsApi = {
  calendar: (from: string, to: string, amenityId?: string) =>
    api<{ data: Booking[] }>(`${base}/calendar`, {
      query: { from, to, amenityId: amenityId || undefined },
    }),
  list: (query: { status?: BookingListStatus; amenityId?: string; page?: number }) =>
    api<ApiPaginated<Booking>>(base, {
      query: { status: query.status, amenityId: query.amenityId || undefined, page: query.page },
    }),
  stats: () => api<ApiItem<{ pending: number; deposits: number; today: number }>>(`${base}/stats`),
  get: (id: string) => api<ApiItem<BookingDetail>>(`${base}/${id}`),
  quote: (input: BookingCreateInput) =>
    api<ApiItem<BookingQuoteResult>>(`${base}/quote`, { method: 'POST', body: input }),
  create: (input: BookingCreateInput & { approve?: BookingApproveInput }) =>
    api<ApiItem<BookingDetail>>(base, { method: 'POST', body: input }),
  approve: (id: string, input: BookingApproveInput) =>
    api<ApiItem<BookingDetail>>(`${base}/${id}/approve`, { method: 'POST', body: input }),
  reject: (id: string, reason: string) =>
    api<ApiItem<BookingDetail>>(`${base}/${id}/reject`, { method: 'POST', body: { reason } }),
  cancel: (id: string, reason: string | null) =>
    api<ApiItem<BookingDetail> & { warnings: string[] }>(`${base}/${id}/cancel`, {
      method: 'POST',
      body: { reason },
    }),
  deposit: (id: string, input: BookingDepositInput) =>
    api<ApiItem<BookingDetail>>(`${base}/${id}/deposit`, { method: 'POST', body: input }),
  attachments: async (id: string) => ({ data: (await bookingsApi.get(id)).data.attachments }),
  uploadAttachment: (id: string, file: File) => {
    const body = new FormData()
    body.append('file', file)
    return api<ApiItem<Attachment>>(`${base}/${id}/attachments`, { method: 'POST', body })
  },
  attachmentUrl: (id: string, download = false) =>
    api<ApiItem<{ url: string }>>(`${base}/attachments/${id}/url`, { query: { download } }),
  removeAttachment: (id: string) => api<void>(`${base}/attachments/${id}`, { method: 'DELETE' }),
}
