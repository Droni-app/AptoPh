import app from '@adonisjs/core/services/app'
import PDFDocument from 'pdfkit'
import { fromCents } from '@aptoph/shared'
import type Tenant from '#models/tenants/tenant'

/**
 * Building blocks of the finance PDFs (recibo de caja, paz y salvo): letter
 * size, the brand fonts and colors and the conjunto's header.
 */

export const COLORS = {
  navy: '#1E3A5F',
  ink: '#102038',
  slate: '#4A607A',
  muted: '#7A8BA0',
  line: '#D9DEE5',
  mint: '#187A66',
  mintSoft: '#E6F7F2',
  coral: '#D64545',
  sand: '#F6F3EE',
}

export const FONT = { regular: 'Inter', bold: 'Inter-SemiBold', display: 'Jakarta' }

export type Pdf = PDFKit.PDFDocument

export const MARGIN = 56

/** A new letter-size document with the brand fonts registered */
export function createPdf(title: string): Pdf {
  const doc = new PDFDocument({
    size: 'LETTER',
    margin: MARGIN,
    info: { Title: title, Author: 'AptoPH', Creator: 'AptoPH' },
  })
  const font = (file: string) => app.makePath('resources/fonts', file)
  doc.registerFont(FONT.regular, font('Inter-400.ttf'))
  doc.registerFont(FONT.bold, font('Inter-600.ttf'))
  doc.registerFont(FONT.display, font('PlusJakartaSans-800.ttf'))
  doc.font(FONT.regular).fillColor(COLORS.ink)
  return doc
}

/** The finished document as bytes */
export function render(doc: Pdf): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    doc.end()
  })
}

export const contentWidth = (doc: Pdf) => doc.page.width - MARGIN * 2

/**
 * Conjunto name, NIT and address on the left; the document's title and
 * number on the right. Returns the y where the content starts.
 */
export function header(doc: Pdf, tenant: Tenant, title: string, number: string) {
  const width = contentWidth(doc)
  const top = MARGIN
  doc.rect(0, 0, doc.page.width, 6).fill(COLORS.navy)

  doc
    .font(FONT.display)
    .fontSize(16)
    .fillColor(COLORS.navy)
    .text(tenant.legalName || tenant.name, MARGIN, top, { width: width * 0.6 })
  const details = [
    tenant.taxId ? `NIT ${tenant.taxId}` : null,
    [tenant.address, tenant.city].filter(Boolean).join(', ') || null,
  ].filter(Boolean) as string[]
  doc.font(FONT.regular).fontSize(9).fillColor(COLORS.slate)
  for (const line of details) doc.text(line, { width: width * 0.6 })
  const leftBottom = doc.y

  doc
    .font(FONT.bold)
    .fontSize(9)
    .fillColor(COLORS.muted)
    .text(title.toUpperCase(), MARGIN + width * 0.55, top + 2, {
      width: width * 0.45,
      align: 'right',
      characterSpacing: 0.6,
    })
  doc
    .font(FONT.display)
    .fontSize(20)
    .fillColor(COLORS.ink)
    .text(number, MARGIN + width * 0.55, doc.y + 2, { width: width * 0.45, align: 'right' })

  const bottom = Math.max(leftBottom, doc.y) + 14
  doc
    .moveTo(MARGIN, bottom)
    .lineTo(MARGIN + width, bottom)
    .lineWidth(0.8)
    .strokeColor(COLORS.line)
    .stroke()
  return bottom + 18
}

/** Label over value, at (x, y) within `width` */
export function field(doc: Pdf, label: string, value: string, x: number, y: number, width: number) {
  doc
    .font(FONT.bold)
    .fontSize(8)
    .fillColor(COLORS.muted)
    .text(label.toUpperCase(), x, y, { width, characterSpacing: 0.4 })
  doc
    .font(FONT.regular)
    .fontSize(11)
    .fillColor(COLORS.ink)
    .text(value || '—', x, doc.y + 2, { width })
  return doc.y
}

/** Diagonal stamp across the page ("ANULADO") */
export function stamp(doc: Pdf, text: string) {
  doc.save()
  doc.rotate(-28, { origin: [doc.page.width / 2, doc.page.height / 2] })
  doc
    .font(FONT.display)
    .fontSize(96)
    .fillColor(COLORS.coral)
    .fillOpacity(0.12)
    .text(text, 0, doc.page.height / 2 - 60, { width: doc.page.width, align: 'center' })
  doc.restore()
  doc.fillOpacity(1)
}

/** Small print at the bottom of the page */
export function footer(doc: Pdf, text: string) {
  const width = contentWidth(doc)
  const y = doc.page.height - MARGIN + 10
  // Writing below the bottom margin would open a new page
  const bottom = doc.page.margins.bottom
  doc.page.margins.bottom = 0
  doc
    .font(FONT.regular)
    .fontSize(7.5)
    .fillColor(COLORS.muted)
    .text(text, MARGIN, y, { width, align: 'center', lineBreak: false })
  doc.page.margins.bottom = bottom
}

// ---------------------------------------------------------------- formats

const moneyFormat = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

/** "1250000.00" → "$ 1.250.000" */
export function money(value: string | number) {
  return moneyFormat.format(Number(value)).replaceAll('\u00A0', ' ')
}

export const moneyCents = (cents: number) => money(fromCents(cents))

const dateFormat = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

/** "2026-11-28" → "28 de noviembre de 2026" */
export function longDate(iso: string) {
  return dateFormat.format(new Date(`${iso.slice(0, 10)}T12:00:00Z`))
}

// ---------------------------------------------------------------- amount in words

const UNITS = [
  '',
  'uno',
  'dos',
  'tres',
  'cuatro',
  'cinco',
  'seis',
  'siete',
  'ocho',
  'nueve',
  'diez',
  'once',
  'doce',
  'trece',
  'catorce',
  'quince',
  'dieciséis',
  'diecisiete',
  'dieciocho',
  'diecinueve',
  'veinte',
  'veintiuno',
  'veintidós',
  'veintitrés',
  'veinticuatro',
  'veinticinco',
  'veintiséis',
  'veintisiete',
  'veintiocho',
  'veintinueve',
]
const TENS = [
  '',
  '',
  '',
  'treinta',
  'cuarenta',
  'cincuenta',
  'sesenta',
  'setenta',
  'ochenta',
  'noventa',
]
const HUNDREDS = [
  '',
  'ciento',
  'doscientos',
  'trescientos',
  'cuatrocientos',
  'quinientos',
  'seiscientos',
  'setecientos',
  'ochocientos',
  'novecientos',
]

/** 0–999; `apocope` turns "uno" into "un" (un mil, veintiún millones) */
function belowThousand(n: number, apocope: boolean): string {
  if (n === 100) return 'cien'
  const hundreds = Math.floor(n / 100)
  const rest = n % 100
  const parts: string[] = []
  if (hundreds) parts.push(HUNDREDS[hundreds]!)
  if (rest) {
    let words: string
    if (rest < 30) {
      words = UNITS[rest]!
    } else {
      const unit = rest % 10
      words = TENS[Math.floor(rest / 10)]! + (unit ? ` y ${UNITS[unit]}` : '')
    }
    if (apocope) words = words.replace(/uno$/, 'un').replace(/veintiun$/, 'veintiún')
    parts.push(words)
  }
  return parts.join(' ')
}

/** Whole number in Spanish words: 1250000 → "un millón doscientos cincuenta mil" */
export function numberToWords(value: number): string {
  const n = Math.floor(Math.abs(value))
  if (n === 0) return 'cero'
  const millions = Math.floor(n / 1_000_000)
  const thousands = Math.floor((n % 1_000_000) / 1000)
  const rest = n % 1000
  const parts: string[] = []
  if (millions) {
    parts.push(
      millions === 1
        ? 'un millón'
        : `${numberToWords(millions)
            .replace(/veintiuno$/, 'veintiún')
            .replace(/uno$/, 'un')} millones`
    )
  }
  if (thousands) parts.push(thousands === 1 ? 'mil' : `${belowThousand(thousands, true)} mil`)
  if (rest) parts.push(belowThousand(rest, false))
  return parts.join(' ')
}

/** Cents in words as written on receipts: "UN MILLÓN DE PESOS M/CTE" */
export function amountInWords(cents: number) {
  const pesos = Math.floor(cents / 100)
  const centavos = cents % 100
  // "un peso", "veintiún pesos"
  let words = numberToWords(pesos)
    .replace(/veintiuno$/, 'veintiún')
    .replace(/uno$/, 'un')
  // "un millón de pesos", "dos millones de pesos" (but "un millón cien mil pesos")
  const of = pesos > 0 && pesos % 1_000_000 === 0 ? ' de' : ''
  words = `${words}${of} ${pesos === 1 ? 'peso' : 'pesos'}`
  if (centavos) words += ` con ${centavos}/100`
  return `${words} m/cte`.toUpperCase()
}
