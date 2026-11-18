/**
 * Money rules shared by the API and the web apps. Amounts travel as decimal
 * strings ("350000.00") and are computed as integer cents, so sums never lose
 * precision. COP has no coins below 50 pesos: computed fees are rounded to a
 * whole multiple of pesos (see `roundPesos`).
 */
import type { RoundingMode } from './domain.js'

/** "350000.50" | 350000.5 → 35000050 */
export function toCents(amount: string | number | null | undefined): number {
  if (amount === null || amount === undefined || amount === '') return 0
  const value = typeof amount === 'number' ? amount : Number(amount)
  if (!Number.isFinite(value)) throw new Error(`Invalid amount: ${amount}`)
  return Math.round(value * 100)
}

/** 35000050 → "350000.50" */
export function fromCents(cents: number): string {
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(Math.round(cents))
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`
}

/**
 * Rounds cents to a multiple of `step` pesos (1, 10, 50, 100, 1000).
 * `nearest` rounds half up; `up` never charges less than the exact value.
 */
export function roundPesos(cents: number, step = 1, mode: RoundingMode = 'nearest'): number {
  const unit = step * 100
  return mode === 'up' ? Math.ceil(cents / unit - 1e-9) * unit : Math.round(cents / unit) * unit
}

/** `rate` is a percentage: percentOf(100000, 1.5) → 1500, rounded to cents */
export function percentOf(cents: number, rate: number): number {
  return Math.round((cents * rate) / 100)
}

/**
 * Splits `total` cents among weights so the parts add up exactly to the
 * total (largest remainder method). Zero weights get zero.
 */
export function splitByWeights(total: number, weights: number[]): number[] {
  const sum = weights.reduce((acc, weight) => acc + weight, 0)
  if (sum <= 0) return weights.map(() => 0)
  const exact = weights.map((weight) => (total * weight) / sum)
  const parts = exact.map(Math.floor)
  let remainder = total - parts.reduce((acc, part) => acc + part, 0)
  const order = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction)
  for (const { index } of order) {
    if (remainder <= 0) break
    parts[index]! += 1
    remainder -= 1
  }
  return parts
}
