import type {
  ApiItem,
  ApiPaginated,
  Attachment,
  Ticket,
  TicketAssignee,
  TicketComment,
  TicketCommentInput,
  TicketDetail,
  TicketFilters,
  TicketStats,
  TicketUpdateInput,
} from '@aptoph/shared'
import { api } from '@/lib/http'

const base = '/api/v1/tickets'

/** PQRS in the back-office (docs/tickets.md) */
export const ticketsApi = {
  list: (query: TicketFilters) => api<ApiPaginated<Ticket>>(base, { query: { ...query } }),
  stats: () => api<ApiItem<TicketStats>>(`${base}/stats`),
  assignees: () => api<{ data: TicketAssignee[] }>(`${base}/assignees`),
  get: (id: string) => api<ApiItem<TicketDetail>>(`${base}/${id}`),
  update: (id: string, body: TicketUpdateInput) =>
    api<ApiItem<TicketDetail>>(`${base}/${id}`, { method: 'PATCH', body }),
  comment: (id: string, body: TicketCommentInput) =>
    api<ApiItem<TicketComment>>(`${base}/${id}/comments`, { method: 'POST', body }),

  attachments: async (id: string) => ({ data: (await ticketsApi.get(id)).data.attachments }),
  uploadAttachment: (id: string, file: File) => {
    const body = new FormData()
    body.append('file', file)
    return api<ApiItem<Attachment>>(`${base}/${id}/attachments`, { method: 'POST', body })
  },
  attachmentUrl: (id: string, download = false) =>
    api<ApiItem<{ url: string }>>(`${base}/attachments/${id}/url`, { query: { download } }),
  removeAttachment: (id: string) => api<void>(`${base}/attachments/${id}`, { method: 'DELETE' }),
}
