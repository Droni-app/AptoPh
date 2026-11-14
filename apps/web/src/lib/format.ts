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

/** "jue 20 nov · 7:00 p. m." for ISO instants, in the browser's timezone */
export function formatDateTime(iso: string) {
  const date = new Date(iso)
  const day = new Intl.DateTimeFormat(LOCALE, { weekday: 'short', day: 'numeric', month: 'short' })
    .formatToParts(date)
    .filter((part) => part.type !== 'literal')
    .map((part) => part.value.replace('.', ''))
    .join(' ')
  return `${day} · ${formatTime(iso)}`
}

/** "7:00 p. m." */
export function formatTime(iso: string) {
  return new Intl.DateTimeFormat(LOCALE, { hour: 'numeric', minute: '2-digit' }).format(new Date(iso))
}

/** "hace 3 h", "hace 2 días"… for activity feeds */
export function formatRelative(iso: string, now = Date.now()) {
  const minutes = Math.round((new Date(iso).getTime() - now) / 60_000)
  const rtf = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' })
  if (Math.abs(minutes) < 60) return rtf.format(minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return rtf.format(hours, 'hour')
  return rtf.format(Math.round(hours / 24), 'day')
}

/**
 * Local date ("2026-11-20") and time ("19:00") from form inputs → ISO instant
 * with offset, as the API expects. Interpreted in the browser's timezone.
 */
export function toIsoInstant(date: string, time: string) {
  return new Date(`${date}T${time}`).toISOString()
}

/** Today in the browser's timezone as "YYYY-MM-DD" (min value for date inputs) */
export function todayInput(offsetDays = 0) {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
