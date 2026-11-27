import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { normalizePlate, quoteParking, type ParkingTariff } from '@aptoph/shared'
import { splitByDay } from '#services/gatehouse/visitor_parking'

const ZONE = 'America/Bogota'
const at = (iso: string) => DateTime.fromISO(iso, { zone: ZONE })

const tariff = (overrides: Partial<ParkingTariff> = {}): ParkingTariff => ({
  hourlyRate: 3000,
  dailyCap: null,
  graceMinutes: 60,
  fractionMinutes: 30,
  vatRate: 0,
  ...overrides,
})

test.group('Visitor parking · price', () => {
  test('a stay is split at midnight in the conjunto time zone', ({ assert }) => {
    assert.deepEqual(splitByDay(at('2026-11-20T22:00'), at('2026-11-21T02:15'), ZONE), [
      { date: '2026-11-20', minutes: 120 },
      { date: '2026-11-21', minutes: 135 },
    ])
    // Three days: a whole day in the middle
    const long = splitByDay(at('2026-11-20T23:00'), at('2026-11-22T01:00'), ZONE)
    assert.deepEqual(
      long.map((day) => day.minutes),
      [60, 1440, 60]
    )
    assert.deepEqual(splitByDay(at('2026-11-20T10:00'), at('2026-11-20T10:00'), ZONE), [
      { date: '2026-11-20', minutes: 0 },
    ])
  })

  test('grace first, then the rest rounded up to the fraction', ({ assert }) => {
    const quote = quoteParking(tariff(), [{ date: '2026-11-20', minutes: 100 }])
    assert.equal(quote.graceMinutes, 60)
    assert.equal(quote.billedMinutes, 60) // 40 → 60
    assert.equal(quote.total, 3000)

    assert.equal(quoteParking(tariff(), [{ date: '2026-11-20', minutes: 45 }]).total, 0)
    assert.equal(
      quoteParking(tariff({ fractionMinutes: 1 }), [{ date: '2026-11-20', minutes: 70 }]).total,
      500
    )
  })

  test('the daily grace is shared by the stays of a plate and resets each day', ({ assert }) => {
    // 40 grace minutes already used on the 20th by an earlier stay
    const quote = quoteParking(
      tariff(),
      [
        { date: '2026-11-20', minutes: 120 },
        { date: '2026-11-21', minutes: 120 },
      ],
      { '2026-11-20': 40 }
    )
    assert.deepEqual(
      quote.days.map((day) => [day.graceMinutes, day.billedMinutes, day.amount]),
      [
        [20, 120, 6000],
        [60, 60, 3000],
      ]
    )
    assert.equal(quote.total, 9000)
  })

  test('daily cap and VAT included in the rate', ({ assert }) => {
    const capped = quoteParking(tariff({ dailyCap: 10_000, graceMinutes: 0 }), [
      { date: '2026-11-20', minutes: 600 },
      { date: '2026-11-21', minutes: 60 },
    ])
    assert.deepEqual(
      capped.days.map((day) => day.amount),
      [10_000, 3000]
    )

    const withVat = quoteParking(tariff({ vatRate: 19, graceMinutes: 0, fractionMinutes: 60 }), [
      { date: '2026-11-20', minutes: 60 },
    ])
    assert.equal(withVat.total, 3000)
    assert.equal(withVat.base, 2521)
    assert.equal(withVat.vat, 479)
  })

  test('plates are compared without spaces or dashes', ({ assert }) => {
    assert.equal(normalizePlate(' abc-12d '), 'ABC12D')
    assert.isNull(normalizePlate(' - '))
  })
})
