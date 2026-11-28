import { createHash } from 'node:crypto'
import ExcelJS from 'exceljs'
import { parse } from 'csv-parse/sync'
import { DateTime } from 'luxon'
import { Exception } from '@adonisjs/core/exceptions'
import db from '@adonisjs/lucid/services/db'
import {
  type BankColumnMapping,
  type BankDateFormat,
  type BankLineSuggestion,
  type PaymentMethod,
  fromCents,
  toCents,
} from '@aptoph/shared'
import FieldException from '#exceptions/field_exception'
import BankStatement from '#models/finance/bank_statement'
import BankStatementLine from '#models/finance/bank_statement_line'
import CashAccount from '#models/finance/cash_account'
import Payment from '#models/finance/payment'
import VendorPayment from '#models/finance/vendor_payment'
import Unit from '#models/property/unit'
import type Tenant from '#models/tenants/tenant'
import { decodeCsv, normalizeKey } from '#services/property/property_import'
import { PaymentService } from '#services/finance/payments'
import type { FinanceScope } from '#services/finance/scope'
import { iso } from '#services/finance/support'

/**
 * Bank reconciliation: import a statement (CSV or Excel) of a bank account
 * and match its movements with cash receipts, residents' reports, units (by
 * the reference they pay with) and egresos. docs/finance.md §7.
 */

export type ParsedLine = {
  line: number
  postedOn: string
  description: string
  reference: string | null
  /** Cents; positive = money in */
  amount: number
}

const MAX_ROWS = 5000

// ---------------------------------------------------------------- reading the file

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === 'object') {
    if ('result' in value) return cellText(value.result as ExcelJS.CellValue)
    if ('text' in value) return String(value.text)
    if ('richText' in value) return value.richText.map((part) => part.text).join('')
    return ''
  }
  return String(value)
}

/** The first sheet of an .xlsx, or the CSV, as rows of text */
export async function readTable(bytes: Buffer): Promise<string[][]> {
  let rows: string[][]
  if (bytes.subarray(0, 2).toString() === 'PK') {
    const workbook = new ExcelJS.Workbook()
    try {
      await workbook.xlsx.load(bytes as unknown as ArrayBuffer)
    } catch {
      throw new FieldException(
        'file',
        'No pudimos leer el archivo de Excel. Guárdalo como .xlsx o CSV.'
      )
    }
    const sheet = workbook.worksheets[0]
    if (!sheet) throw new FieldException('file', 'El archivo no tiene hojas')
    rows = []
    sheet.eachRow({ includeEmpty: false }, (row) => {
      const values = row.values as ExcelJS.CellValue[]
      rows.push(values.slice(1).map((value) => cellText(value).trim()))
    })
  } else if (bytes.subarray(0, 4).toString('hex') === 'd0cf11e0') {
    throw new FieldException(
      'file',
      'Los archivos .xls antiguos no se pueden leer. Ábrelo en Excel y guárdalo como .xlsx o CSV.'
    )
  } else {
    const text = decodeCsv(bytes)
    // Banks put account details before the header: the delimiter is the most
    // frequent one across the first lines
    const sample = text.split(/\r?\n/).slice(0, 30).join('\n')
    const delimiter = [';', ',', '\t', '|']
      .map((d) => [d, sample.split(d).length] as const)
      .sort((a, b) => b[1] - a[1])[0]![0]
    try {
      rows = (
        parse(text, {
          delimiter,
          relax_column_count: true,
          relax_quotes: true,
          skip_empty_lines: true,
        }) as string[][]
      ).map((row) => row.map((cell) => cell.trim()))
    } catch {
      throw new FieldException(
        'file',
        'No pudimos leer el archivo. Revisa que sea un CSV o un Excel.'
      )
    }
  }
  rows = rows.filter((row) => row.some((cell) => cell !== ''))
  if (rows.length === 0) throw new FieldException('file', 'El archivo está vacío')
  if (rows.length > MAX_ROWS) {
    throw new FieldException(
      'file',
      `El archivo tiene más de ${MAX_ROWS} filas. Divídelo por meses.`
    )
  }
  return rows
}

// ---------------------------------------------------------------- values

/** "$ 1.250.000,50" | "1,250,000.50" | "(150.000)" | "150.000-" → cents, or null */
export function parseAmount(raw: string): number | null {
  let text = raw.replace(/\s|\$|COP/gi, '')
  if (!text) return null
  let negative = false
  if (/^\(.*\)$/.test(text)) {
    negative = true
    text = text.slice(1, -1)
  }
  if (text.endsWith('-')) {
    negative = true
    text = text.slice(0, -1)
  }
  if (text.startsWith('-')) {
    negative = !negative
    text = text.slice(1)
  } else if (text.startsWith('+')) {
    text = text.slice(1)
  }
  if (!/^[\d.,]+$/.test(text)) return null
  const lastDot = text.lastIndexOf('.')
  const lastComma = text.lastIndexOf(',')
  let normalized: string
  if (lastDot >= 0 && lastComma >= 0) {
    // The last one is the decimal separator
    normalized =
      lastComma > lastDot ? text.replace(/\./g, '').replace(',', '.') : text.replace(/,/g, '')
  } else if (lastComma >= 0) {
    normalized =
      /,\d{1,2}$/.test(text) && text.split(',').length === 2
        ? text.replace(',', '.')
        : text.replace(/,/g, '')
  } else if (lastDot >= 0) {
    // "1.250.000" and "1.250" are thousands (pesos); "1250.5" is a decimal
    normalized = /^\d{1,3}(\.\d{3})+$/.test(text) ? text.replace(/\./g, '') : text
  } else {
    normalized = text
  }
  const value = Number(normalized)
  if (!Number.isFinite(value)) return null
  const cents = Math.round(value * 100)
  return negative ? -cents : cents
}

/** A date of the statement as ISO, by the chosen order of day, month and year */
export function parseDate(raw: string, format: BankDateFormat): string | null {
  const text = raw.trim()
  if (!text) return null
  let year: number
  let month: number
  let day: number
  let match = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(text)
  if (match) {
    ;[year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  } else if ((match = /^(\d{4})(\d{2})(\d{2})$/.exec(text))) {
    ;[year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  } else if ((match = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/.exec(text))) {
    const [a, b] = [Number(match[1]), Number(match[2])]
    year = Number(match[3])
    if (year < 100) year += 2000
    ;[day, month] = format === 'mdy' ? [b, a] : [a, b]
  } else {
    return null
  }
  const date = DateTime.fromObject({ year, month, day })
  return date.isValid ? date.toISODate() : null
}

// ---------------------------------------------------------------- columns

const HEADER_PATTERNS = {
  date: /^fecha|^date/,
  description: /descrip|concepto|detalle|transacc|movimiento|^nombre/,
  reference: /referencia|^ref|documento|comprobante|^doc/,
  credit: /credito|abono|ingreso|entrada|consignac|deposito/,
  debit: /debito|cargo|retiro|egreso|salida/,
  amount: /^valor|^monto|^importe|^amount|^valor_transac/,
}

/** Header row and columns guessed from the names banks use */
export function guessMapping(rows: string[][]): BankColumnMapping {
  let headerRow = 0
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const keys = rows[i]!.map(normalizeKey)
    if (
      keys.some((key) => HEADER_PATTERNS.date.test(key)) &&
      keys.some((key) => /valor|monto|importe|credito|debito|amount/.test(key))
    ) {
      headerRow = i
      break
    }
  }
  const keys = (rows[headerRow] ?? []).map(normalizeKey)
  const find = (pattern: RegExp, exclude: number[] = []) => {
    const index = keys.findIndex((key, i) => !exclude.includes(i) && pattern.test(key))
    return index >= 0 ? index : null
  }
  const date = find(HEADER_PATTERNS.date) ?? 0
  const credit = find(HEADER_PATTERNS.credit, [date])
  const debit = find(HEADER_PATTERNS.debit, [date])
  const twoColumns = credit !== null && debit !== null
  const amount = twoColumns ? null : (find(HEADER_PATTERNS.amount, [date]) ?? credit ?? debit)
  const used = [date, credit, debit, amount].filter((i): i is number => i !== null)
  const reference = find(HEADER_PATTERNS.reference, used)
  const description = find(HEADER_PATTERNS.description, [
    ...used,
    ...(reference === null ? [] : [reference]),
  ])

  // Day first (Colombia) unless the values say otherwise
  let dateFormat: BankDateFormat = 'dmy'
  const samples = rows.slice(headerRow + 1, headerRow + 60).map((row) => row[date] ?? '')
  if (samples.some((value) => /^\d{4}/.test(value))) dateFormat = 'ymd'
  else if (
    samples.some((value) => {
      const match = /^(\d{1,2})[-/.](\d{1,2})[-/.]/.exec(value)
      return match && Number(match[2]) > 12
    })
  )
    dateFormat = 'mdy'

  return {
    headerRow,
    date,
    description,
    reference,
    amount: twoColumns ? null : amount,
    credit: twoColumns ? credit : null,
    debit: twoColumns ? debit : null,
    dateFormat,
  }
}

/** The movements of the file with that mapping; rows without a date are skipped */
export function readLines(rows: string[][], mapping: BankColumnMapping) {
  const lines: ParsedLine[] = []
  const errors: Array<{ line: number; message: string }> = []
  if (mapping.amount === null && mapping.credit === null && mapping.debit === null) {
    throw new FieldException('amount', 'Indica la columna del valor, o las de créditos y débitos')
  }
  rows.forEach((row, index) => {
    if (index <= mapping.headerRow) return
    const line = index + 1
    const postedOn = parseDate(row[mapping.date] ?? '', mapping.dateFormat)
    // Totals, balances and blank rows at the end of the file
    if (!postedOn) return
    let amount: number | null
    if (mapping.amount !== null) {
      amount = parseAmount(row[mapping.amount] ?? '')
    } else {
      const credit = mapping.credit === null ? 0 : parseAmount(row[mapping.credit] ?? '')
      const debit = mapping.debit === null ? 0 : parseAmount(row[mapping.debit] ?? '')
      amount =
        credit === null && debit === null ? null : Math.abs(credit ?? 0) - Math.abs(debit ?? 0)
    }
    if (amount === null) {
      errors.push({ line, message: 'El valor no es un número' })
      return
    }
    if (amount === 0) return
    const text = (column: number | null) => (column === null ? '' : (row[column] ?? '').trim())
    lines.push({
      line,
      postedOn,
      description: text(mapping.description).slice(0, 255),
      reference: text(mapping.reference).slice(0, 100) || null,
      amount,
    })
  })
  return { lines, errors }
}

// ---------------------------------------------------------------- matching

/** Comparable form of references and unit codes: letters and digits only */
const norm = (value: string | null | undefined) =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')

/** Words of a text, and each pair of neighbors joined ("T1 101" → "T1101") */
function tokens(text: string) {
  const words = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean)
  const joined = words.slice(1).map((word, i) => words[i] + word)
  return new Set([...words, ...joined])
}

const daysBetween = (a: string, b: string) =>
  Math.abs(DateTime.fromISO(a).diff(DateTime.fromISO(b), 'days').days)

type UnitRef = { id: string; code: string; type: Unit['type']; building: string | null }

function sameReference(line: BankStatementLine, reference: string | null) {
  const ref = norm(reference)
  if (ref.length < 4) return false
  const lineRef = norm(line.reference)
  return (
    lineRef === ref ||
    (lineRef.length >= 4 && (lineRef.includes(ref) || ref.includes(lineRef))) ||
    norm(line.description).includes(ref)
  )
}

/** The unit the movement names: by its reference (high) or its description (medium) */
function unitOf(line: BankStatementLine, units: Map<string, UnitRef[]>) {
  const byReference = units.get(norm(line.reference))
  if (byReference?.length === 1) return { unit: byReference[0]!, confidence: 'high' as const }
  const found = new Map<string, UnitRef>()
  for (const token of tokens(`${line.reference ?? ''} ${line.description}`)) {
    if (token.length < 3) continue
    for (const unit of units.get(token) ?? []) found.set(unit.id, unit)
  }
  if (found.size === 1) return { unit: [...found.values()][0]!, confidence: 'medium' as const }
  return null
}

export class BankStatementService {
  constructor(private tenant: Tenant) {}

  private get zone() {
    return this.tenant.timezone || 'America/Bogota'
  }

  async cashAccount(id: string) {
    const account = await CashAccount.query()
      .where('tenant_id', this.tenant.id)
      .where('id', id)
      .first()
    if (!account) throw new FieldException('cashAccountId', 'La cuenta bancaria no existe')
    if (account.type !== 'bank') {
      throw new FieldException('cashAccountId', 'Los extractos se importan a cuentas bancarias')
    }
    return account
  }

  /** What the file looks like and what would be imported, without writing */
  async preview(bytes: Buffer, mapping?: BankColumnMapping) {
    const rows = await readTable(bytes)
    const used = mapping ?? guessMapping(rows)
    const { lines, errors } = readLines(rows, used)
    return {
      rows: rows.slice(0, 25),
      mapping: used,
      sample: lines.slice(0, 8).map((line) => ({
        postedOn: line.postedOn,
        description: line.description,
        reference: line.reference,
        amount: fromCents(line.amount),
      })),
      total: lines.length,
      errors: errors.slice(0, 20),
    }
  }

  /**
   * Imports the movements of the file to the account. Movements that an
   * earlier import already had (same date, value, reference, description and
   * repetition in the file) are skipped.
   */
  async import(input: {
    cashAccountId: string
    fileName: string
    bytes: Buffer
    mapping: BankColumnMapping
    userId: string
  }) {
    const account = await this.cashAccount(input.cashAccountId)
    const rows = await readTable(input.bytes)
    const { lines } = readLines(rows, input.mapping)
    if (lines.length === 0) {
      throw new FieldException(
        'file',
        'No encontramos movimientos con fecha y valor. Revisa las columnas elegidas.'
      )
    }
    const seen = new Map<string, number>()
    const withPrints = lines.map((line) => {
      const key = [line.postedOn, line.amount, norm(line.reference), norm(line.description)].join(
        '|'
      )
      const occurrence = (seen.get(key) ?? 0) + 1
      seen.set(key, occurrence)
      const fingerprint = createHash('sha256').update(`${key}|${occurrence}`).digest('hex')
      return { ...line, fingerprint }
    })
    const stored: Array<{ fingerprint: string }> = await db
      .from('bank_statement_lines')
      .where('tenant_id', this.tenant.id)
      .where('cash_account_id', account.id)
      .whereIn(
        'fingerprint',
        withPrints.map((line) => line.fingerprint)
      )
      .select('fingerprint')
    const existing = new Set(stored.map((row) => row.fingerprint))
    const fresh = withPrints.filter((line) => !existing.has(line.fingerprint))
    if (fresh.length === 0) {
      throw new FieldException(
        'file',
        'Todos los movimientos de este archivo ya estaban importados'
      )
    }
    const dates = fresh.map((line) => line.postedOn).sort()

    return db.transaction(async (trx) => {
      const statement = await BankStatement.create(
        {
          tenantId: this.tenant.id,
          cashAccountId: account.id,
          fileName: input.fileName.slice(0, 200),
          startsOn: DateTime.fromISO(dates[0]!),
          endsOn: DateTime.fromISO(dates.at(-1)!),
          linesCount: fresh.length,
          duplicatesCount: withPrints.length - fresh.length,
          importedById: input.userId,
        },
        { client: trx }
      )
      await BankStatementLine.createMany(
        fresh.map((line) => ({
          tenantId: this.tenant.id,
          bankStatementId: statement.id,
          cashAccountId: account.id,
          line: line.line,
          postedOn: DateTime.fromISO(line.postedOn),
          description: line.description,
          reference: line.reference,
          amount: fromCents(line.amount),
          fingerprint: line.fingerprint,
          status: 'pending' as const,
        })),
        { client: trx }
      )
      return statement
    })
  }

  /** Statements of the conjunto, newest first, with how many lines are done */
  async list(cashAccountId?: string) {
    const query = BankStatement.query()
      .where('tenant_id', this.tenant.id)
      .preload('cashAccount')
      .preload('importedBy')
      .orderBy('created_at', 'desc')
      .limit(100)
    if (cashAccountId) query.where('cash_account_id', cashAccountId)
    const statements = await query
    const counts = await this.counts(statements.map((statement) => statement.id))
    return statements.map((statement) => ({ statement, counts: counts.get(statement.id) }))
  }

  async counts(ids: string[]) {
    const result = new Map<string, { pending: number; reconciled: number; ignored: number }>()
    if (ids.length === 0) return result
    const rows = await db
      .from('bank_statement_lines')
      .where('tenant_id', this.tenant.id)
      .whereIn('bank_statement_id', ids)
      .groupBy('bank_statement_id', 'status')
      .select('bank_statement_id', 'status')
      .count('* as total')
    for (const row of rows as Array<{ bank_statement_id: string; status: string; total: string }>) {
      const entry = result.get(row.bank_statement_id) ?? { pending: 0, reconciled: 0, ignored: 0 }
      entry[row.status as 'pending'] = Number(row.total)
      result.set(row.bank_statement_id, entry)
    }
    return result
  }

  async find(id: string) {
    const statement = await BankStatement.query()
      .where('tenant_id', this.tenant.id)
      .where('id', id)
      .preload('cashAccount')
      .preload('importedBy')
      .first()
    if (!statement) throw new Exception('El extracto no existe', { status: 404 })
    return statement
  }

  async lines(statement: BankStatement) {
    return BankStatementLine.query()
      .where('tenant_id', this.tenant.id)
      .where('bank_statement_id', statement.id)
      .preload('payment', (payments) => payments.preload('unit'))
      .preload('vendorPayment', (payments) => payments.preload('vendor'))
      .preload('reconciledBy')
      .orderBy('posted_on')
      .orderBy('line')
  }

  /** Removes a statement while none of its movements has been reconciled */
  async destroy(statement: BankStatement) {
    const done = await BankStatementLine.query()
      .where('tenant_id', this.tenant.id)
      .where('bank_statement_id', statement.id)
      .where('status', 'reconciled')
      .first()
    if (done) {
      throw new Exception(
        'Este extracto ya tiene movimientos conciliados. Deshaz esas conciliaciones antes de eliminarlo.',
        { status: 409 }
      )
    }
    await statement.delete()
  }

  /**
   * What each pending movement most likely is. Money in: a receipt already
   * registered (same value, date within 5 days), a resident's report to
   * confirm, or a new payment of the unit its reference names. Money out: an
   * egreso. Each receipt, report or egreso is suggested once.
   */
  async suggestions(statement: BankStatement, lines: BankStatementLine[]) {
    const result = new Map<string, BankLineSuggestion>()
    const pending = lines.filter((line) => line.status === 'pending')
    if (pending.length === 0) return result
    const from = DateTime.fromISO(iso(statement.startsOn)!).minus({ days: 15 })
    const to = DateTime.fromISO(iso(statement.endsOn)!).plus({ days: 10 })
    const stamps: [string, string] = [
      DateTime.fromISO(from.toISODate()!, { zone: this.zone }).startOf('day').toSQL()!,
      DateTime.fromISO(to.toISODate()!, { zone: this.zone }).endOf('day').toSQL()!,
    ]
    const linked = db
      .from('bank_statement_lines')
      .where('tenant_id', this.tenant.id)
      .whereNotNull('payment_id')
      .select('payment_id')

    const [receipts, reports, egresos, units] = await Promise.all([
      Payment.query()
        .where('tenant_id', this.tenant.id)
        .where('status', 'confirmed')
        .where('cash_account_id', statement.cashAccountId)
        .whereBetween('paid_at', stamps)
        .whereNotIn('id', linked)
        .preload('unit')
        .orderBy('paid_at'),
      Payment.query()
        .where('tenant_id', this.tenant.id)
        .where('status', 'pending_review')
        .whereBetween('paid_at', stamps)
        .preload('unit')
        .orderBy('paid_at'),
      VendorPayment.query()
        .where('tenant_id', this.tenant.id)
        .where('status', 'confirmed')
        .where('cash_account_id', statement.cashAccountId)
        .whereBetween('paid_on', [from.toISODate()!, to.toISODate()!])
        .whereNotIn(
          'id',
          db
            .from('bank_statement_lines')
            .where('tenant_id', this.tenant.id)
            .whereNotNull('vendor_payment_id')
            .select('vendor_payment_id')
        )
        .preload('vendor'),
      Unit.query().where('tenant_id', this.tenant.id).whereNull('deleted_at').preload('building'),
    ])

    const unitMap = new Map<string, UnitRef[]>()
    for (const unit of units) {
      const ref = {
        id: unit.id,
        code: unit.code,
        type: unit.type,
        building: unit.building?.name ?? null,
      }
      const keys = new Set([norm(unit.code)])
      // "101" in tower "Torre 2" is also written "T2101" or "2101"
      if (unit.building) {
        const digits = norm(unit.building.name).replace(/^\D+/, '')
        if (digits) {
          keys.add(`T${digits}${norm(unit.code)}`)
          keys.add(`${digits}${norm(unit.code)}`)
        }
      }
      for (const key of keys) {
        if (!key) continue
        unitMap.set(key, [...(unitMap.get(key) ?? []), ref])
      }
    }

    const paidOn = (payment: Payment) => payment.paidAt.setZone(this.zone).toISODate()!
    const describe = (payment: Payment) => ({
      id: payment.id,
      number: payment.number,
      unit: payment.unit?.code ?? null,
      paidAt: payment.paidAt.toISO()!,
      amount: payment.amount,
      reference: payment.reference,
    })
    const used = new Set<string>()

    /** Best candidate: same reference, else same unit, else the only one */
    const pick = (
      line: BankStatementLine,
      candidates: Payment[],
      unit: ReturnType<typeof unitOf>
    ): { payment: Payment; confidence: 'high' | 'medium'; reason: string } | null => {
      const free = candidates.filter((payment) => !used.has(payment.id))
      const byRef = free.find((payment) => sameReference(line, payment.reference))
      if (byRef) return { payment: byRef, confidence: 'high', reason: 'Misma referencia y valor' }
      if (unit) {
        const byUnit = free.filter((payment) => payment.unitId === unit.unit.id)
        if (byUnit.length === 1)
          return {
            payment: byUnit[0]!,
            confidence: unit.confidence,
            reason: `La referencia indica la unidad ${unit.unit.code}`,
          }
      }
      if (free.length === 1)
        return { payment: free[0]!, confidence: 'medium', reason: 'Mismo valor y fecha cercana' }
      return null
    }

    // Lines with a reference first, so the clearer matches take their receipt
    const ordered = [...pending].sort((a, b) => Number(!a.reference) - Number(!b.reference))
    for (const line of ordered) {
      const cents = toCents(line.amount)
      const day = iso(line.postedOn)!
      if (cents > 0) {
        const unit = unitOf(line, unitMap)
        const receipt = pick(
          line,
          receipts.filter(
            (payment) => toCents(payment.amount) === cents && daysBetween(paidOn(payment), day) <= 5
          ),
          unit
        )
        if (receipt) {
          used.add(receipt.payment.id)
          result.set(line.id, {
            action: 'link',
            confidence: receipt.confidence,
            reason: receipt.reason,
            payment: describe(receipt.payment),
          })
          continue
        }
        const report = pick(
          line,
          reports.filter(
            (payment) =>
              toCents(payment.amount) === cents && daysBetween(paidOn(payment), day) <= 10
          ),
          unit
        )
        if (report) {
          used.add(report.payment.id)
          result.set(line.id, {
            action: 'confirm',
            confidence: report.confidence,
            reason: `Pago reportado por el residente · ${report.reason.toLowerCase()}`,
            payment: describe(report.payment),
          })
          continue
        }
        if (unit) {
          result.set(line.id, {
            action: 'register',
            confidence: unit.confidence,
            reason:
              unit.confidence === 'high'
                ? `La referencia es la unidad ${unit.unit.code}`
                : `La descripción menciona la unidad ${unit.unit.code}`,
            unit: unit.unit,
          })
        }
      } else {
        const free = egresos.filter(
          (egreso) =>
            !used.has(egreso.id) &&
            toCents(egreso.amount) === -cents &&
            daysBetween(iso(egreso.paidOn)!, day) <= 5
        )
        const byRef = free.find((egreso) => sameReference(line, egreso.reference))
        const egreso = byRef ?? (free.length === 1 ? free[0] : null)
        if (egreso) {
          used.add(egreso.id)
          result.set(line.id, {
            action: 'link_vendor_payment',
            confidence: byRef ? 'high' : 'medium',
            reason: byRef ? 'Misma referencia y valor' : 'Mismo valor y fecha cercana',
            vendorPayment: {
              id: egreso.id,
              number: egreso.number,
              vendor: egreso.vendor?.name ?? null,
              paidOn: iso(egreso.paidOn)!,
              amount: egreso.amount,
            },
          })
        }
      }
    }
    return result
  }
}

// ---------------------------------------------------------------- reconciling

export type ReconcileAction =
  | { action: 'link'; paymentId: string }
  | { action: 'confirm'; paymentId: string }
  | { action: 'register'; unitId: string; method?: PaymentMethod; notes?: string | null }
  | { action: 'link_vendor_payment'; vendorPaymentId: string }
  | { action: 'ignore'; note: string }

/** The pending line, locked */
async function lockedLine(scope: FinanceScope, id: string) {
  const line = await BankStatementLine.query({ client: scope.trx })
    .where('tenant_id', scope.tenant.id)
    .where('id', id)
    .forUpdate()
    .first()
  if (!line) throw new Exception('El movimiento no existe', { status: 404 })
  return line
}

function assertPending(line: BankStatementLine) {
  if (line.status !== 'pending') {
    throw new Exception('Este movimiento ya fue conciliado', { status: 409 })
  }
}

async function assertFreePayment(scope: FinanceScope, paymentId: string) {
  const other = await BankStatementLine.query({ client: scope.trx })
    .where('tenant_id', scope.tenant.id)
    .where('payment_id', paymentId)
    .first()
  if (other) {
    throw new FieldException('paymentId', 'Ese recibo ya está conciliado con otro movimiento')
  }
}

/**
 * Reconciles a movement. Returns the payment that was confirmed or registered
 * (to notify the resident after the commit).
 */
export async function reconcileLine(scope: FinanceScope, lineId: string, input: ReconcileAction) {
  const { trx, tenant, userId } = scope
  const line = await lockedLine(scope, lineId)
  assertPending(line)
  const cents = toCents(line.amount)
  let notify: { payment: Payment; outcome: 'confirmed' | 'registered' } | null = null

  if (input.action === 'link' || input.action === 'confirm') {
    if (cents <= 0)
      throw new FieldException('paymentId', 'Un pago solo se concilia con una entrada de dinero')
    const payment = await Payment.query({ client: trx })
      .where('tenant_id', tenant.id)
      .where('id', input.paymentId)
      .forUpdate()
      .first()
    if (!payment) throw new FieldException('paymentId', 'El pago no existe')
    if (toCents(payment.amount) !== cents) {
      throw new FieldException('paymentId', 'El valor del pago no coincide con el del movimiento')
    }
    await assertFreePayment(scope, payment.id)
    if (input.action === 'link') {
      if (payment.status !== 'confirmed') {
        throw new FieldException('paymentId', 'Solo se concilian recibos de caja confirmados')
      }
      if (payment.cashAccountId !== line.cashAccountId) {
        throw new FieldException('paymentId', 'Ese recibo ingresó a otra cuenta')
      }
    } else {
      await new PaymentService(scope).confirm(payment, line.cashAccountId)
      notify = { payment, outcome: 'confirmed' }
    }
    line.paymentId = payment.id
  } else if (input.action === 'register') {
    if (cents <= 0)
      throw new FieldException('unitId', 'Un pago solo se registra con una entrada de dinero')
    const reference = (line.reference || line.description).slice(0, 100) || null
    const payment = await new PaymentService(scope).register({
      unitId: input.unitId,
      amount: cents,
      paidAt: DateTime.fromISO(`${iso(line.postedOn)}T12:00:00`, {
        zone: tenant.timezone || 'America/Bogota',
      }),
      method: input.method ?? 'bank_transfer',
      reference,
      notes: input.notes ?? 'Registrado desde la conciliación bancaria',
      cashAccountId: line.cashAccountId,
    })
    line.paymentId = payment.id
    notify = { payment, outcome: 'registered' }
  } else if (input.action === 'link_vendor_payment') {
    if (cents >= 0) {
      throw new FieldException(
        'vendorPaymentId',
        'Un egreso solo se concilia con una salida de dinero'
      )
    }
    const egreso = await VendorPayment.query({ client: trx })
      .where('tenant_id', tenant.id)
      .where('id', input.vendorPaymentId)
      .first()
    if (!egreso || egreso.status !== 'confirmed') {
      throw new FieldException('vendorPaymentId', 'El egreso no existe o fue reversado')
    }
    if (egreso.cashAccountId !== line.cashAccountId || toCents(egreso.amount) !== -cents) {
      throw new FieldException('vendorPaymentId', 'El egreso no coincide en cuenta o valor')
    }
    const other = await BankStatementLine.query({ client: trx })
      .where('tenant_id', tenant.id)
      .where('vendor_payment_id', egreso.id)
      .first()
    if (other) throw new FieldException('vendorPaymentId', 'Ese egreso ya está conciliado')
    line.vendorPaymentId = egreso.id
  } else {
    line.note = input.note
  }

  line.status = input.action === 'ignore' ? 'ignored' : 'reconciled'
  line.reconciledById = userId
  line.reconciledAt = DateTime.now()
  await line.useTransaction(trx).save()
  return { line, notify }
}

/** Back to pending; the receipts it created or confirmed stay as they are */
export async function undoLine(scope: FinanceScope, lineId: string) {
  const line = await lockedLine(scope, lineId)
  if (line.status === 'pending') {
    throw new Exception('Este movimiento no está conciliado', { status: 409 })
  }
  line.status = 'pending'
  line.paymentId = null
  line.vendorPaymentId = null
  line.note = null
  line.reconciledById = null
  line.reconciledAt = null
  await line.useTransaction(scope.trx).save()
  return line
}
