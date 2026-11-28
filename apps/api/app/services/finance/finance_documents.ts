import { randomInt } from 'node:crypto'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { Exception } from '@adonisjs/core/exceptions'
import env from '#start/env'
import { PAYMENT_METHOD_LABELS, UNIT_TYPE_LABELS, fromCents, toCents } from '@aptoph/shared'
import type { UnitType } from '@aptoph/shared'
import Charge from '#models/finance/charge'
import ClearanceCertificate from '#models/finance/clearance_certificate'
import Payment from '#models/finance/payment'
import Unit from '#models/property/unit'
import UnitOccupant from '#models/property/unit_occupant'
import Tenant from '#models/tenants/tenant'
import { chargeLabel } from '#services/finance/charges'
import { iso, nextNumber, todayFor } from '#services/finance/support'
import {
  COLORS,
  FONT,
  MARGIN,
  amountInWords,
  contentWidth,
  createPdf,
  field,
  footer,
  header,
  longDate,
  money,
  moneyCents,
  render,
  stamp,
} from '#services/finance/pdf'

/**
 * Documents of the recaudo: the recibo de caja of a payment and the paz y
 * salvo of a unit, as PDF. docs/finance.md §5.
 */

/** "Torre 1 · Apartamento 101" */
function unitName(unit: Unit) {
  const label = `${UNIT_TYPE_LABELS[unit.type as UnitType] ?? 'Unidad'} ${unit.code}`
  return unit.building ? `${unit.building.name} · ${label}` : label
}

/**
 * Who the documents name: the billing responsible, else an owner (primary
 * contact first), else the primary contact. Only people living there now.
 */
export async function holderOf(tenantId: string, unitId: string, today: string) {
  const people = await UnitOccupant.query()
    .where('tenant_id', tenantId)
    .where('unit_id', unitId)
    .where((query) => query.whereNull('ends_on').orWhere('ends_on', '>=', today))
  const rank = (person: UnitOccupant) =>
    person.isBillingResponsible
      ? 0
      : person.relationship === 'owner'
        ? person.isPrimaryContact
          ? 1
          : 2
        : person.isPrimaryContact
          ? 3
          : 9
  const holder = people.filter((person) => rank(person) < 9).sort((a, b) => rank(a) - rank(b))[0]
  if (!holder) return null
  const document = holder.documentNumber
    ? ` (${holder.documentType ? `${holder.documentType.toUpperCase()} ` : ''}${holder.documentNumber})`
    : ''
  return `${holder.fullName}${document}`
}

const generatedAt = (tenant: Tenant) =>
  DateTime.now()
    .setZone(tenant.timezone || 'America/Bogota')
    .setLocale('es-CO')
    .toFormat("d 'de' LLLL 'de' yyyy, h:mm a")

// ---------------------------------------------------------------- recibo de caja

/** PDF of a cash receipt (confirmed or reversed payments: those with a number) */
export async function receiptPdf(tenant: Tenant, payment: Payment) {
  if (payment.number === null) {
    throw new Exception('Este pago aún no tiene recibo de caja: primero hay que confirmarlo', {
      status: 409,
    })
  }
  await payment.load((loader) => {
    loader
      .load('unit', (units) => units.preload('building'))
      .load('cashAccount')
      .load('confirmedBy')
      .load('registeredBy')
      .load('allocations', (allocations) =>
        allocations.preload('charge', (charges) => charges.preload('chargeConcept'))
      )
  })
  const zone = tenant.timezone || 'America/Bogota'
  const paidOn = payment.paidAt.setZone(zone).toISODate()!
  const holder = await holderOf(tenant.id, payment.unitId, todayFor(tenant))
  const cents = toCents(payment.amount)
  const number = String(payment.number).padStart(6, '0')

  const doc = createPdf(`Recibo de caja ${number}`)
  const width = contentWidth(doc)
  let y = header(doc, tenant, 'Recibo de caja', `No. ${number}`)

  // Who paid, when and how
  const col = width / 3
  const row1 = Math.max(
    field(doc, 'Fecha de pago', longDate(paidOn), MARGIN, y, col - 12),
    field(doc, 'Unidad', unitName(payment.unit), MARGIN + col, y, col - 12),
    field(doc, 'Recibido de', holder ?? 'Propietario de la unidad', MARGIN + col * 2, y, col)
  )
  y = row1 + 14
  const row2 = Math.max(
    field(doc, 'Medio de pago', PAYMENT_METHOD_LABELS[payment.method], MARGIN, y, col - 12),
    field(doc, 'Referencia', payment.reference ?? '—', MARGIN + col, y, col - 12),
    field(doc, 'Ingresó a', payment.cashAccount?.name ?? '—', MARGIN + col * 2, y, col)
  )
  y = row2 + 20

  // The amount, in numbers and words
  doc.roundedRect(MARGIN, y, width, 64, 8).fill(COLORS.mintSoft)
  doc
    .font(FONT.bold)
    .fontSize(8)
    .fillColor(COLORS.mint)
    .text('LA SUMA DE', MARGIN + 16, y + 12, { characterSpacing: 0.4 })
  doc
    .font(FONT.display)
    .fontSize(22)
    .fillColor(COLORS.ink)
    .text(money(payment.amount), MARGIN + 16, y + 26, { width: width * 0.4 })
  doc
    .font(FONT.regular)
    .fontSize(9)
    .fillColor(COLORS.slate)
    .text(amountInWords(cents), MARGIN + width * 0.42, y + 16, {
      width: width * 0.55,
      height: 40,
      align: 'right',
    })
  y += 84

  // What it paid
  doc.font(FONT.bold).fontSize(10).fillColor(COLORS.navy).text('Aplicado a', MARGIN, y)
  y = doc.y + 6
  const rows: Array<[string, string]> = payment.allocations
    .filter((allocation) => allocation.charge)
    .map((allocation) => [
      chargeLabel(allocation.charge, allocation.charge.chargeConcept),
      money(allocation.amount),
    ])
  const unapplied = toCents(payment.unappliedAmount)
  if (unapplied > 0)
    rows.push(['Saldo a favor (se aplica en la próxima facturación)', moneyCents(unapplied)])
  if (rows.length === 0) rows.push(['Abono a la cuenta de la unidad', money(payment.amount)])
  for (const [label, value] of rows) {
    doc
      .font(FONT.regular)
      .fontSize(10)
      .fillColor(COLORS.ink)
      .text(label, MARGIN, y + 6, { width: width - 130 })
    const bottom = doc.y
    doc.text(value, MARGIN + width - 120, y + 6, { width: 120, align: 'right' })
    y = Math.max(bottom, doc.y) + 6
    doc
      .moveTo(MARGIN, y)
      .lineTo(MARGIN + width, y)
      .lineWidth(0.5)
      .strokeColor(COLORS.line)
      .stroke()
  }
  doc
    .font(FONT.bold)
    .fontSize(11)
    .fillColor(COLORS.ink)
    .text('Total', MARGIN, y + 8, { width: width - 130 })
    .text(money(payment.amount), MARGIN + width - 120, y + 8, { width: 120, align: 'right' })
  y = doc.y + 16

  if (payment.notes) {
    doc
      .font(FONT.regular)
      .fontSize(9)
      .fillColor(COLORS.slate)
      .text(`Observaciones: ${payment.notes}`, MARGIN, y, { width })
    y = doc.y + 12
  }

  if (payment.status === 'reversed') {
    stamp(doc, 'ANULADO')
    doc
      .font(FONT.bold)
      .fontSize(10)
      .fillColor(COLORS.coral)
      .text(
        `Recibo anulado${payment.reversedAt ? ` el ${longDate(payment.reversedAt.setZone(zone).toISODate()!)}` : ''}${payment.reversalReason ? `: ${payment.reversalReason}` : ''}`,
        MARGIN,
        y,
        { width }
      )
    y = doc.y + 12
  }

  // Signature
  const signY = Math.max(y + 40, doc.page.height - MARGIN - 110)
  doc
    .moveTo(MARGIN, signY)
    .lineTo(MARGIN + 200, signY)
    .lineWidth(0.8)
    .strokeColor(COLORS.slate)
    .stroke()
  doc
    .font(FONT.regular)
    .fontSize(9)
    .fillColor(COLORS.slate)
    .text('Administración', MARGIN, signY + 6)
  const by = payment.confirmedBy?.fullName ?? payment.registeredBy?.fullName
  if (by) doc.text(`Registró: ${by}`, MARGIN, doc.y + 2)

  footer(
    doc,
    `Generado con AptoPH el ${generatedAt(tenant)}. Constancia del pago recibido por la copropiedad.`
  )
  return render(doc)
}

// ---------------------------------------------------------------- paz y salvo

/** No 0/O, 1/I/L: easy to read aloud and type */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

function newCode() {
  let code = ''
  for (let i = 0; i < 10; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]
  return code
}

/** "ABCD2345XY" → "ABCD-2345-XY" */
export const formatCode = (code: string) => code.replace(/^(.{4})(.{4})(.+)$/, '$1-$2-$3')

/** "abcd-2345 xy" → "ABCD2345XY" */
export const normalizeCode = (code: string) => code.toUpperCase().replace(/[^A-Z0-9]/g, '')

export function verificationUrl(code: string) {
  const base = (env.get('RESIDENTS_URL') ?? 'https://web.aptoph.com').replace(/\/$/, '')
  return `${base}/verificar/${formatCode(code)}`
}

export class ClearanceService {
  constructor(private tenant: Tenant) {}

  /** What the unit owes now: overdue (due until today) and billed but not due yet */
  async balances(unitId: string) {
    const today = todayFor(this.tenant)
    const charges = await Charge.query()
      .where('tenant_id', this.tenant.id)
      .where('unit_id', unitId)
      .whereIn('status', ['pending', 'partially_paid'])
      .where('balance', '>', 0)
      .select('balance', 'due_on')
    let overdue = 0
    let upcoming = 0
    let nextDue: string | null = null
    for (const charge of charges) {
      const due = iso(charge.dueOn)!
      if (due <= today) {
        overdue += toCents(charge.balance)
      } else {
        upcoming += toCents(charge.balance)
        if (!nextDue || due < nextDue) nextDue = due
      }
    }
    return { today, overdue, upcoming, nextDue }
  }

  certificates(unitId: string) {
    return ClearanceCertificate.query()
      .where('tenant_id', this.tenant.id)
      .where('unit_id', unitId)
      .preload('issuedBy')
      .preload('unit', (units) => units.preload('building'))
      .orderBy('number', 'desc')
      .limit(20)
  }

  /**
   * Issues a paz y salvo when the unit owes nothing due. It is valid until the
   * end of the month, or the day before the next charge falls due.
   */
  async issue(unitId: string, userId: string | null) {
    const { today, overdue, upcoming, nextDue } = await this.balances(unitId)
    if (overdue > 0) {
      throw new Exception(
        `La unidad tiene un saldo vencido de ${moneyCents(overdue)}. El paz y salvo se expide cuando esté al día.`,
        { status: 409 }
      )
    }
    const endOfMonth = DateTime.fromISO(today).endOf('month').toISODate()!
    const beforeNextDue = nextDue ? DateTime.fromISO(nextDue).minus({ days: 1 }).toISODate()! : null
    const validUntil = beforeNextDue && beforeNextDue < endOfMonth ? beforeNextDue : endOfMonth
    const holder = await holderOf(this.tenant.id, unitId, today)

    const certificate = await db.transaction(async (trx) => {
      const number = await nextNumber(trx, this.tenant.id, 'clearance')
      return ClearanceCertificate.create(
        {
          tenantId: this.tenant.id,
          unitId,
          number,
          asOf: DateTime.fromISO(today),
          validUntil: DateTime.fromISO(validUntil < today ? today : validUntil),
          code: newCode(),
          holderName: holder,
          upcomingAmount: fromCents(upcoming),
          issuedById: userId,
        },
        { client: trx }
      )
    })
    await certificate.load('issuedBy')
    await certificate.load('unit', (units) => units.preload('building'))
    return certificate
  }

  async find(id: string, unitIds?: string[]) {
    const query = ClearanceCertificate.query()
      .where('tenant_id', this.tenant.id)
      .where('id', id)
      .preload('issuedBy')
      .preload('unit', (units) => units.preload('building'))
    if (unitIds) query.whereIn('unit_id', unitIds)
    const certificate = await query.first()
    if (!certificate) throw new Exception('El paz y salvo no existe', { status: 404 })
    return certificate
  }

  /** Public check of a code printed on a certificate */
  static async verify(code: string) {
    const certificate = await ClearanceCertificate.query()
      .where('code', normalizeCode(code))
      .preload('unit', (units) => units.preload('building'))
      .first()
    if (!certificate) return null
    const tenant = await Tenant.findOrFail(certificate.tenantId)
    return {
      number: certificate.number,
      tenant: tenant.legalName || tenant.name,
      unit: unitName(certificate.unit),
      holderName: certificate.holderName,
      asOf: iso(certificate.asOf)!,
      validUntil: iso(certificate.validUntil)!,
      issuedAt: certificate.createdAt.toISO()!,
      current: iso(certificate.validUntil)! >= todayFor(tenant),
    }
  }

  async pdf(certificate: ClearanceCertificate) {
    const tenant = this.tenant
    const number = String(certificate.number).padStart(6, '0')
    const asOf = iso(certificate.asOf)!
    const doc = createPdf(`Paz y salvo ${number}`)
    const width = contentWidth(doc)
    let y = header(doc, tenant, 'Paz y salvo', `No. ${number}`)

    doc
      .font(FONT.display)
      .fontSize(24)
      .fillColor(COLORS.navy)
      .text('Certificado de paz y salvo', MARGIN, y + 10, { width, align: 'center' })
    y = doc.y + 26

    const unit = unitName(certificate.unit)
    const holder = certificate.holderName ? `, a nombre de ${certificate.holderName},` : ''
    const paragraph = (text: string, options: { bold?: boolean } = {}) => {
      doc
        .font(options.bold ? FONT.bold : FONT.regular)
        .fontSize(11.5)
        .fillColor(COLORS.ink)
        .text(text, MARGIN, y, { width, align: 'justify', lineGap: 4 })
      y = doc.y + 14
    }
    paragraph(
      `La administración de ${tenant.legalName || tenant.name}${tenant.taxId ? `, NIT ${tenant.taxId},` : ''} certifica que la unidad ${unit}${holder} se encuentra a PAZ Y SALVO por concepto de cuotas de administración, cuotas extraordinarias, intereses de mora, sanciones y demás obligaciones económicas con la copropiedad, con corte al ${longDate(asOf)}.`
    )
    const upcoming = toCents(certificate.upcomingAmount)
    if (upcoming > 0) {
      paragraph(
        `Este certificado no cubre los cobros ya facturados que vencen después de esa fecha, por ${moneyCents(upcoming)}.`
      )
    }
    paragraph(`Vigente hasta el ${longDate(iso(certificate.validUntil)!)}.`, { bold: true })
    paragraph(
      `Se expide${tenant.city ? ` en ${tenant.city}` : ''} el ${longDate(asOf)}, a solicitud del interesado.`
    )

    // Verification
    y += 6
    doc.roundedRect(MARGIN, y, width, 62, 8).fill(COLORS.sand)
    doc
      .font(FONT.bold)
      .fontSize(8)
      .fillColor(COLORS.muted)
      .text('CÓDIGO DE VERIFICACIÓN', MARGIN + 16, y + 12, { characterSpacing: 0.4 })
    doc
      .font(FONT.display)
      .fontSize(18)
      .fillColor(COLORS.ink)
      .text(formatCode(certificate.code), MARGIN + 16, y + 26)
    doc
      .font(FONT.regular)
      .fontSize(9)
      .fillColor(COLORS.slate)
      .text('Verifique su autenticidad en', MARGIN + width * 0.45, y + 14, {
        width: width * 0.55 - 16,
        align: 'right',
      })
    const url = verificationUrl(certificate.code)
    doc.fillColor(COLORS.navy).text(url, MARGIN + width * 0.45, doc.y + 2, {
      width: width * 0.55 - 16,
      align: 'right',
      link: url,
      underline: true,
    })
    y += 62

    const signY = Math.max(y + 70, doc.page.height - MARGIN - 110)
    doc
      .moveTo(MARGIN, signY)
      .lineTo(MARGIN + 220, signY)
      .lineWidth(0.8)
      .strokeColor(COLORS.slate)
      .stroke()
    doc
      .font(FONT.bold)
      .fontSize(10)
      .fillColor(COLORS.ink)
      .text('Administración', MARGIN, signY + 6)
    if (certificate.issuedBy?.fullName) {
      doc
        .font(FONT.regular)
        .fontSize(9)
        .fillColor(COLORS.slate)
        .text(`Expidió: ${certificate.issuedBy.fullName}`)
    }

    footer(
      doc,
      `Generado con AptoPH el ${generatedAt(tenant)}. La validez de este documento se confirma con el código de verificación.`
    )
    return render(doc)
  }
}

/** Receipt file name: recibo-000123.pdf */
export const receiptFileName = (payment: Payment) =>
  `recibo-de-caja-${String(payment.number).padStart(6, '0')}.pdf`

export const clearanceFileName = (certificate: ClearanceCertificate) =>
  `paz-y-salvo-${String(certificate.number).padStart(6, '0')}.pdf`

/** A payment of the conjunto with the relations the receipt needs */
export function findPayment(tenant: Tenant, id: string) {
  return Payment.query().where('tenant_id', tenant.id).where('id', id).firstOrFail()
}

/** Units of the conjunto (for the back-office routes) */
export async function assertUnit(tenant: Tenant, unitId: string) {
  const unit = await Unit.query()
    .where('tenant_id', tenant.id)
    .where('id', unitId)
    .whereNull('deleted_at')
    .first()
  if (!unit) throw new Exception('La unidad no existe', { status: 404 })
  return unit
}
