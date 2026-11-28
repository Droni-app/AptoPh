import { DateTime } from 'luxon'
import {
  addMonths,
  REPORT_MAX_ROWS,
  type ReportDefault,
  type ReportDefinition,
  type ReportFilter,
  type ReportOptions,
  type ReportResult,
} from '@aptoph/shared'
import FieldException from '#exceptions/field_exception'
import type Tenant from '#models/tenants/tenant'
import { todayFor } from '#services/finance/support'
import { dateText, monthText, select } from '#services/reports/support'

export type ReportFilters = Record<string, string | number | undefined>

export type ReportContext = {
  tenant: Tenant
  /** Today in the conjunto ("2026-11-27") */
  today: string
  /** IANA zone of the conjunto */
  zone: string
  filters: ReportFilters
}

/** What a report builds; the engine adds the title, the filters and the limit */
export type ReportOutput = Pick<ReportResult, 'columns' | 'rows'> &
  Partial<Pick<ReportResult, 'summary' | 'totals' | 'notes' | 'period' | 'rowLink'>>

export type ReportRunner = (context: ReportContext) => Promise<ReportOutput>

const DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/
const MONTH = /^(\d{4}-(0[1-9]|1[0-2]))(-01)?$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function resolveDefault(value: ReportDefault, today: string, type: 'date' | 'month') {
  const month = `${today.slice(0, 7)}-01`
  if (value === 'today') return type === 'month' ? month : today
  if (value === 'monthStart' || value === 'month') return month
  if (value === 'yearStart' || value === 'yearStartMonth') return `${today.slice(0, 4)}-01-01`
  const ago = Number(value.split(':')[1] ?? 0)
  return addMonths(month, -ago)
}

/** Reads the query string of a report against its filters (422 on a bad value) */
export function parseFilters(
  definition: ReportDefinition,
  qs: Record<string, unknown>,
  today: string
) {
  const filters: ReportFilters = {}
  for (const filter of definition.filters) {
    const raw = qs[filter.key]
    const value =
      typeof raw === 'string' ? raw.trim() : raw === undefined || raw === null ? '' : String(raw)
    if (filter.type === 'date' || filter.type === 'month') {
      if (!value) {
        if (filter.default) filters[filter.key] = resolveDefault(filter.default, today, filter.type)
        continue
      }
      if (filter.type === 'date') {
        if (!DATE.test(value) || !DateTime.fromISO(value).isValid)
          throw new FieldException(filter.key, `${filter.label}: la fecha no es válida`)
        filters[filter.key] = value
      } else {
        const match = MONTH.exec(value)
        if (!match) throw new FieldException(filter.key, `${filter.label}: el mes no es válido`)
        filters[filter.key] = `${match[1]}-01`
      }
    } else if (filter.type === 'number') {
      if (!value) continue
      const number = Number(value.replace(/[$\s.]/g, '').replace(',', '.'))
      if (!Number.isFinite(number) || (filter.min !== undefined && number < filter.min))
        throw new FieldException(filter.key, `${filter.label}: el valor no es válido`)
      filters[filter.key] = number
    } else {
      if (!value) {
        if (filter.default) filters[filter.key] = filter.default
        continue
      }
      if (filter.options && !filter.options.some((option) => option.value === value))
        throw new FieldException(filter.key, `${filter.label}: la opción no es válida`)
      if (filter.source && !UUID.test(value))
        throw new FieldException(filter.key, `${filter.label}: la opción no es válida`)
      filters[filter.key] = value
    }
  }
  const from = filters.from as string | undefined
  const to = filters.to as string | undefined
  if (from && to && from > to)
    throw new FieldException('from', 'La fecha inicial es posterior a la final')
  if (from && to) {
    const days = DateTime.fromISO(to).diff(DateTime.fromISO(from), 'days').days
    if (days > 366 * 5) throw new FieldException('from', 'El rango no puede pasar de cinco años')
  }
  return filters
}

/** The lists of the select filters, with the data of the conjunto */
export async function reportOptions(tenant: Tenant): Promise<ReportOptions> {
  const id = tenant.id
  const [buildings, cashAccounts, vendors, concepts, amenities, members, expenseAccounts] =
    await Promise.all([
      select('SELECT id, name FROM buildings WHERE tenant_id = ? ORDER BY sort_order, name', [id]),
      select(
        'SELECT id, name FROM cash_accounts WHERE tenant_id = ? ORDER BY is_active DESC, name',
        [id]
      ),
      select('SELECT id, name FROM vendors WHERE tenant_id = ? ORDER BY name', [id]),
      select('SELECT id, name FROM charge_concepts WHERE tenant_id = ? ORDER BY name', [id]),
      select('SELECT id, name FROM amenities WHERE tenant_id = ? ORDER BY name', [id]),
      select(
        `SELECT DISTINCT u.id, u.full_name AS name FROM enrollments e JOIN users u ON u.id = e.user_id
          WHERE e.tenant_id = ? AND e.role <> 'resident' ORDER BY u.full_name`,
        [id]
      ),
      select(
        `SELECT id, code || ' ' || name AS name FROM ledger_accounts
          WHERE tenant_id = ? AND class = 'expense' AND is_postable ORDER BY code`,
        [id]
      ),
    ])
  const list = (rows: Array<Record<string, any>>) =>
    rows.map((row) => ({ value: String(row.id), label: String(row.name) }))
  return {
    buildings: list(buildings),
    cashAccounts: list(cashAccounts),
    vendors: list(vendors),
    concepts: list(concepts),
    amenities: list(amenities),
    members: list(members),
    expenseAccounts: list(expenseAccounts),
  }
}

/** The filters in words, for the header of the report and of the file */
async function describeFilters(
  definition: ReportDefinition,
  filters: ReportFilters,
  tenant: Tenant
) {
  const needsOptions = definition.filters.some(
    (filter) => filter.type === 'select' && filter.source && filters[filter.key]
  )
  const options = needsOptions ? await reportOptions(tenant) : null
  const text = (filter: ReportFilter, value: string | number) => {
    if (filter.type === 'date') return dateText(String(value))
    if (filter.type === 'month') return monthText(String(value))
    if (filter.type === 'number') return new Intl.NumberFormat('es-CO').format(Number(value))
    const list = filter.source ? options?.[filter.source] : filter.options
    return list?.find((option) => option.value === value)?.label ?? String(value)
  }
  return definition.filters
    .filter((filter) => filters[filter.key] !== undefined && filter.key !== 'groupBy')
    .map((filter) => ({ label: filter.label, value: text(filter, filters[filter.key]!) }))
}

export async function runReport(
  definition: ReportDefinition,
  runner: ReportRunner,
  tenant: Tenant,
  qs: Record<string, unknown>
): Promise<ReportResult> {
  const today = todayFor(tenant)
  const filters = parseFilters(definition, qs, today)
  const output = await runner({
    tenant,
    today,
    zone: tenant.timezone || 'America/Bogota',
    filters,
  })
  const truncated = output.rows.length > REPORT_MAX_ROWS
  const groupBy = definition.filters.find((filter) => filter.key === 'groupBy')
  const view =
    groupBy?.type === 'select'
      ? groupBy.options?.find((option) => option.value === filters.groupBy)?.label
      : null
  return {
    key: definition.key,
    title: view ? `${definition.title} · ${view}` : definition.title,
    period: output.period ?? null,
    generatedAt: DateTime.now()
      .setZone(tenant.timezone || 'America/Bogota')
      .toISO()!,
    filters: await describeFilters(definition, filters, tenant),
    summary: output.summary ?? [],
    columns: output.columns,
    rows: truncated ? output.rows.slice(0, REPORT_MAX_ROWS) : output.rows,
    totals: output.totals ?? null,
    truncated,
    notes: output.notes ?? [],
    rowLink: output.rowLink,
  }
}
