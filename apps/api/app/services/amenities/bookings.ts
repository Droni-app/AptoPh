import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import logger from '@adonisjs/core/services/logger'
import {
  AMENITY_MANAGE_ROLES,
  BOOKING_MODE_UNITS,
  fromCents,
  toCents,
  type AmenityAvailability,
  type AmenityRules,
  type Booking as BookingJson,
  type BookingApproveInput,
  type BookingCreateInput,
  type BookingDepositInput,
  type BookingQuote,
  type BookingType,
} from '@aptoph/shared'
import FieldException from '#exceptions/field_exception'
import ResourceException from '#exceptions/resource_exception'
import Amenity from '#models/amenities/amenity'
import AmenityBooking from '#models/amenities/amenity_booking'
import CashAccount from '#models/finance/cash_account'
import Charge from '#models/finance/charge'
import Unit from '#models/property/unit'
import Tenant from '#models/tenants/tenant'
import NotificationMail from '#mails/notifications/notification_mail'
import { maxDaysAheadOf, rulesOf } from '#services/amenities/rules'
import { ChargeService } from '#services/finance/charges'
import { PaymentService } from '#services/finance/payments'
import { type FinanceScope, withFinance } from '#services/finance/scope'
import { todayFor } from '#services/finance/support'
import { queueMail } from '#services/mailer'
import { NotificationService } from '#services/notifications/notifications'
import { balancesFor } from '#services/resident_scope'
import { iso } from '#transformers/helpers'
import { unitRef } from '#transformers/property/resident'

/**
 * Common area bookings (docs/amenities.md): the slot of each booking mode,
 * the price, the rules, the calendar and the review with its accounting.
 *
 * The `amenity_bookings_no_overlap` exclusion constraint is the guarantee
 * against double bookings (cleaning time included); the checks here only
 * give a clear message first.
 */

export type Actor = { userId: string; staff: boolean }

type Slot = { startsAt: DateTime; endsAt: DateTime; quantity: number }

/** Active bookings hold their slot */
const ACTIVE = ['pending', 'approved'] as const

/** Longest range the calendar returns at once */
const MAX_RANGE_DAYS = 62

const pesos = (cents: number) => `$${Math.round(cents / 100).toLocaleString('es-CO')}`

export class BookingService {
  constructor(private tenant: Tenant) {}

  private get zone() {
    return this.tenant.timezone || 'America/Bogota'
  }

  // The slot

  /** "HH:mm" of a local day; "24:00" is the next midnight */
  private at(day: DateTime, time: string) {
    if (time === '24:00') return day.startOf('day').plus({ days: 1 })
    const [hour, minute] = time.split(':').map(Number)
    return day.startOf('day').set({ hour, minute })
  }

  private assertOpenDay(amenity: Amenity, rules: AmenityRules, day: DateTime) {
    const weekday = day.setLocale('en').toFormat('cccc').toLowerCase()
    if (rules.closedOn?.includes(weekday as never)) {
      throw new FieldException(
        'startsAt',
        `${amenity.name} no se presta los ${day.setLocale('es-CO').toFormat('cccc')}`
      )
    }
  }

  /** The time range the request asks for, by the area's booking mode */
  slotFor(amenity: Amenity, input: BookingCreateInput): Slot {
    const rules = rulesOf(amenity)
    if (amenity.bookingMode === 'days') {
      if (!input.date) throw new FieldException('date', 'Elige el día')
      const first = DateTime.fromISO(input.date, { zone: this.zone })
      if (!first.isValid) throw new FieldException('date', 'La fecha no es válida')
      const days = input.days ?? 1
      const maxDays = rules.maxDays ?? 1
      if (days < 1 || days > maxDays) {
        throw new FieldException(
          'days',
          maxDays === 1 ? 'Se reserva un día a la vez' : `Puedes reservar máximo ${maxDays} días`
        )
      }
      for (let i = 0; i < days; i++) this.assertOpenDay(amenity, rules, first.plus({ days: i }))
      return {
        startsAt: this.at(first, rules.opensAt ?? '00:00'),
        endsAt: this.at(first.plus({ days: days - 1 }), rules.closesAt ?? '24:00'),
        quantity: days,
      }
    }

    if (amenity.bookingMode === 'shifts') {
      const shifts = rules.shifts ?? []
      if (!shifts.length) {
        throw ResourceException.conflict('Esta zona no tiene turnos configurados todavía')
      }
      if (!input.date) throw new FieldException('date', 'Elige el día')
      const day = DateTime.fromISO(input.date, { zone: this.zone })
      if (!day.isValid) throw new FieldException('date', 'La fecha no es válida')
      const ids = [...new Set(input.shiftIds ?? [])]
      const positions = ids.map((id) => shifts.findIndex((shift) => shift.id === id))
      if (!ids.length || positions.some((position) => position < 0)) {
        throw new FieldException('shiftIds', 'Elige uno o más turnos')
      }
      positions.sort((a, b) => a - b)
      if (positions.some((position, i) => i > 0 && position !== positions[i - 1]! + 1)) {
        throw new FieldException('shiftIds', 'Los turnos deben ser seguidos')
      }
      this.assertOpenDay(amenity, rules, day)
      const first = shifts[positions[0]!]!
      const last = shifts[positions.at(-1)!]!
      const startsAt = this.at(day, first.startsAt)
      let endsAt = this.at(day, last.endsAt)
      // A night shift ends the next day
      if (endsAt <= startsAt) endsAt = endsAt.plus({ days: 1 })
      return { startsAt, endsAt, quantity: positions.length }
    }

    // By the hour
    if (!input.startsAt || !input.endsAt) {
      throw new FieldException('startsAt', 'Elige la hora de inicio y de fin')
    }
    const startsAt = DateTime.fromISO(input.startsAt, { setZone: true }).setZone(this.zone)
    const endsAt = DateTime.fromISO(input.endsAt, { setZone: true }).setZone(this.zone)
    if (!startsAt.isValid) throw new FieldException('startsAt', 'La hora de inicio no es válida')
    if (!endsAt.isValid || endsAt <= startsAt) {
      throw new FieldException('endsAt', 'La hora de fin debe ser posterior a la de inicio')
    }
    const step = rules.slotMinutes ?? 60
    if (startsAt.minute % step || endsAt.minute % step || startsAt.second || endsAt.second) {
      throw new FieldException('startsAt', `Las reservas van en bloques de ${step} minutos`)
    }
    const nextMidnight = startsAt.startOf('day').plus({ days: 1 })
    if (endsAt > nextMidnight)
      throw new FieldException('endsAt', 'La reserva debe terminar el mismo día')
    this.assertOpenDay(amenity, rules, startsAt)
    const hhmm = (time: DateTime) => (time.equals(nextMidnight) ? '24:00' : time.toFormat('HH:mm'))
    if (rules.opensAt && hhmm(startsAt) < rules.opensAt) {
      throw new FieldException('startsAt', `${amenity.name} abre a las ${rules.opensAt}`)
    }
    if (rules.closesAt && hhmm(endsAt) > rules.closesAt) {
      throw new FieldException('endsAt', `${amenity.name} cierra a las ${rules.closesAt}`)
    }
    const hours = endsAt.diff(startsAt, 'minutes').minutes / 60
    if (rules.minHours && hours < rules.minHours) {
      throw new FieldException('endsAt', `La reserva debe durar mínimo ${rules.minHours} horas`)
    }
    if (rules.maxHours && hours > rules.maxHours) {
      throw new FieldException('endsAt', `La reserva puede durar máximo ${rules.maxHours} horas`)
    }
    return { startsAt, endsAt, quantity: hours }
  }

  /** What a booking costs, in cents */
  quote(amenity: Amenity, type: BookingType, quantity: number) {
    if (type === 'block') {
      return { quantity, unitFee: 0, fee: 0, deposit: 0, payNow: 0, toStatement: 0 }
    }
    const unitFee = toCents(
      (type === 'external' ? (amenity.externalFee ?? amenity.bookingFee) : amenity.bookingFee) ??
        '0'
    )
    const fee = Math.round(unitFee * quantity)
    const deposit = toCents(amenity.depositAmount ?? '0')
    const prepaid = type === 'external' || amenity.paymentMode === 'prepaid'
    return {
      quantity,
      unitFee,
      fee,
      deposit,
      payNow: (prepaid ? fee : 0) + deposit,
      toStatement: prepaid ? 0 : fee,
    }
  }

  quoteJson(amenity: Amenity, type: BookingType, input: BookingCreateInput): BookingQuote {
    const quote = this.quote(amenity, type, this.slotFor(amenity, input).quantity)
    return {
      quantity: quote.quantity,
      unitFee: fromCents(quote.unitFee),
      fee: fromCents(quote.fee),
      deposit: fromCents(quote.deposit),
      payNow: fromCents(quote.payNow),
      toStatement: fromCents(quote.toStatement),
    }
  }

  /** Residents follow the area's rules; the administration only the calendar */
  private async assertPolicy(
    amenity: Amenity,
    slot: Slot,
    input: BookingCreateInput,
    actor: Actor,
    unitId: string | null
  ) {
    const rules = rulesOf(amenity)
    const now = DateTime.now()
    if (input.bookingType === 'block' && !actor.staff) {
      throw ResourceException.forbidden('Solo la administración bloquea la agenda')
    }
    if (input.bookingType === 'external') {
      if (!actor.staff) {
        throw ResourceException.forbidden('Las reservas de terceros las registra la administración')
      }
      if (!amenity.allowExternal) {
        throw new FieldException('bookingType', `${amenity.name} no se presta a terceros externos`)
      }
    }
    if (input.bookingType === 'guest' && !amenity.allowGuests) {
      throw new FieldException('bookingType', `${amenity.name} no se reserva a nombre de invitados`)
    }
    if (
      amenity.capacity &&
      input.guestsCount &&
      input.guestsCount > amenity.capacity &&
      input.bookingType !== 'block'
    ) {
      throw new FieldException('guestsCount', `El aforo máximo es de ${amenity.capacity} personas`)
    }
    if (slot.endsAt <= now) throw new FieldException('startsAt', 'Ese horario ya pasó')
    if (actor.staff) return

    if (amenity.terms && !input.acceptTerms) {
      throw new FieldException('acceptTerms', 'Acepta el reglamento de uso de la zona')
    }
    const notice = rules.minNoticeHours ?? 0
    if (slot.startsAt < now.plus({ hours: notice })) {
      throw new FieldException(
        'startsAt',
        notice
          ? `Reserva con mínimo ${notice} horas de anticipación`
          : 'La reserva debe empezar en el futuro'
      )
    }
    const ahead = maxDaysAheadOf(rules)
    if (slot.startsAt > now.plus({ days: ahead })) {
      throw new FieldException(
        'startsAt',
        `Puedes reservar hasta con ${ahead} días de anticipación`
      )
    }
    if (!unitId) return
    if (!amenity.allowDelinquent) {
      const balances = await balancesFor(this.tenant, [unitId], todayFor(this.tenant))
      const balance = balances.get(unitId)
      if (balance && toCents(balance.overdue) > 0) {
        throw new FieldException(
          'unitId',
          `La unidad tiene un saldo vencido de ${pesos(toCents(balance.overdue))}. Ponte al día para reservar ${amenity.name}.`
        )
      }
    }
    const mine = () =>
      AmenityBooking.query()
        .where('tenant_id', this.tenant.id)
        .where('amenity_id', amenity.id)
        .where('unit_id', unitId)
        .whereIn('status', [...ACTIVE])
    if (rules.maxActivePerUnit) {
      const [{ $extras }] = await mine().where('starts_at', '>', now.toSQL()!).count('* as total')
      if (Number($extras.total) >= rules.maxActivePerUnit) {
        throw new FieldException(
          'startsAt',
          `Tu unidad ya tiene ${rules.maxActivePerUnit} ${rules.maxActivePerUnit === 1 ? 'reserva pendiente' : 'reservas pendientes'} de ${amenity.name}`
        )
      }
    }
    if (rules.maxPerMonthPerUnit) {
      const month = slot.startsAt.setZone(this.zone).startOf('month')
      const [{ $extras }] = await mine()
        .where('starts_at', '>=', month.toSQL()!)
        .where('starts_at', '<', month.plus({ months: 1 }).toSQL()!)
        .count('* as total')
      if (Number($extras.total) >= rules.maxPerMonthPerUnit) {
        throw new FieldException(
          'startsAt',
          `Tu unidad ya usó las ${rules.maxPerMonthPerUnit} reservas de ${amenity.name} de ese mes`
        )
      }
    }
  }

  private blockedUntil(amenity: Amenity, endsAt: DateTime) {
    return endsAt.plus({ minutes: rulesOf(amenity).bufferMinutes ?? 0 })
  }

  private async assertFree(
    trx: FinanceScope['trx'] | undefined,
    amenity: Amenity,
    startsAt: DateTime,
    blockedUntil: DateTime
  ) {
    const taken = await AmenityBooking.query(trx ? { client: trx } : {})
      .where('tenant_id', this.tenant.id)
      .where('amenity_id', amenity.id)
      .whereIn('status', [...ACTIVE])
      .where('starts_at', '<', blockedUntil.toSQL()!)
      .where('blocked_until', '>', startsAt.toSQL()!)
      .first()
    if (taken) {
      throw ResourceException.conflict(
        taken.bookingType === 'block'
          ? `${amenity.name} no está disponible en ese horario (mantenimiento)`
          : `${amenity.name} ya está reservada en ese horario. Elige otro.`
      )
    }
  }

  // Calendar

  private range(from: string, to: string) {
    const start = DateTime.fromISO(from, { zone: this.zone }).startOf('day')
    const end = DateTime.fromISO(to, { zone: this.zone }).endOf('day')
    if (!start.isValid || !end.isValid || end < start) {
      throw new FieldException('from', 'El rango de fechas no es válido')
    }
    if (end.diff(start, 'days').days > MAX_RANGE_DAYS) {
      throw new FieldException('to', `Consulta máximo ${MAX_RANGE_DAYS} días a la vez`)
    }
    return { start, end }
  }

  /** Busy slots of an area, without who booked them (the portal) */
  async availability(amenity: Amenity, from: string, to: string): Promise<AmenityAvailability> {
    const { start, end } = this.range(from, to)
    const rows = await AmenityBooking.query()
      .where('tenant_id', this.tenant.id)
      .where('amenity_id', amenity.id)
      .whereIn('status', [...ACTIVE])
      .where('starts_at', '<', end.toSQL()!)
      .where('blocked_until', '>', start.toSQL()!)
      .orderBy('starts_at')
    return {
      amenityId: amenity.id,
      from: start.toISODate()!,
      to: end.toISODate()!,
      busy: rows.map((row) => ({
        startsAt: iso(row.startsAt)!,
        endsAt: iso(row.endsAt)!,
        blockedUntil: iso(row.blockedUntil)!,
        status: row.status,
        isBlock: row.bookingType === 'block',
      })),
    }
  }

  /** Every booking of the range (the back-office calendar) */
  calendar(from: string, to: string, filters: { amenityId?: string; withInactive?: boolean }) {
    const { start, end } = this.range(from, to)
    return this.withRelations(
      AmenityBooking.query()
        .where('tenant_id', this.tenant.id)
        .where('starts_at', '<', end.toSQL()!)
        .where('blocked_until', '>', start.toSQL()!)
        .if(filters.amenityId, (q) => q.where('amenity_id', filters.amenityId!))
        .if(!filters.withInactive, (q) => q.whereIn('status', [...ACTIVE]))
        .orderBy('starts_at')
    )
  }

  withRelations(query: ModelQueryBuilderContract<typeof AmenityBooking>) {
    return query
      .preload('amenity')
      .preload('unit', (unit) => unit.preload('building'))
      .preload('requestedBy')
      .preload('reviewedBy')
  }

  async find(id: string, unitIds?: string[]) {
    const booking = await this.withRelations(
      AmenityBooking.query()
        .where('tenant_id', this.tenant.id)
        .where('id', id)
        .if(unitIds, (q) => q.whereIn('unit_id', unitIds!))
    ).first()
    if (!booking) throw ResourceException.notFound('La reserva no existe')
    return booking
  }

  async attachmentCounts(ids: string[]) {
    const counts = new Map<string, number>()
    if (!ids.length) return counts
    const rows = await db
      .from('attachments')
      .where('tenant_id', this.tenant.id)
      .where('owner_type', 'amenity_booking')
      .whereIn('owner_id', ids)
      .whereNull('deleted_at')
      .groupBy('owner_id')
      .select('owner_id')
      .count('* as total')
    for (const row of rows) counts.set(row.owner_id, Number(row.total))
    return counts
  }

  // Lifecycle

  async create(input: BookingCreateInput, actor: Actor) {
    const type = input.bookingType
    const unitId = type === 'resident' || type === 'guest' ? (input.unitId ?? null) : null
    if ((type === 'resident' || type === 'guest') && !unitId) {
      throw new FieldException('unitId', 'Elige la unidad')
    }
    if ((type === 'guest' || type === 'external') && !input.holder?.name?.trim()) {
      throw new FieldException('holder.name', 'Escribe el nombre de quien usa la zona')
    }
    if (unitId) {
      const unit = await Unit.query()
        .where('tenant_id', this.tenant.id)
        .where('id', unitId)
        .whereNull('deleted_at')
        .first()
      if (!unit) throw new FieldException('unitId', 'La unidad no existe')
    }

    const created = await db.transaction(async (trx) => {
      // Concurrent requests for the same area wait for each other
      const amenity = await Amenity.query({ client: trx })
        .where('tenant_id', this.tenant.id)
        .where('id', input.amenityId)
        .where('is_active', true)
        .forUpdate()
        .first()
      if (!amenity) throw new FieldException('amenityId', 'La zona común no existe')

      const slot = this.slotFor(amenity, input)
      await this.assertPolicy(amenity, slot, input, actor, unitId)
      const blockedUntil = this.blockedUntil(amenity, slot.endsAt)
      await this.assertFree(trx, amenity, slot.startsAt, blockedUntil)
      const quote = this.quote(amenity, type, slot.quantity)

      // Consecutive number per conjunto
      await trx.rawQuery('SELECT pg_advisory_xact_lock(hashtext(?))', [
        `bookings:${this.tenant.id}`,
      ])
      const [{ max }] = await trx
        .from('amenity_bookings')
        .where('tenant_id', this.tenant.id)
        .max('number as max')

      const autoApprove = type === 'block' || (!amenity.requiresApproval && quote.payNow === 0)
      const holder = type === 'guest' || type === 'external' ? input.holder! : null
      try {
        return await AmenityBooking.create(
          {
            tenantId: this.tenant.id,
            number: Number(max ?? 0) + 1,
            amenityId: amenity.id,
            bookingType: type,
            unitId,
            requestedById: actor.userId,
            holderName: holder?.name.trim() ?? null,
            holderDocument: holder?.document?.trim() || null,
            holderPhone: holder?.phone?.trim() || null,
            holderEmail: holder?.email?.trim().toLowerCase() || null,
            notes: input.notes?.trim() || null,
            startsAt: slot.startsAt,
            endsAt: slot.endsAt,
            blockedUntil,
            guestsCount: type === 'block' ? null : (input.guestsCount ?? null),
            status: autoApprove ? 'approved' : 'pending',
            feeAmount: fromCents(quote.fee),
            depositAmount: fromCents(quote.deposit),
            paymentMode:
              type === 'block' ? null : type === 'external' ? 'prepaid' : amenity.paymentMode,
            paymentReference: input.paymentReference?.trim() || null,
            reviewedById: autoApprove ? actor.userId : null,
            reviewedAt: autoApprove ? DateTime.now() : null,
          },
          { client: trx }
        )
      } catch (error) {
        if ((error as { code?: string }).code === '23P01') {
          throw ResourceException.conflict(`${amenity.name} ya está reservada en ese horario`)
        }
        throw error
      }
    })

    // Approved at once with a fee to the statement: the charge goes now
    if (created.status === 'approved' && toCents(created.feeAmount) > 0) {
      await withFinance(this.tenant, actor.userId, (scope) => this.post(scope, created, {}))
    }
    const booking = await this.find(created.id)
    if (booking.bookingType !== 'block') await this.notifyCreated(booking, actor)
    return booking
  }

  private async locked(scope: FinanceScope, id: string) {
    const booking = await AmenityBooking.query({ client: scope.trx })
      .where('tenant_id', this.tenant.id)
      .where('id', id)
      .forUpdate()
      .first()
    if (!booking) throw ResourceException.notFound('La reserva no existe')
    await booking.load('amenity')
    return booking
  }

  /** What was paid in advance (fee and deposit), in cents */
  private received(booking: AmenityBooking) {
    const prepaidFee = booking.paymentMode === 'prepaid' ? toCents(booking.feeAmount) : 0
    return prepaidFee + toCents(booking.depositAmount)
  }

  private async cash(scope: FinanceScope, id: string | null | undefined) {
    if (!id) throw new FieldException('cashAccountId', 'Elige la cuenta donde entró el dinero')
    const cash = await CashAccount.query({ client: scope.trx })
      .where('tenant_id', this.tenant.id)
      .where('id', id)
      .first()
    if (!cash || !cash.isActive) {
      throw new FieldException('cashAccountId', 'La cuenta bancaria o caja no existe')
    }
    return cash
  }

  /**
   * The accounting of an approval: the charge to the unit (and its payment
   * when paid in advance), the third party's income and the deposit.
   */
  private async post(scope: FinanceScope, booking: AmenityBooking, input: BookingApproveInput) {
    await booking.load('amenity')
    const fee = toCents(booking.feeAmount)
    const deposit = toCents(booking.depositAmount)
    const received = this.received(booking)
    const cash = received > 0 ? await this.cash(scope, input.cashAccountId) : null
    const paidOn = input.paidOn ?? scope.today
    if (paidOn > scope.today)
      throw new FieldException('paidOn', 'La fecha de pago no puede ser futura')
    const when = this.describe(booking)
    const label = `Reserva #${booking.number} · ${booking.amenity.name} · ${when}`

    if (booking.unitId && fee > 0) {
      const charges = new ChargeService(scope)
      const charge = await charges.create({
        unitId: booking.unitId,
        conceptCode: 'amenity_booking',
        amount: fee,
        dueOn: booking.paymentMode === 'prepaid' ? paidOn : this.nextDueDate(scope),
        description: `${booking.amenity.name} · ${when}`,
        sourceType: 'amenity_booking',
        sourceId: booking.id,
        idempotencyKey: `booking:${booking.id}`,
      })
      booking.chargeId = charge.id
      if (booking.paymentMode === 'prepaid') {
        const fresh = await Charge.findOrFail(charge.id, { client: scope.trx })
        const open = toCents(fresh.balance)
        const payment = await new PaymentService(scope).register({
          unitId: booking.unitId,
          amount: fee,
          paidAt:
            paidOn === scope.today
              ? DateTime.now().setZone(this.zone)
              : DateTime.fromISO(`${paidOn}T12:00:00`, { zone: this.zone }),
          method: input.method ?? 'bank_transfer',
          reference: booking.paymentReference ?? `Reserva #${booking.number}`,
          notes: label,
          cashAccountId: cash!.id,
          allocations: open > 0 ? [{ chargeId: charge.id, amount: Math.min(open, fee) }] : [],
        })
        booking.paymentId = payment.id
      }
    }

    const externalFee = booking.bookingType === 'external' ? fee : 0
    if (externalFee + deposit > 0) {
      const lines = [{ accountId: cash!.ledgerAccountId, debit: externalFee + deposit }]
      if (externalFee) {
        lines.push({
          accountId: scope.accounts.key('income.amenity_booking').id,
          credit: externalFee,
        } as never)
      }
      if (deposit) {
        lines.push({
          accountId: scope.accounts.key('deposits.received').id,
          credit: deposit,
        } as never)
      }
      const entry = await scope.ledger.post({
        date: paidOn,
        type: 'amenity_booking',
        description: `${label}${booking.holderName ? ` · ${booking.holderName}` : ''}`,
        sourceType: 'amenity_booking',
        sourceId: booking.id,
        userId: scope.userId,
        lines,
      })
      booking.journalEntryId = entry?.id ?? null
      if (deposit) booking.depositStatus = 'held'
    }
    await booking.useTransaction(scope.trx).save()
  }

  /** The next fee due date: a charge to the statement is paid with the next fee */
  private nextDueDate(scope: FinanceScope) {
    const today = DateTime.fromISO(scope.today)
    const due = today.set({ day: scope.settings.dueDay })
    return (due < today ? due.plus({ months: 1 }) : due).toISODate()!
  }

  /**
   * `receipt: false` when the administration registers the booking and the
   * payment at once (received at the office): there is no file to check
   */
  async approve(id: string, input: BookingApproveInput, actor: Actor, options = { receipt: true }) {
    await withFinance(this.tenant, actor.userId, async (scope) => {
      const booking = await this.locked(scope, id)
      if (booking.status !== 'pending') {
        throw ResourceException.conflict('Solo se aprueban reservas por aprobar')
      }
      if (booking.endsAt <= DateTime.now()) {
        throw ResourceException.conflict('La reserva ya pasó: recházala o cancélala')
      }
      if (options.receipt && this.received(booking) > 0 && booking.bookingType !== 'external') {
        const counts = await this.attachmentCounts([booking.id])
        if (!counts.get(booking.id)) {
          throw ResourceException.conflict(
            'Falta el soporte de pago. Pídele al residente que lo adjunte antes de aprobar.'
          )
        }
      }
      booking.merge({
        status: 'approved',
        reviewedById: actor.userId,
        reviewedAt: DateTime.now(),
        reviewNote: input.note?.trim() || null,
      })
      await this.post(scope, booking, input)
    })
    const booking = await this.find(id)
    await this.notifyReviewed(booking)
    return booking
  }

  async reject(id: string, reason: string, actor: Actor) {
    const booking = await this.find(id)
    if (booking.status !== 'pending') {
      throw ResourceException.conflict('Solo se rechazan reservas por aprobar')
    }
    booking.merge({
      status: 'rejected',
      reviewedById: actor.userId,
      reviewedAt: DateTime.now(),
      reviewNote: reason.trim(),
    })
    await booking.save()
    await this.notifyReviewed(booking)
    return booking
  }

  /** Until when the resident cancels by themselves */
  cancelDeadline(booking: AmenityBooking) {
    return booking.startsAt.minus({ hours: rulesOf(booking.amenity).cancelHours ?? 0 })
  }

  /** Whether the resident can cancel it: before the deadline, and nothing was paid yet */
  residentCanCancel(booking: AmenityBooking, now = DateTime.now()) {
    if (booking.status !== 'pending' && booking.status !== 'approved') return false
    if (booking.bookingType === 'block' || booking.bookingType === 'external') return false
    if (booking.paymentId || booking.journalEntryId || booking.depositStatus) return false
    return this.cancelDeadline(booking) > now
  }

  /**
   * Frees the slot. An unpaid charge is voided; money already received stays
   * where it is and the administration decides (returned or credit).
   */
  async cancel(id: string, reason: string | null, actor: Actor, unitIds?: string[]) {
    const warnings: string[] = []
    await withFinance(this.tenant, actor.userId, async (scope) => {
      const booking = await this.locked(scope, id)
      if (unitIds && !unitIds.includes(booking.unitId ?? '')) {
        throw ResourceException.notFound('La reserva no existe')
      }
      if (booking.status !== 'pending' && booking.status !== 'approved') {
        throw ResourceException.conflict('La reserva ya no está activa')
      }
      if (!actor.staff && !this.residentCanCancel(booking)) {
        throw ResourceException.conflict(
          'Esta reserva ya no se puede cancelar desde el portal. Comunícate con la administración.'
        )
      }
      if (booking.chargeId) {
        const charge = await Charge.findOrFail(booking.chargeId, { client: scope.trx })
        if (charge.status !== 'cancelled') {
          if (toCents(charge.balance) === toCents(charge.amount) && !booking.paymentId) {
            await new ChargeService(scope).cancel(charge, `Reserva #${booking.number} cancelada`)
          } else {
            warnings.push(
              'El cobro de la reserva ya tiene pagos: anúlalo con una nota crédito o deja el valor como saldo a favor.'
            )
          }
        }
      }
      if (
        booking.bookingType === 'external' &&
        toCents(booking.feeAmount) > 0 &&
        booking.journalEntryId
      ) {
        warnings.push(
          'El pago del tercero quedó registrado: si lo devuelves, regístralo en contabilidad.'
        )
      }
      if (booking.depositStatus === 'held') {
        warnings.push('El depósito sigue recibido: regístralo como devuelto.')
      }
      booking.merge({
        status: 'cancelled',
        cancelledAt: DateTime.now(),
        cancelledById: actor.userId,
        cancellationReason: reason?.trim() || null,
      })
      await booking.useTransaction(scope.trx).save()
    })
    const booking = await this.find(id)
    if (booking.bookingType !== 'block') await this.notifyCancelled(booking, actor)
    return { booking, warnings }
  }

  /** After the event: the deposit goes back, whole or with a deduction for damages */
  async settleDeposit(id: string, input: BookingDepositInput, actor: Actor) {
    await withFinance(this.tenant, actor.userId, async (scope) => {
      const booking = await this.locked(scope, id)
      if (booking.depositStatus !== 'held') {
        throw ResourceException.conflict('Esta reserva no tiene un depósito por devolver')
      }
      const deposit = toCents(booking.depositAmount)
      const retained =
        input.outcome === 'retained' ? Math.round((input.retainedAmount ?? 0) * 100) : 0
      if (input.outcome === 'retained' && (retained <= 0 || retained > deposit)) {
        throw new FieldException(
          'retainedAmount',
          `El descuento debe estar entre $1 y ${pesos(deposit)}`
        )
      }
      if (input.outcome === 'retained' && !input.note?.trim()) {
        throw new FieldException('note', 'Explica el motivo del descuento (daños, aseo…)')
      }
      const refund = deposit - retained
      const cash = refund > 0 ? await this.cash(scope, input.cashAccountId) : null
      const lines: Array<{ accountId: string; debit?: number; credit?: number }> = [
        { accountId: scope.accounts.key('deposits.received').id, debit: deposit },
      ]
      if (retained)
        lines.push({ accountId: scope.accounts.key('income.other').id, credit: retained })
      if (refund) lines.push({ accountId: cash!.ledgerAccountId, credit: refund })
      const entry = await scope.ledger.post({
        date: scope.today,
        type: 'amenity_deposit',
        description: `Depósito de la reserva #${booking.number} · ${booking.amenity.name}${retained ? ` · descuento ${pesos(retained)}` : ''}`,
        sourceType: 'amenity_booking',
        sourceId: booking.id,
        userId: scope.userId,
        lines,
      })
      booking.merge({
        depositStatus: retained ? 'retained' : 'returned',
        depositRetained: fromCents(retained),
        depositNote: input.note?.trim() || null,
        depositJournalEntryId: entry?.id ?? null,
      })
      await booking.useTransaction(scope.trx).save()
    })
    const booking = await this.find(id)
    await this.notifyDeposit(booking)
    return booking
  }

  // Presentation

  /** "sáb 12 dic, 3:00 p. m. – 9:00 p. m." in the conjunto's zone */
  describe(booking: Pick<AmenityBooking, 'startsAt' | 'endsAt'>) {
    const start = booking.startsAt.setZone(this.zone).setLocale('es-CO')
    const end = booking.endsAt.setZone(this.zone).setLocale('es-CO')
    const day = (time: DateTime) => time.toFormat("ccc d 'de' LLL")
    const hour = (time: DateTime) => time.toFormat('h:mm a')
    const lastDay = end.minus({ minutes: 1 })
    if (start.hasSame(lastDay, 'day')) return `${day(start)}, ${hour(start)} – ${hour(end)}`
    return `${day(start)}, ${hour(start)} – ${day(end)}, ${hour(end)}`
  }

  present(
    booking: AmenityBooking,
    viewerId: string,
    attachmentCount = 0,
    options: { staff?: boolean } = {}
  ): BookingJson {
    const now = DateTime.now()
    return {
      id: booking.id,
      number: booking.number,
      amenity: {
        id: booking.amenity.id,
        name: booking.amenity.name,
        bookingMode: booking.amenity.bookingMode,
        color: booking.amenity.color,
      },
      bookingType: booking.bookingType,
      unit: booking.unit ? unitRef(booking.unit) : null,
      holder: booking.holderName
        ? {
            name: booking.holderName,
            document: booking.holderDocument,
            phone: booking.holderPhone,
            email: booking.holderEmail,
          }
        : null,
      requestedBy: booking.requestedBy
        ? { id: booking.requestedBy.id, fullName: booking.requestedBy.fullName }
        : null,
      startsAt: iso(booking.startsAt)!,
      endsAt: iso(booking.endsAt)!,
      blockedUntil: iso(booking.blockedUntil)!,
      guestsCount: booking.guestsCount,
      notes: booking.notes,
      status: booking.status,
      feeAmount: booking.feeAmount,
      depositAmount: booking.depositAmount,
      paymentMode: booking.paymentMode,
      paymentReference: booking.paymentReference,
      attachmentCount,
      reviewNote: booking.reviewNote,
      reviewedAt: iso(booking.reviewedAt),
      reviewedBy: booking.reviewedBy
        ? { id: booking.reviewedBy.id, fullName: booking.reviewedBy.fullName }
        : null,
      cancellationReason: booking.cancellationReason,
      cancelledAt: iso(booking.cancelledAt),
      chargeId: booking.chargeId,
      paymentId: booking.paymentId,
      depositStatus: booking.depositStatus,
      depositRetained: booking.depositRetained,
      depositNote: booking.depositNote,
      createdAt: iso(booking.createdAt)!,
      isMine: booking.requestedById === viewerId,
      canCancel: options.staff
        ? booking.status === 'pending' || booking.status === 'approved'
        : this.residentCanCancel(booking, now),
    }
  }

  // Notifications (category `bookings`, docs/notifications.md)

  private who(booking: AmenityBooking) {
    const unit = booking.unit
      ? `${booking.unit.building ? `${booking.unit.building.name} · ` : ''}${booking.unit.code}`
      : null
    return [unit, booking.holderName].filter(Boolean).join(' · ')
  }

  private rows(booking: AmenityBooking) {
    const fee = toCents(booking.feeAmount)
    const deposit = toCents(booking.depositAmount)
    return [
      { label: 'Zona', value: booking.amenity.name },
      { label: 'Horario', value: this.describe(booking) },
      ...(this.who(booking) ? [{ label: 'Reservada para', value: this.who(booking) }] : []),
      ...(fee ? [{ label: 'Tarifa', value: pesos(fee) }] : []),
      ...(deposit ? [{ label: 'Depósito', value: pesos(deposit) }] : []),
    ]
  }

  private async toUnit(
    booking: AmenityBooking,
    content: {
      type: string
      title: string
      body: string
      dedupeKey?: string
    }
  ) {
    const notifications = new NotificationService(this.tenant)
    if (booking.unitId) {
      await notifications.notify(await notifications.residentsOf([booking.unitId]), {
        app: 'web',
        category: 'bookings',
        type: content.type,
        title: content.title,
        body: content.body,
        path: `/reservas?reserva=${booking.id}`,
        dedupeKey: content.dedupeKey ?? null,
        email: { paragraphs: [content.body], rows: this.rows(booking), action: 'Ver mis reservas' },
      })
    } else if (booking.holderEmail) {
      // A third party has no account: only the email
      try {
        queueMail(
          new NotificationMail(
            { email: booking.holderEmail, fullName: booking.holderName ?? '' },
            this.tenant.name,
            {
              subject: `${this.tenant.name}: ${content.title}`,
              title: content.title,
              paragraphs: [content.body],
              rows: this.rows(booking),
              action: '',
              url: '',
              preferencesUrl: '',
            }
          ),
          `${content.type} external`
        )
      } catch (err) {
        logger.error({ err }, 'could not email the third party')
      }
    }
  }

  private async toAdministration(
    booking: AmenityBooking,
    title: string,
    body: string,
    type: string
  ) {
    const notifications = new NotificationService(this.tenant)
    await notifications.notify(await notifications.staffWith(AMENITY_MANAGE_ROLES), {
      app: 'backoffice',
      category: 'bookings',
      type,
      title,
      body,
      path: `/zonas-comunes?reserva=${booking.id}`,
      email: { paragraphs: [body], rows: this.rows(booking), action: 'Abrir la reserva' },
    })
  }

  private async notifyCreated(booking: AmenityBooking, actor: Actor) {
    const name = booking.amenity.name
    if (actor.staff) {
      if (booking.bookingType !== 'external') {
        await this.toUnit(booking, {
          type: 'booking.created',
          title: `La administración reservó ${name} para tu unidad`,
          body: this.describe(booking),
        })
      }
      return
    }
    const pending = booking.status === 'pending'
    await this.toAdministration(
      booking,
      pending ? `Reserva por aprobar: ${name}` : `Nueva reserva: ${name}`,
      `${this.who(booking)} · ${this.describe(booking)}`,
      pending ? 'booking.requested' : 'booking.created'
    )
    const payNow = this.received(booking)
    await this.toUnit(booking, {
      type: pending ? 'booking.requested' : 'booking.confirmed',
      title: pending
        ? `Recibimos tu solicitud de ${name}`
        : `Tu reserva de ${name} está confirmada`,
      body: pending
        ? payNow
          ? `${this.describe(booking)}. La administración la aprueba al verificar tu pago de ${pesos(payNow)}.`
          : `${this.describe(booking)}. Te avisamos cuando la administración la apruebe.`
        : this.describe(booking),
    })
  }

  private async notifyReviewed(booking: AmenityBooking) {
    const name = booking.amenity.name
    const approved = booking.status === 'approved'
    const statement = booking.paymentMode === 'statement' && toCents(booking.feeAmount) > 0
    await this.toUnit(booking, {
      type: approved ? 'booking.approved' : 'booking.rejected',
      title: approved ? `Aprobamos tu reserva de ${name}` : `No aprobamos tu reserva de ${name}`,
      body: approved
        ? `${this.describe(booking)}.${statement ? ` La tarifa de ${pesos(toCents(booking.feeAmount))} llega con tu próxima cuenta.` : ''}${booking.reviewNote ? ` ${booking.reviewNote}` : ''}`
        : (booking.reviewNote ?? 'Comunícate con la administración para más información.'),
      dedupeKey: `booking:${booking.status}:${booking.id}`,
    })
  }

  private async notifyCancelled(booking: AmenityBooking, actor: Actor) {
    const name = booking.amenity.name
    if (actor.staff) {
      await this.toUnit(booking, {
        type: 'booking.cancelled',
        title: `La administración canceló tu reserva de ${name}`,
        body: `${this.describe(booking)}.${booking.cancellationReason ? ` Motivo: ${booking.cancellationReason}` : ''}`,
        dedupeKey: `booking:cancelled:${booking.id}`,
      })
    } else {
      await this.toAdministration(
        booking,
        `Se canceló una reserva de ${name}`,
        `${this.who(booking)} · ${this.describe(booking)}`,
        'booking.cancelled'
      )
    }
  }

  private async notifyDeposit(booking: AmenityBooking) {
    const retained = toCents(booking.depositRetained ?? '0')
    const refund = toCents(booking.depositAmount) - retained
    await this.toUnit(booking, {
      type: 'booking.deposit',
      title: retained
        ? `Devolvimos ${pesos(refund)} del depósito de ${booking.amenity.name}`
        : `Devolvimos tu depósito de ${booking.amenity.name}`,
      body: retained
        ? `Se descontaron ${pesos(retained)}: ${booking.depositNote ?? ''}`
        : `Te devolvimos ${pesos(refund)}.`,
      dedupeKey: `booking:deposit:${booking.id}`,
    })
  }

  /** The day before: a reminder to the unit (or the third party) */
  async remind(booking: AmenityBooking) {
    await this.toUnit(booking, {
      type: 'booking.reminder',
      title: `Mañana tienes reservado ${booking.amenity.name}`,
      body: this.describe(booking),
      dedupeKey: `booking:reminder:${booking.id}`,
    })
  }

  /** Bookings units unit-quantity label: "3 horas", "1 turno" */
  static quantityLabel(mode: Amenity['bookingMode'], quantity: number) {
    const [one, many] = BOOKING_MODE_UNITS[mode]
    return `${quantity.toLocaleString('es-CO')} ${quantity === 1 ? one : many}`
  }
}

/**
 * Reminders of the approved bookings that start in the next 24 hours, for
 * every conjunto. Runs hourly from the scheduler.
 */
export async function remindUpcomingBookings() {
  const now = DateTime.now()
  const rows = await AmenityBooking.query()
    .where('status', 'approved')
    .whereNull('reminded_at')
    .whereNot('booking_type', 'block')
    .where('starts_at', '>', now.toSQL()!)
    .where('starts_at', '<=', now.plus({ hours: 24 }).toSQL()!)
    .preload('amenity')
    .preload('unit', (unit) => unit.preload('building'))
    .limit(500)
  const tenants = new Map<string, Tenant>()
  for (const booking of rows) {
    try {
      const tenant = tenants.get(booking.tenantId) ?? (await Tenant.findOrFail(booking.tenantId))
      tenants.set(tenant.id, tenant)
      if (tenant.status !== 'active' && tenant.status !== 'trial') continue
      booking.remindedAt = now
      await booking.save()
      await new BookingService(tenant).remind(booking)
    } catch (err) {
      logger.error({ err, bookingId: booking.id }, 'could not remind the booking')
    }
  }
}
