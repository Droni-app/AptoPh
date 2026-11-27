import type {
  AnnouncementDetail,
  AnnouncementImage,
  AnnouncementInput,
  AnnouncementReader,
  AnnouncementStatus,
  Announcement,
  ApiItem,
  ApiPaginated,
  Attachment,
  EmailPreview,
  EmailQuota,
} from '@aptoph/shared'
import { api } from '@/lib/http'

const base = '/api/v1/announcements'

export const announcementsApi = {
  list: (query: { status?: AnnouncementStatus | ''; search?: string; page?: number }) =>
    api<ApiPaginated<Announcement>>(base, { query }),
  get: (id: string) => api<ApiItem<AnnouncementDetail>>(`${base}/${id}`),
  readers: (id: string) => api<{ data: AnnouncementReader[] }>(`${base}/${id}/readers`),
  create: (input: AnnouncementInput) =>
    api<ApiItem<AnnouncementDetail>>(base, { method: 'POST', body: input }),
  update: (id: string, input: AnnouncementInput) =>
    api<ApiItem<AnnouncementDetail>>(`${base}/${id}`, { method: 'PUT', body: input }),
  publish: (id: string) =>
    api<ApiItem<AnnouncementDetail>>(`${base}/${id}/publish`, { method: 'POST' }),
  unpublish: (id: string) =>
    api<ApiItem<AnnouncementDetail>>(`${base}/${id}/unpublish`, { method: 'POST' }),
  remove: (id: string) => api<void>(`${base}/${id}`, { method: 'DELETE' }),
  /** Who the email would reach and the quota of the month it would go out */
  emailPreview: (
    body: Pick<AnnouncementInput, 'audience' | 'buildingIds'> & { publishAt?: string | null },
  ) => api<ApiItem<EmailPreview>>(`${base}/email-preview`, { method: 'POST', body }),

  /** Sets or replaces the image (poster) */
  setImage: (id: string, file: File) => {
    const body = new FormData()
    body.append('file', file)
    return api<ApiItem<AnnouncementImage>>(`${base}/${id}/image`, { method: 'PUT', body })
  },
  removeImage: (id: string) => api<void>(`${base}/${id}/image`, { method: 'DELETE' }),

  attachments: async (id: string) => ({ data: (await announcementsApi.get(id)).data.attachments }),
  uploadAttachment: (id: string, file: File) => {
    const body = new FormData()
    body.append('file', file)
    return api<ApiItem<Attachment>>(`${base}/${id}/attachments`, { method: 'POST', body })
  },
  attachmentUrl: (id: string, download = false) =>
    api<ApiItem<{ url: string }>>(`${base}/attachments/${id}/url`, { query: { download } }),
  removeAttachment: (id: string) => api<void>(`${base}/attachments/${id}`, { method: 'DELETE' }),
}

/** Monthly bulk email quota (docs/email-quota.md); buying packs: billingApi */
export const emailQuotaApi = {
  show: () => api<ApiItem<EmailQuota>>('/api/v1/email-quota'),
}
