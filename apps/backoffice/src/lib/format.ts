import { UNIT_TYPE_LABELS, type FinanceUnitRef } from '@aptoph/shared'

const LOCALE = 'es-CO'

const pesos = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

/** "350000.00" → "$ 350.000" (cents only when there are any) */
export function formatMoney(amount: string | number | null | undefined) {
  if (amount === null || amount === undefined || amount === '') return '—'
  return pesos.format(Number(amount))
}

/** Same as formatMoney, but zero shows as a dash (tables full of zeros are hard to read) */
export function formatAmount(amount: string | number | null | undefined) {
  return Number(amount ?? 0) === 0 ? '—' : formatMoney(amount)
}

export const isZero = (amount: string | null | undefined) => Number(amount ?? 0) === 0
export const isNegative = (amount: string | null | undefined) => Number(amount ?? 0) < 0

/** ISO date read as a local calendar date (not UTC midnight) */
function localDate(iso: string) {
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number)
  return new Date(year!, month! - 1, day!)
}

function parts(iso: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(LOCALE, options)
    .formatToParts(localDate(iso))
    .filter((part) => part.type !== 'literal')
    .map((part) => part.value.replace('.', ''))
}

/** "10 nov 2026" */
export function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return parts(iso, { day: 'numeric', month: 'short', year: 'numeric' }).join(' ')
}

/** "2026-11-01" → "Noviembre 2026" */
export function formatPeriod(iso: string) {
  const [month, year] = parts(iso, { month: 'long', year: 'numeric' })
  return `${month!.charAt(0).toUpperCase()}${month!.slice(1)} ${year}`
}

/** "2026-11-01" → "nov 26" */
export function formatShortPeriod(iso: string) {
  const [month, year] = parts(iso, { month: 'short', year: '2-digit' })
  return `${month} ${year}`
}

/** "jue 20 nov · 7:00 p. m." */
export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat(LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso))
}

/** "2026-11-20T15:00:00-05:00" → "2026-11-20" in the browser's zone */
export function isoDateOf(instant: string) {
  const date = new Date(instant)
  return todayInput(0, date)
}

/** "Torre 1 · Apto 302" */
export function unitLabel(unit: FinanceUnitRef | null | undefined) {
  if (!unit) return '—'
  const label = `${UNIT_TYPE_LABELS[unit.type] ?? ''} ${unit.code}`.trim()
  return unit.building ? `${unit.building} · ${label}` : label
}

/** Today (or another day) as "YYYY-MM-DD" in the browser's zone */
export function todayInput(offsetDays = 0, from = new Date()) {
  const date = new Date(from)
  date.setDate(date.getDate() + offsetDays)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** "2026-11" of today, for month inputs */
export function thisMonthInput() {
  return todayInput().slice(0, 7)
}

/** "2026-11" + n months */
export function addMonthsInput(month: string, months: number) {
  const [year, m] = month.split('-').map(Number)
  const index = year! * 12 + (m! - 1) + months
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`
}

/** Parses a typed amount ("350.000", "350000,5") into a number of pesos */
export function parseAmount(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return 0
  if (typeof value === 'number') return value
  const clean = value.replace(/\s|\$/g, '')
  // "1.234.567,89" (es-CO) or "1234567.89"
  const normalized = /,\d{1,2}$/.test(clean)
    ? clean.replace(/\./g, '').replace(',', '.')
    : clean.replace(/[.,](?=\d{3}(\D|$))/g, '')
  const number = Number(normalized)
  return Number.isFinite(number) ? Math.round(number * 100) / 100 : Number.NaN
}

/** Downloads rows as a CSV the accountant can open in Excel (semicolon, UTF-8 BOM) */
export function downloadCsv(
  filename: string,
  rows: Array<Array<string | number | null | undefined>>,
) {
  const escape = (value: string | number | null | undefined) => {
    const text = value === null || value === undefined ? '' : String(value)
    return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  const csv = rows.map((row) => row.map(escape).join(';')).join('\r\n')
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

/** Decimal string with comma for CSV in es-CO Excel */
export const csvAmount = (amount: string | null | undefined) => (amount ?? '0').replace('.', ',')
