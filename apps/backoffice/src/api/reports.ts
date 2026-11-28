import type {
  ApiItem,
  ApiPaginated,
  AuditLogDetail,
  AuditLogEntry,
  ReportExportFormat,
  ReportOptions,
  ReportResult,
} from '@aptoph/shared'
import { api, apiDownload } from '@/lib/http'
import { todayInput } from '@/lib/format'

export type ReportQuery = Record<string, string | number | undefined>

export type AuditQuery = {
  from?: string
  to?: string
  module?: string
  action?: string
  userId?: string
  search?: string
  recordId?: string
  page?: number
}

/** Reports and audit log of the back-office (docs/reports.md, docs/audit.md) */
export const reportsApi = {
  options: () => api<ApiItem<ReportOptions>>('/api/v1/reports/options'),
  run: (key: string, query: ReportQuery) =>
    api<ApiItem<ReportResult>>(`/api/v1/reports/${key}`, { query }),
  download: (key: string, format: ReportExportFormat, query: ReportQuery) =>
    apiDownload(
      `/api/v1/reports/${key}/export`,
      `${key.replace(/_/g, '-')}-${todayInput()}.${format}`,
      { ...query, format },
    ),
  audit: (query: AuditQuery) => api<ApiPaginated<AuditLogEntry>>('/api/v1/audit-logs', { query }),
  auditEntry: (id: string) => api<ApiItem<AuditLogDetail>>(`/api/v1/audit-logs/${id}`),
  downloadAudit: (format: ReportExportFormat, query: AuditQuery) =>
    apiDownload('/api/v1/audit-logs/export', `bitacora-auditoria-${todayInput()}.${format}`, {
      ...query,
      page: undefined,
      format,
    }),
}
