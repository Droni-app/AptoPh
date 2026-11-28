import type { ReportCell, ReportColumnType, ReportDefault, ReportFilter } from '@aptoph/shared'
import { formatDate, formatDateTime, formatMoney, formatPeriod, todayInput } from '@/lib/format'

/** The default of a filter, as the input shows it (the API resolves the same tokens) */
export function filterDefault(filter: ReportFilter): string {
  if (filter.type === 'select') return filter.default ?? ''
  if (filter.type === 'number' || !filter.default) return ''
  const today = todayInput()
  const month = (iso: string) => iso.slice(0, 7)
  const token: ReportDefault = filter.default
  if (token === 'today') return today
  if (token === 'monthStart') return `${month(today)}-01`
  if (token === 'yearStart') return `${today.slice(0, 4)}-01-01`
  if (token === 'month') return month(today)
  if (token === 'yearStartMonth') return `${today.slice(0, 4)}-01`
  const ago = Number(token.split(':')[1] ?? 0)
  const [year, current] = month(today).split('-').map(Number)
  const date = new Date(Date.UTC(year!, current! - 1 - ago, 1))
  const value = date.toISOString().slice(0, 7)
  return filter.type === 'month' ? value : `${value}-01`
}

const number = (value: number, digits = 0) =>
  value.toLocaleString('es-CO', { minimumFractionDigits: digits, maximumFractionDigits: digits })

/** A report cell as text, by the type of its column */
export function formatCell(type: ReportColumnType, value: ReportCell | undefined): string {
  if (value === null || value === undefined || value === '') return '—'
  if (type === 'text') return String(value)
  const numeric = Number(value)
  switch (type) {
    case 'money':
      return Number.isNaN(numeric) ? String(value) : formatMoney(String(value))
    case 'number':
      return Number.isNaN(numeric)
        ? String(value)
        : number(numeric, Number.isInteger(numeric) ? 0 : 2)
    case 'percent':
      return Number.isNaN(numeric) ? String(value) : `${number(numeric, 1)} %`
    case 'hours':
      return Number.isNaN(numeric) ? String(value) : `${number(numeric, 1)} h`
    case 'date':
      return /^\d{4}-\d{2}-\d{2}/.test(String(value)) ? formatDate(String(value)) : String(value)
    case 'month':
      return /^\d{4}-\d{2}/.test(String(value)) ? formatPeriod(String(value)) : String(value)
    case 'datetime':
      return formatDateTime(String(value))
    default:
      return String(value)
  }
}

export const isNumericColumn = (type: ReportColumnType) =>
  type === 'money' || type === 'number' || type === 'percent' || type === 'hours'
