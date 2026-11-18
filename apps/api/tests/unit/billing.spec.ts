import { test } from '@japa/runner'
import { PRICE_TIERS, quote, tierLabel } from '@aptoph/shared'
import { slugify } from '#services/signup_service'

test.group('Billing · prices', () => {
  test('the size of the conjunto sets the price of every unit', ({ assert }) => {
    assert.equal(quote(200, 'monthly').pricePerUnit, 300)
    assert.equal(quote(201, 'monthly').pricePerUnit, 400)
    assert.equal(quote(500, 'monthly').pricePerUnit, 400)
    assert.equal(quote(501, 'monthly').pricePerUnit, 500)

    assert.equal(quote(200, 'monthly').monthly, 60_000)
    assert.equal(quote(300, 'monthly').monthly, 120_000)
    assert.equal(quote(800, 'monthly').monthly, 400_000)
  })

  test('small conjuntos pay the monthly minimum', ({ assert }) => {
    assert.equal(quote(40, 'monthly').monthly, 50_000)
    assert.equal(quote(0, 'monthly').monthly, 50_000)
  })

  test('annual cycle bills 10 months', ({ assert }) => {
    const price = quote(300, 'annual')
    assert.equal(price.total, 1_200_000)
    assert.equal(price.monthly, 100_000)
    assert.equal(price.annualSavings, 240_000)
    assert.equal(price.pricePerUnit, 333)
  })

  test('tier labels', ({ assert }) => {
    assert.deepEqual(PRICE_TIERS.map(tierLabel), [
      'Hasta 200 unidades',
      'De 201 a 500 unidades',
      'Más de 500 unidades',
    ])
  })
})

test.group('Sign-up · slugs', () => {
  test('slugify strips accents and symbols', ({ assert }) => {
    assert.equal(slugify('Conjunto Álamos del Río P.H.'), 'conjunto-alamos-del-rio-p-h')
    assert.equal(slugify('¡¡!!'), 'conjunto')
  })
})
