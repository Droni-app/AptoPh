import { describe, expect, it } from 'vitest'
import {
  formatArea,
  formatCoefficient,
  formatDate,
  formatMoney,
  formatPeriod,
  formatRelative,
  toIsoInstant,
  unitName,
} from '../format'

// Intl output uses non-breaking spaces; normalize them to compare
const plain = (text: string) => text.replace(/\s/g, ' ')

describe('format', () => {
  it('formats COP amounts without decimals for whole pesos', () => {
    expect(plain(formatMoney('350000.00'))).toBe('$ 350.000')
    expect(plain(formatMoney('1250.50'))).toBe('$ 1.250,50')
  })

  it('reads ISO dates as local calendar dates (no day shift)', () => {
    expect(formatDate('2026-11-01')).toBe('1 nov 2026')
    expect(formatPeriod('2026-11-01')).toBe('Noviembre 2026')
  })

  it('formats coefficients as percentages and areas in m²', () => {
    expect(plain(formatCoefficient('0.001250'))).toBe('0,1250 %')
    expect(formatArea('64.10')).toBe('64,1 m²')
    expect(formatArea(null)).toBe('—')
  })

  it('builds a readable unit name', () => {
    expect(unitName({ code: '101', type: 'apartment', building: { name: 'Torre 1' } })).toBe(
      'Torre 1 · Apartamento 101',
    )
    expect(unitName({ code: 'P-12', type: 'parking', building: null })).toBe('Parqueadero P-12')
  })
})

describe('date and time inputs', () => {
  it('turns local form values into an ISO instant', () => {
    const iso = toIsoInstant('2026-11-20', '19:00')
    expect(iso).toMatch(/^2026-11-2\dT\d{2}:00:00\.000Z$/)
    expect(new Date(iso).getHours()).toBe(19)
  })

  it('describes recent activity', () => {
    const now = Date.parse('2026-11-14T12:00:00Z')
    expect(formatRelative('2026-11-14T09:00:00Z', now)).toBe('hace 3 horas')
    expect(formatRelative('2026-11-12T12:00:00Z', now)).toBe('anteayer')
  })
})
