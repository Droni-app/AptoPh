import { test } from '@japa/runner'
import { amountInWords, numberToWords } from '#services/finance/pdf'
import { guessMapping, parseAmount, parseDate, readLines } from '#services/finance/bank_statements'

test.group('Recaudo · amount in words', () => {
  test('writes pesos as receipts do', ({ assert }) => {
    assert.equal(numberToWords(1), 'uno')
    assert.equal(numberToWords(21), 'veintiuno')
    assert.equal(numberToWords(100), 'cien')
    assert.equal(numberToWords(101), 'ciento uno')
    assert.equal(numberToWords(1000), 'mil')
    assert.equal(numberToWords(21_000), 'veintiún mil')
    assert.equal(numberToWords(350_000), 'trescientos cincuenta mil')
    assert.equal(numberToWords(1_000_000), 'un millón')
    assert.equal(numberToWords(1_250_000), 'un millón doscientos cincuenta mil')
    assert.equal(numberToWords(21_000_000), 'veintiún millones')
    assert.equal(numberToWords(2_501_001), 'dos millones quinientos un mil uno')
    assert.equal(amountInWords(35_000_000), 'TRESCIENTOS CINCUENTA MIL PESOS M/CTE')
    assert.equal(amountInWords(200_000_000), 'DOS MILLONES DE PESOS M/CTE')
    assert.equal(amountInWords(100), 'UN PESO M/CTE')
    assert.equal(amountInWords(125_050), 'MIL DOSCIENTOS CINCUENTA PESOS CON 50/100 M/CTE')
  })
})

test.group('Recaudo · bank statement values', () => {
  test('reads amounts in the formats banks export', ({ assert }) => {
    assert.equal(parseAmount('$ 1.250.000'), 125_000_000)
    assert.equal(parseAmount('1.250.000,50'), 125_000_050)
    assert.equal(parseAmount('1,250,000.50'), 125_000_050)
    assert.equal(parseAmount('350000'), 35_000_000)
    assert.equal(parseAmount('350000.5'), 35_000_050)
    assert.equal(parseAmount('-150.000'), -15_000_000)
    assert.equal(parseAmount('(150.000)'), -15_000_000)
    assert.equal(parseAmount('150.000-'), -15_000_000)
    assert.equal(parseAmount('12,5'), 1250)
    assert.isNull(parseAmount(''))
    assert.isNull(parseAmount('abc'))
  })

  test('reads dates by the chosen order', ({ assert }) => {
    assert.equal(parseDate('28/11/2026', 'dmy'), '2026-11-28')
    assert.equal(parseDate('2026-11-28', 'dmy'), '2026-11-28')
    assert.equal(parseDate('20261128', 'dmy'), '2026-11-28')
    assert.equal(parseDate('11/28/2026', 'mdy'), '2026-11-28')
    assert.equal(parseDate('5/1/26', 'dmy'), '2026-01-05')
    assert.isNull(parseDate('31/02/2026', 'dmy'))
    assert.isNull(parseDate('Saldo final', 'dmy'))
  })

  test('finds the header after the account details and reads the movements', ({ assert }) => {
    const rows = [
      ['Banco de prueba'],
      ['Cuenta de ahorros', '123-456'],
      ['Fecha', 'Descripción', 'Referencia', 'Débito', 'Crédito'],
      ['03/11/2026', 'TRANSFERENCIA PEREZ', '101', '', '350.000'],
      ['04/11/2026', 'COMISION', '', '12.000', ''],
      ['', 'Saldo final', '', '', '1.000.000'],
    ]
    const mapping = guessMapping(rows)
    assert.deepEqual(mapping, {
      headerRow: 2,
      date: 0,
      description: 1,
      reference: 2,
      amount: null,
      credit: 4,
      debit: 3,
      dateFormat: 'dmy',
    })
    const { lines, errors } = readLines(rows, mapping)
    assert.lengthOf(errors, 0)
    assert.deepEqual(
      lines.map((line) => [line.postedOn, line.reference, line.amount]),
      [
        ['2026-11-03', '101', 35_000_000],
        ['2026-11-04', null, -1_200_000],
      ]
    )
  })
})
