import type {
  ApiItem,
  ApiPaginated,
  DocumentCategory,
  DocumentDetail,
  DocumentFolder,
  DocumentFolderInput,
  DocumentInput,
  DocumentItem,
  DocumentStats,
  DocumentStatus,
  DocumentVisibility,
} from '@aptoph/shared'
import { api } from '@/lib/http'

const base = '/api/v1/documents'

export type DocumentListQuery = {
  search?: string
  category?: DocumentCategory | ''
  /** A folder id, `root` for the documents outside folders, empty for all */
  folder?: string
  status?: DocumentStatus | ''
  visibility?: DocumentVisibility | ''
  expiring?: boolean
  year?: number
  page?: number
}

/** Multipart body: arrays as `name[]`, empty values left out */
function form(input: Record<string, unknown>, file?: File) {
  const body = new FormData()
  if (file) body.append('file', file)
  for (const [key, value] of Object.entries(input)) {
    if (value === null || value === undefined || value === '') continue
    if (Array.isArray(value)) for (const item of value) body.append(`${key}[]`, String(item))
    else body.append(key, String(value))
  }
  return body
}

/** Documents of the conjunto (docs/documents.md) */
export const documentsApi = {
  list: (query: DocumentListQuery) =>
    api<ApiPaginated<DocumentItem>>(base, {
      query: {
        ...query,
        category: query.category || undefined,
        folder: query.folder || undefined,
        status: query.status || undefined,
        visibility: query.visibility || undefined,
        search: query.search || undefined,
        expiring: query.expiring || undefined,
      },
    }),
  folders: () => api<{ data: DocumentFolder[] }>(`${base}/folders`),
  stats: () => api<ApiItem<DocumentStats>>('/api/v1/documents-stats'),
  get: (id: string) => api<ApiItem<DocumentDetail>>(`${base}/${id}`),
  fileUrl: (attachmentId: string, download = false) =>
    api<ApiItem<{ url: string }>>(`${base}/files/${attachmentId}/url`, { query: { download } }),

  create: (input: DocumentInput, file: File, options: { publish: boolean; notify: boolean }) =>
    api<ApiItem<DocumentDetail> & { notified: number }>(base, {
      method: 'POST',
      body: form({ ...input, ...options }, file),
    }),
  update: (id: string, input: DocumentInput) =>
    api<ApiItem<DocumentDetail>>(`${base}/${id}`, { method: 'PUT', body: input }),
  addVersion: (id: string, file: File) =>
    api<ApiItem<DocumentDetail>>(`${base}/${id}/versions`, {
      method: 'POST',
      body: form({}, file),
    }),
  removeVersion: (attachmentId: string) =>
    api<ApiItem<DocumentDetail>>(`${base}/versions/${attachmentId}`, { method: 'DELETE' }),
  publish: (id: string, notify: boolean) =>
    api<ApiItem<DocumentDetail> & { notified: number }>(`${base}/${id}/publish`, {
      method: 'POST',
      body: { notify },
    }),
  unpublish: (id: string) =>
    api<ApiItem<DocumentDetail>>(`${base}/${id}/unpublish`, { method: 'POST' }),
  archive: (id: string) =>
    api<ApiItem<DocumentDetail>>(`${base}/${id}/archive`, { method: 'POST' }),
  restore: (id: string) =>
    api<ApiItem<DocumentDetail>>(`${base}/${id}/restore`, { method: 'POST' }),
  remove: (id: string) => api<void>(`${base}/${id}`, { method: 'DELETE' }),

  createFolder: (input: DocumentFolderInput) =>
    api<ApiItem<DocumentFolder>>(`${base}/folders`, { method: 'POST', body: input }),
  updateFolder: (id: string, input: DocumentFolderInput) =>
    api<ApiItem<DocumentFolder>>(`${base}/folders/${id}`, { method: 'PUT', body: input }),
  removeFolder: (id: string) => api<void>(`${base}/folders/${id}`, { method: 'DELETE' }),
}
