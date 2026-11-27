import { test } from '@japa/runner'
import { MINIMUM_COVERS_UNITS, quote } from '@aptoph/shared'
import { slugify } from '#services/auth/signup_service'

test.group('Billing · prices', () => {
  test('a single price per unit, whatever the size of the conjunto', ({ assert }) => {
    for (const units of [101, 200, 201, 500, 501, 2_000]) {
      assert.equal(quote(units).pricePerUnit, 500)
      assert.equal(quote(units).monthly, units * 500)
      assert.isFalse(quote(units).minimumApplied)
    }
    assert.equal(quote(300).total, 150_000)
  })

  test('up to 100 units the conjunto pays the monthly minimum', ({ assert }) => {
    for (const units of [0, 1, 40, 49, 50, 99]) {
      assert.equal(quote(units).monthly, 50_000)
      assert.isTrue(quote(units).minimumApplied)
    }
    assert.equal(quote(100).monthly, 50_000)
    assert.isFalse(quote(100).minimumApplied)
    assert.equal(MINIMUM_COVERS_UNITS, 100)
  })
})

test.group('Sign-up · slugs', () => {
  test('slugify strips accents and symbols', ({ assert }) => {
    assert.equal(slugify('Conjunto Álamos del Río P.H.'), 'conjunto-alamos-del-rio-p-h')
    assert.equal(slugify('¡¡!!'), 'conjunto')
  })
})
