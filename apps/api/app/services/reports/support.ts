import db from '@adonisjs/lucid/services/db'
import { fromCents, toCents, type ReportCell, type ReportColumn } from '@aptoph/shared'
import { isoDate } from '#services/finance/reports'

export { isoDate }

/** Rows of a raw query */
export async function select<T = Record<string, any>>(sql: string, bindings: unknown[] = []) {
  const result = await db.rawQuery(sql, bindings as any[])
  return result.rows as T[]
}

/** A numeric column as "1234.50" */
export const money = (value: unknown) => fromCents(toCents((value as string | number) ?? 0))

export const int = (value: unknown) => Number(value ?? 0)

/** Share of `part` in `whole`, 0-100 with one decimal; null when there is no whole */
export function percent(part: number, whole: number) {
  if (!whole) return null
  return Math.round((part / whole) * 1000) / 10
}

export const round1 = (value: number | null | undefined) =>
  value === null || value === undefined || Number.isNaN(value) ? null : Math.round(value * 10) / 10

/** "Torre 1 · 302" (needs `u` = units and `b` = buildings in the query) */
export const UNIT_LABEL = `concat_ws(' · ', b.name, u.code)`

/** People responsible for a unit today: billing responsible first, then owners */
export const RESPONSIBLE = `(
  SELECT string_agg(o.full_name, ', ' ORDER BY o.is_billing_responsible DESC, o.full_name)
    FROM unit_occupants o
   WHERE o.unit_id = u.id
     AND (o.is_billing_responsible OR o.relationship = 'owner')
     AND (o.ends_on IS NULL OR o.ends_on >= CURRENT_DATE)
)`

/** A timestamp as a calendar day of the conjunto ($zone is bound as a parameter) */
export const localDay = (column: string) => `(${column} AT TIME ZONE ?)::date`

const LOCALE = 'es-CO'

function calendarDate(iso: string) {
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number)
  return new Date(Date.UTC(year!, month! - 1, day!, 12))
}

/** "27 nov 2026" */
export function dateText(iso: string) {
  return new Intl.DateTimeFormat(LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
    .formatToParts(calendarDate(iso))
    .filter((part) => part.type !== 'literal')
    .map((part) => part.value.replace('.', ''))
    .join(' ')
}

/** "noviembre 2026" */
export function monthText(iso: string) {
  return new Intl.DateTimeFormat(LOCALE, { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(calendarDate(iso))
    .replace(' de ', ' ')
}

export const rangeText = (from: string, to: string) => `Del ${dateText(from)} al ${dateText(to)}`

export const monthRangeText = (from: string, to: string) =>
  from === to ? monthText(from) : `De ${monthText(from)} a ${monthText(to)}`

/** Sums the money and number columns of the rows (the first text column says "Total") */
export function totalsOf(
  columns: ReportColumn[],
  rows: Array<Record<string, ReportCell>>,
  skip: string[] = []
) {
  const totals: Record<string, ReportCell> = {}
  let labelled = false
  for (const column of columns) {
    if (skip.includes(column.key)) {
      totals[column.key] = null
    } else if (column.type === 'money') {
      totals[column.key] = fromCents(
        rows.reduce((sum, row) => sum + toCents((row[column.key] as string) ?? 0), 0)
      )
    } else if (column.type === 'number') {
      totals[column.key] = rows.reduce((sum, row) => sum + Number(row[column.key] ?? 0), 0)
    } else if (!labelled && column.type === 'text') {
      totals[column.key] = 'Total'
      labelled = true
    } else {
      totals[column.key] = null
    }
  }
  return totals
}

export const sumMoney = (rows: Array<Record<string, ReportCell>>, key: string) =>
  fromCents(rows.reduce((sum, row) => sum + toCents((row[key] as string) ?? 0), 0))

export const sumNumber = (rows: Array<Record<string, ReportCell>>, key: string) =>
  rows.reduce((sum, row) => sum + Number(row[key] ?? 0), 0)

export const col = (
  key: string,
  label: string,
  type: ReportColumn['type'] = 'text'
): ReportColumn => ({
  key,
  label,
  type,
})
