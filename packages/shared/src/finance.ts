/**
 * Finance settings of a conjunto (`tenants.settings.finance`) and period helpers.
 * See docs/finance.md §11.
 */
import type { PaymentApplicationOrder, RoundingMode, RoundingStep } from './domain.js'

export interface FinanceSettings {
  /** Day of the month the fees fall due (1–28) */
  dueDay: number
  lateInterest: {
    enabled: boolean
    /** Simple monthly rate, as a percentage (2 = 2 % per month) */
    monthlyRate: number
  }
  earlyDiscount: {
    enabled: boolean
    /** Percentage of the charge */
    rate: number
    /** Last day of the month that gets the discount */
    day: number
  }
  rounding: RoundingStep
  roundingMode: RoundingMode
  applicationOrder: PaymentApplicationOrder
  /** Accounting is closed up to this date (inclusive): ISO date or null */
  lockedUntil: string | null
}

export const DEFAULT_FINANCE_SETTINGS: FinanceSettings = {
  dueDay: 10,
  lateInterest: { enabled: true, monthlyRate: 2 },
  earlyDiscount: { enabled: false, rate: 0, day: 5 },
  rounding: 100,
  roundingMode: 'nearest',
  applicationOrder: 'interest_first',
  lockedUntil: null,
}

/**
 * Sanity cap for the monthly late interest rate. The legal maximum is 1.5 times
 * the bank rate certified each month by the Superintendencia Financiera (art. 30
 * Ley 675), never above the usury rate; conjuntos must keep theirs updated.
 */
export const MAX_MONTHLY_INTEREST_RATE = 5

/** Settings stored in the tenant merged over the defaults */
export function financeSettings(stored: unknown): FinanceSettings {
  const value = (stored ?? {}) as Partial<FinanceSettings>
  return {
    ...DEFAULT_FINANCE_SETTINGS,
    ...value,
    lateInterest: { ...DEFAULT_FINANCE_SETTINGS.lateInterest, ...value.lateInterest },
    earlyDiscount: { ...DEFAULT_FINANCE_SETTINGS.earlyDiscount, ...value.earlyDiscount },
  }
}

const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

/** "2026-11-01" → "noviembre 2026" */
export function periodLabel(period: string) {
  const [year, month] = period.slice(0, 7).split('-').map(Number)
  return `${MONTHS[month! - 1]} ${year}`
}

/** "2026-11-15" → "2026-11-01" */
export function periodOf(date: string) {
  return `${date.slice(0, 7)}-01`
}

/** "2026-11-01", 1 → "2026-12-01" */
export function addMonths(period: string, months: number) {
  const [year, month] = period.slice(0, 7).split('-').map(Number)
  const index = year! * 12 + (month! - 1) + months
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}-01`
}

/** Day `day` of the month of `period`, clamped to the month's last day */
export function dayOfPeriod(period: string, day: number) {
  const [year, month] = period.slice(0, 7).split('-').map(Number)
  const last = new Date(Date.UTC(year!, month!, 0)).getUTCDate()
  return `${period.slice(0, 7)}-${String(Math.min(day, last)).padStart(2, '0')}`
}
