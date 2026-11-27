import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'
import {
  PARKING_SETTLEMENT_LABELS,
  PAYMENT_METHOD_LABELS,
  PLATE_REQUIRED_TYPES,
  VEHICLE_TYPES,
  VEHICLE_TYPE_LABELS,
  formatMinutes,
  fromCents,
  normalizePlate,
  periodOf,
  quoteParking,
  toCents,
  visitorParkingSettings,
  type ParkingDay,
  type ParkingEntryInput,
  type ParkingExitInput,
  type ParkingLookup,
  type ParkingQuote,
  type ParkingSettlement,
  type ParkingSummary,
  type ParkingTariff,
  type VehicleType,
  type VisitorParkingSettings,
} from '@aptoph/shared'
import FieldException from '#exceptions/field_exception'
import ParkingReceiptMail from '#mails/gatehouse/parking_receipt_mail'
import ResourceException from '#exceptions/resource_exception'
import CashAccount from '#models/finance/cash_account'
import ParkingStay from '#models/gatehouse/parking_stay'
import Visit from '#models/gatehouse/visit'
import Unit from '#models/property/unit'
import type Tenant from '#models/tenants/tenant'
import { ChargeService } from '#services/finance/charges'
import { PaymentService } from '#services/finance/payments'
import { withFinance, type FinanceScope } from '#services/finance/scope'
import { nextNumber } from '#services/finance/support'
import { queueMail } from '#services/mailer'

type Trx = TransactionClientContract

/** Grace minutes a plate already used, per local date */
export type GraceUsage = Record<string, number>

/**
 * Minutes of a stay in each calendar day of the conjunto's time zone. A stay
 * that spends the night is split at midnight.
 */
export function splitByDay(from: DateTime, to: DateTime, zone: string) {
  const segments: Array<{ date: string; minutes: number }> = []
  let cursor = from.setZone(zone)
  const end = to.setZone(zone)
  while (cursor < end) {
    const midnight = cursor.startOf('day').plus({ days: 1 })
    const until = midnight < end ? midnight : end
    segments.push({
      date: cursor.toISODate()!,
      minutes: Math.floor(until.diff(cursor, 'minutes').minutes),
    })
    cursor = until
  }
  return segments.length ? segments : [{ date: from.setZone(zone).toISODate()!, minutes: 0 }]
}

/**
 * Visitor parking: entries, exits, the price of each stay and how it is paid.
 * The administration and the guards use it; only the administration changes
 * the settings. docs/visitor-parking.md
 */
export class VisitorParkingService {
  readonly settings: VisitorParkingSettings

  constructor(private tenant: Tenant) {
    this.settings = visitorParkingSettings((tenant.settings ?? {}).visitorParking)
  }

  get zone() {
    return this.tenant.timezone || 'America/Bogota'
  }

  async saveSettings(settings: VisitorParkingSettings) {
    if (settings.cashAccountId) {
      const account = await CashAccount.query()
        .where('tenant_id', this.tenant.id)
        .where('id', settings.cashAccountId)
        .where('is_active', true)
        .first()
      if (!account) throw new FieldException('cashAccountId', 'La caja no existe o está inactiva')
    }
    if (settings.paymentMode !== 'unit' && !settings.cashAccountId && this.charges(settings)) {
      throw new FieldException(
        'cashAccountId',
        'Elige la caja donde entra el dinero que se recibe en portería'
      )
    }
    this.tenant.settings = { ...(this.tenant.settings ?? {}), visitorParking: settings }
    await this.tenant.save()
    return visitorParkingSettings(settings)
  }

  /** Some vehicle type has a rate */
  private charges(settings = this.settings) {
    return VEHICLE_TYPES.some((type) => settings.vehicles[type].hourlyRate > 0)
  }

  private assertEnabled() {
    if (!this.settings.enabled) {
      throw ResourceException.conflict(
        'El parqueadero de visitantes no está activo. La administración lo activa en su configuración.'
      )
    }
  }

  /** The tariff a vehicle type enters with */
  tariffFor(type: VehicleType): ParkingTariff {
    const vehicle = this.settings.vehicles[type]
    return {
      hourlyRate: vehicle.hourlyRate,
      dailyCap: vehicle.dailyCap,
      graceMinutes: Math.round(this.settings.graceHours * 60),
      fractionMinutes: this.settings.fractionMinutes,
      vatRate: this.settings.vat.enabled ? this.settings.vat.rate : 0,
    }
  }

  query() {
    return this.tenant
      .related('parkingStays')
      .query()
      .preload('unit', (unit) => unit.preload('building'))
      .preload('enteredBy')
      .preload('exitedBy')
  }

  async find(id: string) {
    const stay = await this.query().where('id', id).first()
    if (!stay) throw ResourceException.notFound('El registro no existe')
    return stay
  }

  /**
   * Grace minutes each plate already used per day, by the stays that left
   * (except `exceptId`), from `since` (local date) on.
   */
  async graceUsage(plates: string[], since: string, exceptId?: string) {
    const usage = new Map<string, GraceUsage>()
    if (plates.length === 0) return usage
    const start = DateTime.fromISO(since, { zone: this.zone }).startOf('day')
    const rows = await db
      .from('parking_stays')
      .where('tenant_id', this.tenant.id)
      .whereIn('plate', plates)
      .where('status', 'exited')
      .where('exited_at', '>=', start.toJSDate())
      .if(exceptId, (q) => q.whereNot('id', exceptId!))
      .select('plate', 'days')
    for (const row of rows) {
      const byDate = usage.get(row.plate) ?? {}
      for (const day of (row.days ?? []) as ParkingDay[]) {
        byDate[day.date] = (byDate[day.date] ?? 0) + day.graceMinutes
      }
      usage.set(row.plate, byDate)
    }
    return usage
  }

  /** What a stay costs if it leaves at `at` */
  quote(stay: ParkingStay, at: DateTime, usage: GraceUsage = {}): ParkingQuote {
    return quoteParking(stay.tariff, splitByDay(stay.enteredAt, at, this.zone), usage)
  }

  /** The stored price of a stay that left */
  storedQuote(stay: ParkingStay): ParkingQuote {
    const total = toCents(stay.amount) / 100
    const vat = toCents(stay.vatAmount) / 100
    return {
      days: stay.days ?? [],
      minutes: stay.minutes ?? 0,
      graceMinutes: stay.graceMinutes ?? 0,
      billedMinutes: stay.billedMinutes ?? 0,
      total,
      base: total - vat,
      vat,
    }
  }

  /** Current price of the stays still inside (one query for the grace of every plate) */
  async quotes(stays: ParkingStay[]) {
    const now = DateTime.now()
    const inside = stays.filter((stay) => stay.status === 'inside')
    const plates = [...new Set(inside.map((stay) => stay.plate).filter((p): p is string => !!p))]
    const since = inside.length
      ? inside.map((stay) => stay.enteredAt.setZone(this.zone).toISODate()!).sort()[0]!
      : ''
    const usage = await this.graceUsage(plates, since)
    return new Map(
      stays.map((stay) => [
        stay.id,
        stay.status === 'inside'
          ? this.quote(stay, now, stay.plate ? usage.get(stay.plate) : undefined)
          : this.storedQuote(stay),
      ])
    )
  }

  isOverstay(stay: ParkingStay) {
    const max = this.settings.maxStayHours
    if (!max) return false
    const end = stay.exitedAt ?? DateTime.now()
    return end.diff(stay.enteredAt, 'hours').hours > max
  }

  async summary(): Promise<ParkingSummary> {
    const startOfDay = DateTime.now().setZone(this.zone).startOf('day').toJSDate()
    const [inside, today, enteredRows] = await Promise.all([
      this.tenant.related('parkingStays').query().where('status', 'inside'),
      db
        .from('parking_stays')
        .where('tenant_id', this.tenant.id)
        .where('exited_at', '>=', startOfDay)
        .select(
          db.raw('count(*)::int AS exits'),
          db.raw(
            `coalesce(sum(amount) FILTER (WHERE settlement IN ('gate', 'unit')), 0) AS billed`
          ),
          db.raw(`coalesce(sum(amount) FILTER (WHERE settlement = 'gate'), 0) AS gate`)
        )
        .first(),
      db
        .from('parking_stays')
        .where('tenant_id', this.tenant.id)
        .where('entered_at', '>=', startOfDay)
        .count('* as total')
        .first(),
    ])
    return {
      enabled: this.settings.enabled,
      byType: VEHICLE_TYPES.map((type) => ({
        type,
        capacity: this.settings.vehicles[type].capacity,
        inside: inside.filter((stay) => stay.vehicleType === type).length,
      })),
      inside: inside.length,
      overstays: inside.filter((stay) => this.isOverstay(stay)).length,
      today: {
        entries: Number(enteredRows?.total ?? 0),
        exits: Number(today?.exits ?? 0),
        billed: toCents(today?.billed) / 100,
        collectedAtGate: toCents(today?.gate) / 100,
      },
    }
  }

  /**
   * What the guard finds for a plate, an access code or a name: visits
   * authorized from the portal for today, whether it is inside already and
   * whether it belongs to a resident.
   */
  async lookup(
    term: string
  ): Promise<Omit<ParkingLookup, 'inside'> & { inside: ParkingStay | null }> {
    const plate = normalizePlate(term)
    const code = term.trim().toUpperCase()
    const now = DateTime.now().setZone(this.zone)
    const visits = await Visit.query()
      .where('tenant_id', this.tenant.id)
      .whereNull('checked_in_at')
      .where((q) =>
        q
          .whereNull('expected_at')
          .orWhereBetween('expected_at', [
            now.minus({ hours: 12 }).toJSDate(),
            now.endOf('day').toJSDate(),
          ])
      )
      .where((q) => {
        q.where('access_code', code)
        if (plate) {
          q.orWhereRaw(`regexp_replace(upper(vehicle_plate), '[^A-Z0-9]', '', 'g') = ?`, [plate])
        }
        if (term.trim().length >= 3) q.orWhereILike('visitor_name', `%${term.trim()}%`)
      })
      .preload('unit', (unit) => unit.preload('building'))
      .preload('authorizedBy')
      .orderBy('expected_at')
      .limit(10)

    // A code that exists but does not work today: say why
    const codeVisit = visits.some((visit) => visit.accessCode === code)
      ? null
      : await Visit.query()
          .where('tenant_id', this.tenant.id)
          .where('access_code', code)
          .preload('unit', (unit) => unit.preload('building'))
          .orderBy('created_at', 'desc')
          .first()
    const codeIssue = codeVisit
      ? {
          reason: codeVisit.checkedInAt
            ? ('used' as const)
            : codeVisit.expectedAt && codeVisit.expectedAt > now.endOf('day')
              ? ('upcoming' as const)
              : ('expired' as const),
          visitorName: codeVisit.visitorName,
          expectedAt: codeVisit.expectedAt?.toISO() ?? null,
          checkedInAt: codeVisit.checkedInAt?.toISO() ?? null,
          unit: unitRef(codeVisit.unit),
        }
      : null

    const inside = plate
      ? await this.query().where('status', 'inside').where('plate', plate).first()
      : null
    const vehicle = plate
      ? await db
          .from('vehicles')
          .where('tenant_id', this.tenant.id)
          .whereNull('deleted_at')
          .whereRaw(`regexp_replace(upper(plate), '[^A-Z0-9]', '', 'g') = ?`, [plate])
          .select('unit_id', 'plate')
          .first()
      : null
    const vehicleUnit = vehicle
      ? await Unit.query()
          .where('tenant_id', this.tenant.id)
          .where('id', vehicle.unit_id)
          .preload('building')
          .first()
      : null

    return {
      visits: visits.map((visit) => ({
        id: visit.id,
        visitorName: visit.visitorName,
        visitorDocument: visit.visitorDocument,
        vehiclePlate: visit.vehiclePlate,
        accessCode: visit.accessCode,
        expectedAt: visit.expectedAt?.toISO() ?? null,
        unit: unitRef(visit.unit),
        authorizedBy: visit.authorizedBy?.fullName ?? null,
      })),
      inside,
      residentVehicle:
        vehicle && vehicleUnit ? { plate: vehicle.plate, unit: unitRef(vehicleUnit) } : null,
      codeIssue,
    }
  }

  /** Registers a vehicle entering. With `visitId`, the visit authorized from the portal */
  async enter(input: ParkingEntryInput, userId: string) {
    this.assertEnabled()
    const plate = normalizePlate(input.plate)
    if (!plate && PLATE_REQUIRED_TYPES.includes(input.vehicleType)) {
      throw new FieldException('plate', 'Escribe la placa del vehículo')
    }
    if (!plate && !input.vehicleDescription?.trim()) {
      throw new FieldException('vehicleDescription', 'Describe el vehículo (color, marca…)')
    }

    return db.transaction(async (trx) => {
      // Serializes entries: the capacity check and the "already inside" check
      await trx.rawQuery('SELECT pg_advisory_xact_lock(hashtext(?))', [`parking:${this.tenant.id}`])

      let visit: Visit | null = null
      let unitId = input.unitId
      if (input.visitId) {
        visit = await Visit.query({ client: trx })
          .where('tenant_id', this.tenant.id)
          .where('id', input.visitId)
          .whereNull('checked_in_at')
          .forUpdate()
          .first()
        if (!visit) throw new FieldException('visitId', 'La visita no existe o ya ingresó')
        unitId = visit.unitId
      } else if (input.authorization === 'pre_authorized') {
        throw new FieldException('visitId', 'Elige la visita autorizada desde el portal')
      } else if (!input.authorizedByName?.trim()) {
        throw new FieldException('authorizedByName', 'Escribe quién autorizó el ingreso')
      }

      const unit = await Unit.query({ client: trx })
        .where('tenant_id', this.tenant.id)
        .where('id', unitId)
        .whereNull('deleted_at')
        .first()
      if (!unit) throw new FieldException('unitId', 'La unidad no existe')

      if (plate) {
        const inside = await trx
          .from('parking_stays')
          .where('tenant_id', this.tenant.id)
          .where('status', 'inside')
          .where('plate', plate)
          .first()
        if (inside) throw new FieldException('plate', `El vehículo ${plate} ya está adentro`)
      }
      const [{ total }] = await trx
        .from('parking_stays')
        .where('tenant_id', this.tenant.id)
        .where('status', 'inside')
        .where('vehicle_type', input.vehicleType)
        .count('* as total')

      const now = DateTime.now()
      // Announced at the gate: the visit is recorded too, so the unit sees it in its portal
      if (!visit) {
        visit = await Visit.create(
          {
            tenantId: this.tenant.id,
            unitId: unit.id,
            visitorName: input.visitorName.trim(),
            visitorDocument: input.visitorDocument?.trim() || null,
            vehiclePlate: plate,
            type: 'guest',
            checkedInAt: now,
            registeredById: userId,
          },
          { client: trx }
        )
      }
      const stay = await ParkingStay.create(
        {
          tenantId: this.tenant.id,
          status: 'inside',
          unitId: unit.id,
          visitId: visit?.id ?? null,
          vehicleType: input.vehicleType,
          plate,
          vehicleDescription: input.vehicleDescription?.trim() || null,
          visitorName: input.visitorName.trim(),
          visitorDocument: input.visitorDocument?.trim() || null,
          authorizationMethod: input.visitId ? 'pre_authorized' : input.authorization,
          authorizedByName: input.visitId ? null : input.authorizedByName!.trim(),
          authorizationNotes: input.authorizationNotes?.trim() || null,
          overCapacity: Number(total) >= this.settings.vehicles[input.vehicleType].capacity,
          tariff: this.tariffFor(input.vehicleType),
          enteredAt: now,
          enteredById: userId,
        },
        { client: trx }
      )
      if (input.visitId) {
        visit.useTransaction(trx)
        visit.merge({ checkedInAt: now, registeredById: userId })
        await visit.save()
      }
      return stay
    })
  }

  /** Fixes the data of a vehicle still inside (a mistyped plate, the wrong unit…) */
  async correct(
    stay: ParkingStay,
    input: Partial<
      Pick<
        ParkingEntryInput,
        'plate' | 'vehicleDescription' | 'unitId' | 'visitorName' | 'visitorDocument'
      >
    >
  ) {
    if (stay.status !== 'inside') {
      throw ResourceException.conflict('El vehículo ya salió: su registro no se puede cambiar')
    }
    if (input.unitId && input.unitId !== stay.unitId) {
      const unit = await Unit.query()
        .where('tenant_id', this.tenant.id)
        .where('id', input.unitId)
        .whereNull('deleted_at')
        .first()
      if (!unit) throw new FieldException('unitId', 'La unidad no existe')
      stay.unitId = unit.id
    }
    if (input.plate !== undefined) {
      const plate = normalizePlate(input.plate)
      if (!plate && PLATE_REQUIRED_TYPES.includes(stay.vehicleType)) {
        throw new FieldException('plate', 'Escribe la placa del vehículo')
      }
      stay.plate = plate
    }
    if (input.vehicleDescription !== undefined) {
      stay.vehicleDescription = input.vehicleDescription?.trim() || null
    }
    if (input.visitorName) stay.visitorName = input.visitorName.trim()
    if (input.visitorDocument !== undefined) {
      stay.visitorDocument = input.visitorDocument?.trim() || null
    }
    try {
      await db.transaction(async (trx) => {
        stay.useTransaction(trx)
        await stay.save()
        await this.syncVisit(stay, trx)
      })
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new FieldException('plate', `El vehículo ${stay.plate} ya está adentro`)
      }
      throw error
    }
    return this.find(stay.id)
  }

  /**
   * Keeps the linked visit in line with a corrected stay. A visit authorized
   * from the portal keeps its unit: it belongs to whoever authorized it.
   */
  private async syncVisit(stay: ParkingStay, trx: Trx) {
    if (!stay.visitId) return
    const visit = await Visit.query({ client: trx })
      .where('tenant_id', this.tenant.id)
      .where('id', stay.visitId)
      .first()
    if (!visit) return
    visit.merge({
      visitorName: stay.visitorName,
      visitorDocument: stay.visitorDocument,
      vehiclePlate: stay.plate,
      ...(visit.authorizedById ? {} : { unitId: stay.unitId }),
    })
    await visit.save()
  }

  /**
   * Registers a vehicle leaving: prices the stay (with the grace its plate has
   * left each day), and charges it at the gate or to the unit, or exempts it.
   */
  async exit(stay: ParkingStay, input: ParkingExitInput, userId: string) {
    if (stay.status !== 'inside') throw ResourceException.conflict('El vehículo ya salió')
    if (input.exempt && !input.exemptReason?.trim()) {
      throw new FieldException('exemptReason', 'Escribe el motivo de la exención')
    }

    const now = DateTime.now()
    const since = stay.enteredAt.setZone(this.zone).toISODate()!
    const byPlate = stay.plate ? await this.graceUsage([stay.plate], since, stay.id) : null
    const usage = (stay.plate && byPlate?.get(stay.plate)) || {}
    const priced = this.quote(stay, now, usage)
    // Exempt stays do not use the plate's daily grace
    const quote: ParkingQuote = input.exempt
      ? {
          ...priced,
          days: priced.days.map((day) => ({
            ...day,
            graceMinutes: 0,
            billedMinutes: 0,
            amount: 0,
          })),
          graceMinutes: 0,
          billedMinutes: 0,
          total: 0,
          base: 0,
          vat: 0,
        }
      : priced

    let settlement: ParkingSettlement
    if (input.exempt) settlement = 'exempt'
    else if (quote.total === 0) settlement = 'free'
    else {
      const mode = this.settings.paymentMode
      if (mode === 'ask' && !input.paymentMode) {
        throw new FieldException('paymentMode', 'Elige si paga en portería o se carga a la unidad')
      }
      settlement = mode === 'ask' ? input.paymentMode! : mode
      if (settlement === 'gate' && !input.paymentMethod) {
        throw new FieldException('paymentMethod', 'Elige el medio de pago')
      }
    }

    const record = async (trx: Trx, scope?: FinanceScope) => {
      const locked = await ParkingStay.query({ client: trx })
        .where('tenant_id', this.tenant.id)
        .where('id', stay.id)
        .where('status', 'inside')
        .forUpdate()
        .first()
      if (!locked) throw ResourceException.conflict('El vehículo ya salió')

      const number = await nextNumber(trx, this.tenant.id, 'visitor_parking')
      locked.merge({
        status: 'exited',
        number,
        exitedAt: now,
        exitedById: userId,
        days: quote.days,
        minutes: quote.minutes,
        graceMinutes: quote.graceMinutes,
        billedMinutes: quote.billedMinutes,
        amount: fromCents(quote.total * 100),
        vatAmount: fromCents(quote.vat * 100),
        settlement,
        paymentMethod: settlement === 'gate' ? input.paymentMethod! : null,
        exemptReason: input.exempt ? input.exemptReason!.trim() : null,
        receiptEmail: input.receiptEmail?.trim() || null,
      })
      if (scope && settlement === 'gate') await this.postGatePayment(scope, locked, quote)
      if (scope && settlement === 'unit') await this.chargeUnit(scope, locked, quote)
      locked.useTransaction(trx)
      await locked.save()

      if (locked.visitId) {
        await trx
          .from('visits')
          .where('tenant_id', this.tenant.id)
          .where('id', locked.visitId)
          .update({ checked_out_at: now.toJSDate(), updated_at: now.toJSDate() })
      }
      return locked
    }

    const saved =
      settlement === 'gate' || settlement === 'unit'
        ? await withFinance(this.tenant, userId, (scope) => record(scope.trx, scope))
        : await db.transaction((trx) => record(trx))
    return this.find(saved.id)
  }

  /** Emails the receipt of a stay that left, and remembers the address */
  async sendReceipt(stay: ParkingStay, email: string) {
    if (stay.status !== 'exited' || stay.number === null) {
      throw ResourceException.conflict('El comprobante se genera cuando el vehículo sale')
    }
    const pesos = (value: number) =>
      new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
      }).format(value)
    const when = (value: DateTime) =>
      value.setZone(this.zone).setLocale('es-CO').toFormat('d LLL yyyy, h:mm a')
    const quote = this.storedQuote(stay)
    const unit = stay.unit
    const issuer = [
      this.tenant.legalName || this.tenant.name,
      this.tenant.taxId && `NIT ${this.tenant.taxId}`,
    ]
      .filter(Boolean)
      .join(' · ')
    const settlement = stay.settlement!
    const totals = [
      { label: 'Tiempo', value: formatMinutes(quote.minutes) },
      { label: 'Horas de gracia', value: formatMinutes(quote.graceMinutes) },
      { label: 'Tiempo cobrado', value: formatMinutes(quote.billedMinutes) },
      ...(quote.vat > 0
        ? [
            { label: 'Base', value: pesos(quote.base) },
            { label: `IVA (${stay.tariff.vatRate} %)`, value: pesos(quote.vat) },
          ]
        : []),
      { label: 'Total', value: pesos(quote.total) },
      {
        label: 'Forma de pago',
        value:
          settlement === 'gate' && stay.paymentMethod
            ? `${PARKING_SETTLEMENT_LABELS.gate} · ${PAYMENT_METHOD_LABELS[stay.paymentMethod]}`
            : PARKING_SETTLEMENT_LABELS[settlement],
      },
    ]
    queueMail(
      new ParkingReceiptMail(email, {
        subject: `${this.tenant.name}: comprobante de parqueadero N.º ${stay.number}`,
        title: `Comprobante de parqueadero N.º ${stay.number}`,
        issuer,
        rows: [
          {
            label: 'Vehículo',
            value: [VEHICLE_TYPE_LABELS[stay.vehicleType], stay.plate ?? stay.vehicleDescription]
              .filter(Boolean)
              .join(' · '),
          },
          { label: 'Visitante', value: stay.visitorName },
          {
            label: 'Unidad visitada',
            value: unit.building ? `${unit.building.name} · ${unit.code}` : unit.code,
          },
          { label: 'Ingreso', value: when(stay.enteredAt) },
          { label: 'Salida', value: when(stay.exitedAt!) },
        ],
        totals,
        notes: [
          ...(settlement === 'exempt' && stay.exemptReason ? [`Exento: ${stay.exemptReason}`] : []),
          'Este comprobante no es una factura electrónica.',
        ],
      }),
      'parking receipt'
    )
    stay.receiptEmail = email
    stay.receiptSentAt = DateTime.now()
    await stay.save()
    return stay
  }

  /** Paid at the gate: cash box debit, income and VAT credits */
  private async postGatePayment(scope: FinanceScope, stay: ParkingStay, quote: ParkingQuote) {
    if (!this.settings.cashAccountId) {
      throw ResourceException.conflict(
        'Falta configurar la caja de portería. La administración la elige en la configuración del parqueadero.'
      )
    }
    const cash = await CashAccount.query({ client: scope.trx })
      .where('tenant_id', this.tenant.id)
      .where('id', this.settings.cashAccountId)
      .first()
    if (!cash) throw ResourceException.conflict('La caja de portería configurada no existe')
    const concept = await new ChargeService(scope).concept({ code: 'visitor_parking' })
    const entry = await scope.ledger.post({
      date: scope.today,
      type: 'visitor_parking',
      description:
        `Parqueadero de visitantes · comprobante ${stay.number} · ${stay.plate ?? stay.vehicleDescription ?? ''}`.trim(),
      sourceType: 'parking_stay',
      sourceId: stay.id,
      userId: scope.userId,
      lines: [
        { accountId: cash.ledgerAccountId, debit: quote.total * 100 },
        { accountId: concept.incomeAccountId!, credit: quote.base * 100 },
        { accountId: scope.accounts.key('tax.vat_payable').id, credit: quote.vat * 100 },
      ],
    })
    stay.cashAccountId = cash.id
    stay.journalEntryId = entry?.id ?? null
  }

  /** Charged to the visited unit: a receivable billed with its next fee */
  private async chargeUnit(scope: FinanceScope, stay: ParkingStay, quote: ParkingQuote) {
    const charges = new ChargeService(scope)
    const concept = await charges.concept({ code: 'visitor_parking' })
    const description = `${stay.plate ?? stay.vehicleDescription ?? 'Vehículo'} · ${stay.visitorName}`
    const [charge] = await charges.insert([
      {
        unitId: stay.unitId,
        concept,
        amount: quote.total * 100,
        period: periodOf(scope.today),
        dueOn: this.nextDueDate(scope),
        description,
        sourceType: 'visitor_parking',
        sourceId: stay.id,
        idempotencyKey: `visitor_parking:${stay.id}`,
      },
    ])
    const entry = await scope.ledger.post({
      date: scope.today,
      type: 'charge',
      description: `${concept.name} · comprobante ${stay.number} · ${description}`,
      sourceType: 'visitor_parking',
      sourceId: stay.id,
      userId: scope.userId,
      lines: [
        { accountId: concept.receivableAccountId!, debit: quote.total * 100, unitId: stay.unitId },
        { accountId: concept.incomeAccountId!, credit: quote.base * 100 },
        { accountId: scope.accounts.key('tax.vat_payable').id, credit: quote.vat * 100 },
      ],
    })
    stay.chargeId = charge!.id
    stay.journalEntryId = entry?.id ?? null
    await new PaymentService(scope).applyCredits([stay.unitId], scope.today)
  }

  /** The next fee due date of the conjunto: the charge is paid with the next fee */
  private nextDueDate(scope: FinanceScope) {
    const today = DateTime.fromISO(scope.today)
    const due = today.set({ day: scope.settings.dueDay })
    return (due < today ? due.plus({ months: 1 }) : due).toISODate()!
  }
}

function unitRef(unit: Unit) {
  return {
    id: unit.id,
    code: unit.code,
    building: unit.building ? { id: unit.building.id, name: unit.building.name } : null,
  }
}
