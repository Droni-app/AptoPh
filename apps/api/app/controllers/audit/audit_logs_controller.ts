import type { HttpContext } from '@adonisjs/core/http'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import { DateTime } from 'luxon'
import {
  AUDIT_ACTION_LABELS,
  AUDIT_FIELD_LABELS,
  AUDIT_FULL_ROLES,
  AUDIT_MODULE_LABELS,
  AUDITABLE_TYPES,
  auditTypesOf,
  REPORT_MAX_ROWS,
  type AuditAction,
  type AuditChanges,
  type AuditLogDetail,
  type AuditLogEntry,
  type AuditModule,
  type ReportResult,
} from '@aptoph/shared'
import AuditLog from '#models/tenants/audit_log'
import { recordAudit } from '#services/audit/audit_log'
import { todayFor } from '#services/finance/support'
import { reportToCsv, reportToXlsx } from '#services/reports/export'
import { dateText, rangeText } from '#services/reports/support'
import { paginated } from '#transformers/finance/finance'
import { auditExportValidator, auditListValidator } from '#validators/audit/audit'

type Filters = {
  from?: string
  to?: string
  module?: AuditModule
  type?: string
  action?: AuditAction
  userId?: string
  recordId?: string
  search?: string
}

const typeInfo = (type: string) =>
  (AUDITABLE_TYPES as Record<string, { module: AuditModule; label: string }>)[type] ?? null

function entry(log: AuditLog): AuditLogEntry {
  const changes = (log.changes ?? null) as AuditChanges | null
  const info = typeInfo(log.auditableType)
  return {
    id: log.id,
    action: log.action as AuditAction,
    type: log.auditableType,
    typeLabel: info?.label ?? log.auditableType,
    module: info?.module ?? null,
    recordId: log.auditableId,
    label: changes?.label ?? null,
    user: log.user ? { id: log.user.id, fullName: log.user.fullName, email: log.user.email } : null,
    ipAddress: log.ipAddress,
    createdAt: log.createdAt.toISO()!,
    fields: [
      ...new Set([...Object.keys(changes?.after ?? {}), ...Object.keys(changes?.before ?? {})]),
    ],
  }
}

/**
 * The audit log of the conjunto (docs/audit.md): administration, fiscal
 * reviewer and council see all of it; the accountant, the finance entries.
 */
export default class AuditLogsController {
  private query(ctx: HttpContext, filters: Filters) {
    const zone = ctx.tenant.timezone || 'America/Bogota'
    const query = AuditLog.query().where('tenant_id', ctx.tenant.id)
    const full = ctx.tenantRoles.some((role) => AUDIT_FULL_ROLES.includes(role))
    let types: string[] | null = filters.module ? auditTypesOf(filters.module) : null
    if (!full) {
      const finance = auditTypesOf('finance') as string[]
      types = types ? types.filter((type) => finance.includes(type)) : finance
    }
    if (filters.type) types = types ? types.filter((type) => type === filters.type) : [filters.type]
    if (types) query.whereIn('auditable_type', types.length ? types : ['-'])
    if (filters.from)
      query.where(
        'created_at',
        '>=',
        DateTime.fromISO(filters.from, { zone }).startOf('day').toISO()!
      )
    if (filters.to)
      query.where('created_at', '<=', DateTime.fromISO(filters.to, { zone }).endOf('day').toISO()!)
    if (filters.action) query.where('action', filters.action)
    if (filters.userId) query.where('user_id', filters.userId)
    if (filters.recordId) query.where('auditable_id', filters.recordId)
    if (filters.search) {
      const search = `%${filters.search.replace(/[%_]/g, '\\$&')}%`
      query.where((q) =>
        q
          .whereRaw(`changes->>'label' ILIKE ?`, [search])
          .orWhereHas('user', (user) => user.whereILike('full_name', search))
      )
    }
    return query
      .preload('user')
      .orderBy('created_at', 'desc')
      .orderBy('id', 'desc') as ModelQueryBuilderContract<typeof AuditLog, AuditLog>
  }

  async index(ctx: HttpContext) {
    const filters = await ctx.request.validateUsing(auditListValidator, { data: ctx.request.qs() })
    const page = await this.query(ctx, filters as Filters).paginate(
      filters.page ?? 1,
      filters.perPage ?? 50
    )
    return paginated(page, entry)
  }

  async show(ctx: HttpContext) {
    const log = await this.query(ctx, {}).where('id', ctx.params.id).firstOrFail()
    const detail: AuditLogDetail = {
      ...entry(log),
      changes: (log.changes ?? null) as AuditChanges | null,
    }
    return { data: detail }
  }

  /** The filtered log as Excel or CSV */
  async export(ctx: HttpContext) {
    const filters = await ctx.request.validateUsing(auditExportValidator, {
      data: ctx.request.qs(),
    })
    const format = filters.format ?? 'xlsx'
    const logs = await this.query(ctx, filters as Filters).limit(REPORT_MAX_ROWS + 1)
    const zone = ctx.tenant.timezone || 'America/Bogota'
    const fieldsOf = (log: AuditLog) => {
      const changes = (log.changes ?? null) as AuditChanges | null
      if (log.action !== 'updated' || !changes?.after) return null
      return Object.keys(changes.after)
        .map((key) => AUDIT_FIELD_LABELS[key] ?? key)
        .join(', ')
    }
    const result: ReportResult = {
      key: 'audit',
      title: 'Bitácora de auditoría',
      period:
        filters.from && filters.to
          ? rangeText(filters.from, filters.to)
          : filters.from
            ? `Desde el ${dateText(filters.from)}`
            : filters.to
              ? `Hasta el ${dateText(filters.to)}`
              : null,
      generatedAt: DateTime.now().setZone(zone).toISO()!,
      filters: [
        ...(filters.module
          ? [{ label: 'Módulo', value: AUDIT_MODULE_LABELS[filters.module] }]
          : []),
        ...(filters.type
          ? [{ label: 'Registro', value: typeInfo(filters.type)?.label ?? filters.type }]
          : []),
        ...(filters.action
          ? [{ label: 'Acción', value: AUDIT_ACTION_LABELS[filters.action] }]
          : []),
        ...(filters.search ? [{ label: 'Búsqueda', value: filters.search }] : []),
      ],
      summary: [],
      columns: [
        { key: 'at', label: 'Fecha y hora', type: 'datetime' },
        { key: 'user', label: 'Persona', type: 'text' },
        { key: 'action', label: 'Acción', type: 'text' },
        { key: 'module', label: 'Módulo', type: 'text' },
        { key: 'type', label: 'Registro', type: 'text' },
        { key: 'label', label: 'Detalle', type: 'text' },
        { key: 'fields', label: 'Campos modificados', type: 'text' },
        { key: 'ip', label: 'IP', type: 'text' },
      ],
      rows: logs.slice(0, REPORT_MAX_ROWS).map((log) => {
        const info = typeInfo(log.auditableType)
        return {
          at: log.createdAt.toISO(),
          user: log.user?.fullName ?? 'Sistema',
          action: AUDIT_ACTION_LABELS[log.action as AuditAction] ?? log.action,
          module: info ? AUDIT_MODULE_LABELS[info.module] : null,
          type: info?.label ?? log.auditableType,
          label: ((log.changes ?? {}) as AuditChanges).label ?? null,
          fields: fieldsOf(log),
          ip: log.ipAddress,
        }
      }),
      totals: null,
      truncated: logs.length > REPORT_MAX_ROWS,
      notes: [],
    }
    const file =
      format === 'csv' ? reportToCsv(result, ctx.tenant) : await reportToXlsx(result, ctx.tenant)
    await recordAudit({
      tenantId: ctx.tenant.id,
      action: 'exported',
      type: 'reports',
      label: result.title,
      changes: { details: { report: 'audit', format, rows: result.rows.length } },
    })
    ctx.response.header(
      'Content-Type',
      format === 'csv'
        ? 'text/csv; charset=utf-8'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    ctx.response.header(
      'Content-Disposition',
      `attachment; filename="bitacora-auditoria-${todayFor(ctx.tenant)}.${format}"`
    )
    return ctx.response.send(file)
  }
}
