import { UNIT_TYPE_LABELS, type UnitType } from '@apartadock/shared'

const LOCALE = 'es-CO'

/**
 * Money from the API's decimal strings ("350000.00"). Whole pesos are shown
 * without decimals, as is usual for COP.
 */
export function formatMoney(amount: string | number, currency = 'COP') {
  const value = typeof amount === 'string' ? Number(amount) : amount
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function isZero(amount: string) {
  return Number(amount) === 0
}

/**
 * Parses an ISO date ("2026-11-10") as a local calendar date. `new Date(iso)`
 * would read it as UTC midnight and show the previous day in Colombia.
 */
function localDate(iso: string) {
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number)
  return new Date(year!, month! - 1, day!)
}

/** Date parts without the "de" separators ICU adds in Spanish */
function dateParts(iso: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(LOCALE, options)
    .formatToParts(localDate(iso))
    .filter((part) => part.type !== 'literal')
    .map((part) => part.value.replace('.', ''))
}

/** "10 nov 2026" */
export function formatDate(iso: string) {
  return dateParts(iso, { day: 'numeric', month: 'short', year: 'numeric' }).join(' ')
}

/** Billing period "2026-11-01" → "Noviembre 2026" */
export function formatPeriod(iso: string) {
  const [month, year] = dateParts(iso, { month: 'long', year: 'numeric' })
  return `${month!.charAt(0).toUpperCase()}${month!.slice(1)} ${year}`
}

/** Ownership coefficient "0.001250" → "0,1250 %" */
export function formatCoefficient(coefficient: string) {
  return `${new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(Number(coefficient) * 100)} %`
}

export function formatArea(area: string | null) {
  if (area === null) return '—'
  return `${new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 }).format(Number(area))} m²`
}

/** "Torre 1 · Apartamento 101" (or just "Apartamento 101" without a building) */
export function unitName(unit: { code: string; type: UnitType; building: { name: string } | null }) {
  const label = `${UNIT_TYPE_LABELS[unit.type]} ${unit.code}`
  return unit.building ? `${unit.building.name} · ${label}` : label
}
