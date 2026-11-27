import { createHash, randomBytes } from 'node:crypto'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import {
  VEHICLE_TYPES,
  VEHICLE_TYPE_LABELS,
  notificationPreferences,
  toCents,
  type ParkingApplyInput,
  type ParkingLotteryInput,
  type VehicleType,
} from '@aptoph/shared'
import ParkingApplication from '#models/property/parking_application'
import ParkingAssignment from '#models/property/parking_assignment'
import ParkingLottery from '#models/property/parking_lottery'
import type ParkingSpot from '#models/property/parking_spot'
import Unit from '#models/property/unit'
import UnitOccupant from '#models/property/unit_occupant'
import Vehicle from '#models/property/vehicle'
import type Tenant from '#models/tenants/tenant'
import FieldException from '#exceptions/field_exception'
import ResourceException from '#exceptions/resource_exception'
import { EmailQuotaService } from '#services/announcements/email_quota'
import { nextNumber } from '#services/finance/support'
import { NotificationService } from '#services/notifications/notifications'
import { ParkingService, documentsOk } from '#services/property/parking'
import { activeOccupancy, balancesFor } from '#services/resident_scope'

type Trx = TransactionClientContract

/** Assignments that use a spot during a period */
const USING = ['scheduled', 'offered', 'active']
/** Applications that still count for the unit in a lottery */
const LIVE = ['pending', 'won', 'waiting', 'offered', 'accepted']

const day = (iso: string) => DateTime.fromISO(iso)
const isoDate = (value: DateTime | null | undefined) => value?.toISODate() ?? null

export const drawHash = (seed: string, applicationId: string) =>
  createHash('sha256').update(`${seed}:${applicationId}`).digest('hex')

/**
 * Lottery of the communal spots (docs/parking.md §Sorteo): applications, the
 * draw ordered by a published seed, the waiting list and the offers of the
 * spots freed during the period.
 */
export class ParkingLotteryService {
  readonly parking: ParkingService

  constructor(private tenant: Tenant) {
    this.parking = new ParkingService(tenant)
  }

  get settings() {
    return this.parking.settings
  }

  get today() {
    return this.parking.today
  }

  private formatDate(iso: string) {
    return DateTime.fromISO(iso).setLocale('es-CO').toFormat("d 'de' LLLL 'de' yyyy")
  }

  // Keeping states in time

  /**
   * Run before reading: ends assignments past their period, starts the
   * scheduled ones, expires unanswered offers (offering the spot to the next
   * one) and finishes the lotteries whose period ended.
   */
  async sync() {
    await this.parking.endExpired()
    const today = this.today
    const expired = await ParkingApplication.query()
      .where('tenant_id', this.tenant.id)
      .where('status', 'offered')
      .where('offer_expires_at', '<', DateTime.now().toJSDate())
    for (const application of expired) await this.closeOffer(application, 'expired')

    await db
      .from('parking_lotteries')
      .where('tenant_id', this.tenant.id)
      .where('status', 'drawn')
      .where('period_ends_on', '<', today)
      .update({ status: 'finished', updated_at: new Date() })
  }

  // Lotteries

  lotteriesQuery(client?: Trx) {
    return ParkingLottery.query({ client })
      .where('parking_lotteries.tenant_id', this.tenant.id)
      .preload('drawnBy')
  }

  async findLottery(id: string, client?: Trx) {
    const lottery = await this.lotteriesQuery(client).where('id', id).first()
    if (!lottery) throw ResourceException.notFound('El sorteo no existe')
    return lottery
  }

  /** Receiving applications (it may be past its closing time, waiting for the draw) */
  openLottery(client?: Trx) {
    return this.lotteriesQuery(client).where('status', 'open').first()
  }

  /** Drawn and with its period not over: its waiting list is alive */
  currentLottery(client?: Trx) {
    return this.lotteriesQuery(client)
      .where('status', 'drawn')
      .where('period_ends_on', '>=', this.today)
      .orderBy('period_starts_on', 'desc')
      .first()
  }

  private assertCommunal() {
    if (this.settings.mode === 'private') {
      throw ResourceException.conflict(
        'El conjunto solo tiene parqueaderos propios: no hay cupos comunales para sortear'
      )
    }
  }

  private periodEnd(startsOn: string, endsOn?: string | null) {
    const end = endsOn || this.parking.periodEnd(startsOn)
    if (end < startsOn) throw new FieldException('periodEndsOn', 'Debe ser posterior al inicio')
    return end
  }

  async create(input: ParkingLotteryInput, userId: string) {
    this.assertCommunal()
    const closesAt = DateTime.fromISO(input.closesAt, { setZone: true })
    if (!closesAt.isValid || closesAt <= DateTime.now()) {
      throw new FieldException('closesAt', 'El cierre de postulaciones debe ser futuro')
    }
    const end = this.periodEnd(input.periodStartsOn, input.periodEndsOn)
    const lottery = await db.transaction(async (trx) => {
      if (await this.openLottery(trx)) {
        throw ResourceException.conflict(
          'Ya hay un sorteo con postulaciones abiertas: sortéalo o anúlalo primero'
        )
      }
      return ParkingLottery.create(
        {
          tenantId: this.tenant.id,
          number: await nextNumber(trx, this.tenant.id, 'parking_lottery'),
          title: input.title.trim(),
          status: 'open',
          closesAt,
          periodStartsOn: day(input.periodStartsOn),
          periodEndsOn: day(end),
          notes: input.notes?.trim() || null,
          createdById: userId,
        },
        { client: trx }
      )
    })
    const warning = input.notify ? await this.notifyOpening(lottery) : null
    return { lottery, warning }
  }

  async update(lottery: ParkingLottery, input: Partial<ParkingLotteryInput>) {
    if (lottery.status !== 'open') {
      throw ResourceException.conflict('Solo se edita un sorteo con postulaciones abiertas')
    }
    if (input.title !== undefined) lottery.title = input.title.trim()
    if (input.closesAt !== undefined) {
      const closesAt = DateTime.fromISO(input.closesAt, { setZone: true })
      if (!closesAt.isValid) throw new FieldException('closesAt', 'Fecha inválida')
      lottery.closesAt = closesAt
    }
    if (input.periodStartsOn !== undefined || input.periodEndsOn !== undefined) {
      const start = input.periodStartsOn ?? lottery.periodStartsOn.toISODate()!
      const end =
        input.periodEndsOn === undefined
          ? input.periodStartsOn
            ? this.parking.periodEnd(start)
            : lottery.periodEndsOn.toISODate()!
          : this.periodEnd(start, input.periodEndsOn)
      if (end < start) throw new FieldException('periodEndsOn', 'Debe ser posterior al inicio')
      lottery.periodStartsOn = day(start)
      lottery.periodEndsOn = day(end)
    }
    if (input.notes !== undefined) lottery.notes = input.notes?.trim() || null
    await lottery.save()
    return lottery
  }

  async cancel(lottery: ParkingLottery) {
    if (lottery.status !== 'open') {
      throw ResourceException.conflict('Solo se anula un sorteo antes de sortearlo')
    }
    lottery.status = 'cancelled'
    await lottery.save()
    return lottery
  }

  /** Communal spots of each type it raffles (active ones) */
  async spotCounts() {
    const rows = await this.parking
      .spotsQuery()
      .where('ownership', 'communal')
      .where('is_active', true)
      .groupBy('vehicle_type')
      .select('vehicle_type')
      .count('* as total')
    return VEHICLE_TYPES.map((type) => ({
      type,
      count: Number(rows.find((row) => row.vehicleType === type)?.$extras.total ?? 0),
    })).filter((row) => row.count > 0)
  }

  async counts(lotteryIds: string[]) {
    const map = new Map<string, Record<string, number>>()
    if (!lotteryIds.length) return map
    const rows = await db
      .from('parking_applications')
      .whereIn('lottery_id', lotteryIds)
      .groupBy('lottery_id', 'status')
      .select('lottery_id', 'status')
      .count('* as total')
    for (const row of rows) {
      const counts = map.get(row.lottery_id) ?? {}
      counts[row.status] = Number(row.total)
      map.set(row.lottery_id, counts)
    }
    return map
  }

  // Applications

  applicationsQuery(client?: Trx) {
    return ParkingApplication.query({ client })
      .where('parking_applications.tenant_id', this.tenant.id)
      .preload('unit', (unit) => unit.preload('building'))
      .preload('vehicle')
      .preload('spot')
      .preload('appliedBy')
  }

  async findApplication(id: string, client?: Trx) {
    const application = await this.applicationsQuery(client).where('id', id).first()
    if (!application) throw ResourceException.notFound('La postulación no existe')
    return application
  }

  /** Position in the waiting list of each `waiting` application, by id */
  async queuePositions(lotteryIds: string[]) {
    const map = new Map<string, number>()
    if (!lotteryIds.length) return map
    const rows = await db
      .from('parking_applications')
      .whereIn('lottery_id', lotteryIds)
      .where('status', 'waiting')
      .select(
        'id',
        db.raw(
          'row_number() over (partition by lottery_id, vehicle_type order by draw_position) as position'
        )
      )
    for (const row of rows) map.set(row.id, Number(row.position))
    return map
  }

  /**
   * Requirements a unit does not meet for a spot of `type`: in the lottery
   * they are errors (debt, vehicle, documents). The maximum of spots is
   * checked by each caller, with what it counts.
   */
  async requirementErrors(
    unitId: string,
    type: VehicleType,
    vehicleId: string | null,
    client?: Trx
  ) {
    const errors: string[] = []
    const req = this.settings.requirements
    if (req.noDebt) {
      const since = DateTime.fromISO(this.today).minus({ days: req.debtToleranceDays }).toISODate()!
      const balances = await balancesFor(this.tenant, [unitId], since)
      const overdue = balances.get(unitId)!.overdue
      if (toCents(overdue) > 0) {
        errors.push(
          `No está a paz y salvo: debe $${Math.round(Number(overdue)).toLocaleString('es-CO')} vencidos`
        )
      }
    }
    if (req.vehicle || req.documents) {
      const vehicles = await Vehicle.query({ client })
        .where('tenant_id', this.tenant.id)
        .where('unit_id', unitId)
        .where('type', type)
        .whereNull('deleted_at')
        .if(vehicleId, (q) => q.where('id', vehicleId!))
      if (req.vehicle && !vehicles.length) {
        errors.push(
          `No tiene registrado un vehículo tipo ${VEHICLE_TYPE_LABELS[type].toLowerCase()}`
        )
      }
      if (req.documents && vehicles.length && !vehicles.some((v) => documentsOk(v, this.today))) {
        errors.push('El SOAT o la tecnomecánica del vehículo no están vigentes')
      }
    }
    return errors
  }

  private async privateSpots(unitIds: string[], client?: Trx) {
    const counts = await this.parking.spotsOf(unitIds, client)
    return new Map([...counts].map(([id, count]) => [id, count.private]))
  }

  private async privateSpotsOf(unitId: string, client?: Trx) {
    const counts = await this.privateSpots([unitId], client)
    return counts.get(unitId) ?? 0
  }

  /** Errors for a unit applying now (requirements, maximum, duplicate) */
  async applyErrors(
    lottery: ParkingLottery,
    unitId: string,
    type: VehicleType,
    vehicleId: string | null,
    client?: Trx
  ) {
    const errors = await this.requirementErrors(unitId, type, vehicleId, client)
    const applications = await ParkingApplication.query({ client })
      .where('lottery_id', lottery.id)
      .where('unit_id', unitId)
      .whereIn('status', LIVE)
    if (applications.some((a) => a.vehicleType === type)) {
      errors.unshift(`Ya se postuló para ${VEHICLE_TYPE_LABELS[type].toLowerCase()}`)
    }
    const owned = await this.privateSpotsOf(unitId, client)
    const max = this.settings.maxSpotsPerUnit
    if (owned + applications.length >= max) {
      errors.unshift(
        owned >= max
          ? `Ya tiene ${owned} ${owned === 1 ? 'parqueadero propio' : 'parqueaderos propios'} y el máximo es ${max}`
          : `Ya tiene ${owned + applications.length} cupos o postulaciones y el máximo es ${max}`
      )
    }
    return errors
  }

  private priorityGroup(privateSpots: number) {
    return this.settings.mode === 'mixed' &&
      this.settings.requirements.priorityWithoutPrivate &&
      privateSpots > 0
      ? 1
      : 0
  }

  /** The lottery a unit applies to now: open, or the current one (waiting list) */
  async applyTarget() {
    const open = await this.openLottery()
    if (open) {
      if (open.closesAt <= DateTime.now()) {
        throw ResourceException.conflict(
          'Las postulaciones ya cerraron: espera el resultado del sorteo'
        )
      }
      return open
    }
    const current = await this.currentLottery()
    if (current) return current
    throw ResourceException.conflict('No hay un sorteo de parqueaderos abierto')
  }

  async apply(input: ParkingApplyInput, userId: string) {
    this.assertCommunal()
    const lottery = await this.applyTarget()
    const late = lottery.status === 'drawn'
    const spots = await this.spotCounts()
    if (!spots.some((row) => row.type === input.vehicleType)) {
      throw new FieldException(
        'vehicleType',
        `No hay cupos comunales para ${VEHICLE_TYPE_LABELS[input.vehicleType].toLowerCase()}`
      )
    }
    const application = await db.transaction(async (trx) => {
      await trx.rawQuery('SELECT pg_advisory_xact_lock(hashtext(?))', [
        `parking-apply:${lottery.id}:${input.unitId}`,
      ])
      const unit = await Unit.query({ client: trx })
        .where('tenant_id', this.tenant.id)
        .where('id', input.unitId)
        .whereNull('deleted_at')
        .whereIn('type', ['apartment', 'house', 'commercial'])
        .first()
      if (!unit) throw new FieldException('unitId', 'Elige un apartamento, casa o local')
      if (input.vehicleId) {
        const vehicle = await Vehicle.query({ client: trx })
          .where('tenant_id', this.tenant.id)
          .where('id', input.vehicleId)
          .where('unit_id', unit.id)
          .whereNull('deleted_at')
          .first()
        if (!vehicle) throw new FieldException('vehicleId', 'El vehículo no es de la unidad')
        if (vehicle.type !== input.vehicleType) {
          throw new FieldException('vehicleId', 'El vehículo no es del tipo del cupo')
        }
      }
      const errors = await this.applyErrors(
        lottery,
        unit.id,
        input.vehicleType,
        input.vehicleId ?? null,
        trx
      )
      if (errors.length) throw new FieldException('unitId', errors.join('. '))

      const owned = await this.privateSpotsOf(unit.id, trx)
      let drawPosition: number | null = null
      if (late) {
        const last = await trx
          .from('parking_applications')
          .where('lottery_id', lottery.id)
          .where('vehicle_type', input.vehicleType)
          .max('draw_position as max')
          .first()
        drawPosition = Number(last?.max ?? 0) + 1
      }
      return ParkingApplication.create(
        {
          tenantId: this.tenant.id,
          lotteryId: lottery.id,
          unitId: unit.id,
          vehicleId: input.vehicleId ?? null,
          vehicleType: input.vehicleType,
          status: late ? 'waiting' : 'pending',
          priorityGroup: this.priorityGroup(owned),
          drawPosition,
          late,
          appliedById: userId,
        },
        { client: trx }
      )
    })
    // Late, and there is a free spot of the type: offer it right away
    if (late) {
      const free = await this.freeSpots(input.vehicleType, lottery)
      for (const spot of free) {
        const offered = await this.offerNext(spot.id)
        if (!offered) break
      }
    }
    return application
  }

  async withdraw(application: ParkingApplication) {
    if (application.status === 'offered') return this.closeOffer(application, 'declined')
    if (!['pending', 'waiting'].includes(application.status)) {
      throw ResourceException.conflict('La postulación ya no se puede retirar')
    }
    application.status = 'withdrawn'
    application.respondedAt = DateTime.now()
    await application.save()
    return application
  }

  // Draw

  /**
   * Draws the lottery: current holders end the day before the period starts,
   * each eligible application gets SHA-256(seed:id) and, by vehicle type, the
   * spots go in order (priority group, then hash). The rest is the waiting
   * list, in that order.
   */
  async draw(lottery: ParkingLottery, userId: string) {
    if (lottery.status !== 'open') throw ResourceException.conflict('El sorteo ya se hizo')
    const seed = randomBytes(32).toString('hex')
    const start = lottery.periodStartsOn.toISODate()!
    const end = lottery.periodEndsOn.toISODate()!
    const before = DateTime.fromISO(start).minus({ days: 1 }).toISODate()!
    const startsActive = start <= this.today
    const max = this.settings.maxSpotsPerUnit

    const results = await db.transaction(async (trx) => {
      const locked = await ParkingLottery.query({ client: trx })
        .where('tenant_id', this.tenant.id)
        .where('id', lottery.id)
        .forUpdate()
        .firstOrFail()
      if (locked.status !== 'open') throw ResourceException.conflict('El sorteo ya se hizo')

      // 1. "Terminan y hay nuevo sorteo": current holders end with the period
      await trx
        .from('parking_assignments')
        .where('tenant_id', this.tenant.id)
        .whereIn('status', ['offered', 'active'])
        .where('starts_on', '<', start)
        .where((q) => q.whereNull('ends_on').orWhere('ends_on', '>=', start))
        .update({ ends_on: before, updated_at: new Date() })
      await trx
        .from('parking_assignments')
        .where('tenant_id', this.tenant.id)
        .where('status', 'active')
        .where('ends_on', '<', this.today)
        .update({ status: 'ended', ended_on: trx.raw('ends_on'), ended_at: new Date() })
      // Open offers of the previous period lapse with it
      await trx
        .from('parking_applications')
        .where('tenant_id', this.tenant.id)
        .whereNot('lottery_id', lottery.id)
        .whereIn('status', ['waiting'])
        .update({ status: 'expired', updated_at: new Date() })
      await trx
        .from('parking_lotteries')
        .where('tenant_id', this.tenant.id)
        .where('status', 'drawn')
        .update({ status: 'finished', updated_at: new Date() })

      // 2. Spots of the period: active communal ones nobody keeps into it
      const spots = await this.parking
        .spotsQuery(trx)
        .where('ownership', 'communal')
        .where('is_active', true)
        .whereNotExists((sub) =>
          sub
            .from('parking_assignments as a')
            .whereColumn('a.spot_id', 'parking_spots.id')
            .whereIn('a.status', USING)
            .where((q) => q.whereNull('a.ends_on').orWhere('a.ends_on', '>=', start))
        )
        .orderByRaw('length(code), code')

      // 3. Applications, in the order of the seed
      const applications = await ParkingApplication.query({ client: trx })
        .where('lottery_id', lottery.id)
        .where('status', 'pending')
        .forUpdate()
      const owned = await this.privateSpots([...new Set(applications.map((a) => a.unitId))], trx)
      const held = new Map(owned)
      const ranked: Array<{ application: ParkingApplication; errors: string[] }> = []
      for (const application of applications) {
        application.drawHash = drawHash(seed, application.id)
        application.priorityGroup = this.priorityGroup(owned.get(application.unitId) ?? 0)
        const errors = await this.requirementErrors(
          application.unitId,
          application.vehicleType,
          application.vehicleId,
          trx
        )
        ranked.push({ application, errors })
      }
      ranked.sort(
        (a, b) =>
          a.application.priorityGroup - b.application.priorityGroup ||
          a.application.drawHash!.localeCompare(b.application.drawHash!)
      )

      const free = new Map<VehicleType, ParkingSpot[]>()
      for (const type of VEHICLE_TYPES) {
        free.set(
          type,
          spots.filter((spot) => spot.vehicleType === type)
        )
      }
      const positions = new Map<VehicleType, number>()
      for (const { application, errors } of ranked) {
        if (errors.length) {
          application.status = 'ineligible'
          application.ineligibleReason = errors.join('. ')
          await application.useTransaction(trx).save()
          continue
        }
        const type = application.vehicleType
        const position = (positions.get(type) ?? 0) + 1
        positions.set(type, position)
        application.drawPosition = position
        if ((held.get(application.unitId) ?? 0) >= max) {
          application.status = 'ineligible'
          application.ineligibleReason = `Ya ganó o tiene el máximo de ${max} parqueaderos`
        } else {
          const spot = free.get(type)!.shift()
          if (spot) {
            const assignment = await ParkingAssignment.create(
              {
                tenantId: this.tenant.id,
                spotId: spot.id,
                unitId: application.unitId,
                vehicleId: application.vehicleId,
                status: startsActive ? 'active' : 'scheduled',
                startsOn: day(start),
                endsOn: day(end),
                monthlyRate: this.settings.rates[type].communal.toFixed(2),
                lotteryId: lottery.id,
                applicationId: application.id,
                createdById: userId,
              },
              { client: trx }
            )
            void assignment
            application.status = 'won'
            application.spotId = spot.id
            held.set(application.unitId, (held.get(application.unitId) ?? 0) + 1)
          } else {
            application.status = 'waiting'
          }
        }
        await application.useTransaction(trx).save()
      }

      locked.merge({
        status: 'drawn',
        seed,
        drawnAt: DateTime.now(),
        drawnById: userId,
        closesAt: locked.closesAt < DateTime.now() ? locked.closesAt : DateTime.now(),
      })
      await locked.useTransaction(trx).save()
      return ranked.map((row) => row.application)
    })

    await this.notifyResults(lottery, results)
    return results
  }

  // Waiting list and offers

  /** Free communal spots of a type for the current period of `lottery` */
  async freeSpots(type: VehicleType, lottery: ParkingLottery, client?: Trx) {
    const start = DateTime.max(lottery.periodStartsOn, DateTime.fromISO(this.today)).toISODate()!
    return this.parking
      .spotsQuery(client)
      .where('ownership', 'communal')
      .where('is_active', true)
      .where('vehicle_type', type)
      .whereNotExists((sub) =>
        sub
          .from('parking_assignments as a')
          .whereColumn('a.spot_id', 'parking_spots.id')
          .whereIn('a.status', USING)
          .where((q) => q.whereNull('a.ends_on').orWhere('a.ends_on', '>=', start))
      )
      .orderByRaw('length(code), code')
  }

  /**
   * Offers `spotId` to the next one in the waiting list of the current
   * lottery (skipping those who no longer meet the requirements). The unit
   * has `offerDays` to accept it in the portal.
   */
  async offerNext(spotId: string) {
    const lottery = await this.currentLottery()
    if (!lottery) return null
    for (let attempt = 0; attempt < 100; attempt++) {
      const outcome = await db.transaction(async (trx) => {
        await trx.rawQuery('SELECT pg_advisory_xact_lock(hashtext(?))', [`parking-spot:${spotId}`])
        const spot = await this.parking
          .spotsQuery(trx)
          .where('id', spotId)
          .where('ownership', 'communal')
          .where('is_active', true)
          .first()
        if (!spot) return { done: true as const }
        const free = await this.freeSpots(spot.vehicleType, lottery, trx)
        if (!free.some((row) => row.id === spot.id)) return { done: true as const }

        const next = await ParkingApplication.query({ client: trx })
          .where('lottery_id', lottery.id)
          .where('status', 'waiting')
          .where('vehicle_type', spot.vehicleType)
          .orderBy('draw_position')
          .forUpdate()
          .first()
        if (!next) return { done: true as const }

        const errors = await this.requirementErrors(
          next.unitId,
          next.vehicleType,
          next.vehicleId,
          trx
        )
        const startsOn = DateTime.max(lottery.periodStartsOn, DateTime.fromISO(this.today))
        const using = await ParkingAssignment.query({ client: trx })
          .where('tenant_id', this.tenant.id)
          .where('unit_id', next.unitId)
          .whereIn('status', USING)
          .where((q) => q.whereNull('ends_on').orWhere('ends_on', '>=', startsOn.toISODate()!))
        const owned = await this.privateSpotsOf(next.unitId, trx)
        if (owned + using.length >= this.settings.maxSpotsPerUnit) {
          errors.push(`Ya tiene el máximo de ${this.settings.maxSpotsPerUnit} parqueaderos`)
        }
        if (errors.length) {
          next.status = 'ineligible'
          next.ineligibleReason = errors.join('. ')
          await next.useTransaction(trx).save()
          return { done: false as const }
        }

        await ParkingAssignment.create(
          {
            tenantId: this.tenant.id,
            spotId: spot.id,
            unitId: next.unitId,
            vehicleId: next.vehicleId,
            status: 'offered',
            startsOn,
            endsOn: lottery.periodEndsOn,
            monthlyRate: this.settings.rates[spot.vehicleType].communal.toFixed(2),
            lotteryId: lottery.id,
            applicationId: next.id,
          },
          { client: trx }
        )
        next.merge({
          status: 'offered',
          spotId: spot.id,
          offerExpiresAt: DateTime.now().plus({ days: this.settings.offerDays }),
        })
        await next.useTransaction(trx).save()
        return { done: true as const, application: next, spot }
      })
      if (outcome.done) {
        if ('application' in outcome && outcome.application) {
          await this.notifyOffer(outcome.application, outcome.spot, lottery)
          return outcome.application
        }
        return null
      }
    }
    return null
  }

  /** The unit accepts the spot offered to it */
  async accept(application: ParkingApplication) {
    if (application.status !== 'offered') {
      throw ResourceException.conflict('No hay un cupo ofrecido para esta postulación')
    }
    if (application.offerExpiresAt && application.offerExpiresAt < DateTime.now()) {
      await this.closeOffer(application, 'expired')
      throw ResourceException.conflict('La oferta venció')
    }
    await db.transaction(async (trx) => {
      const assignment = await ParkingAssignment.query({ client: trx })
        .where('tenant_id', this.tenant.id)
        .where('application_id', application.id)
        .where('status', 'offered')
        .forUpdate()
        .firstOrFail()
      assignment.status = assignment.startsOn.toISODate()! <= this.today ? 'active' : 'scheduled'
      await assignment.useTransaction(trx).save()
      application.merge({ status: 'accepted', respondedAt: DateTime.now() })
      await application.useTransaction(trx).save()
    })
    return application
  }

  /** The unit declines it, or the offer expires: the spot goes to the next one */
  async closeOffer(application: ParkingApplication, outcome: 'declined' | 'expired') {
    const spotId = application.spotId
    await db.transaction(async (trx) => {
      const assignment = await ParkingAssignment.query({ client: trx })
        .where('tenant_id', this.tenant.id)
        .where('application_id', application.id)
        .where('status', 'offered')
        .forUpdate()
        .first()
      if (assignment) {
        assignment.merge({
          status: 'rejected',
          endedOn: assignment.startsOn.minus({ days: 1 }),
          endReason: outcome === 'declined' ? 'offer_declined' : 'offer_expired',
          endNote:
            outcome === 'declined'
              ? 'La unidad no aceptó el cupo ofrecido'
              : `Sin respuesta en ${this.settings.offerDays} días`,
          endedAt: DateTime.now(),
        })
        await assignment.useTransaction(trx).save()
      }
      application.merge({ status: outcome, respondedAt: DateTime.now() })
      await application.useTransaction(trx).save()
    })
    if (outcome === 'expired') await this.notifyExpired(application)
    if (spotId) await this.offerNext(spotId)
    return application
  }

  /** The administration gives a free spot straight to an application, skipping the offer */
  async assignApplication(application: ParkingApplication, spotId: string, userId: string) {
    if (!['waiting', 'pending'].includes(application.status)) {
      throw ResourceException.conflict('La postulación no está en la lista de espera')
    }
    const lottery = await this.findLottery(application.lotteryId)
    if (lottery.status !== 'drawn') {
      throw ResourceException.conflict('Primero haz el sorteo')
    }
    await db.transaction(async (trx) => {
      await trx.rawQuery('SELECT pg_advisory_xact_lock(hashtext(?))', [`parking-spot:${spotId}`])
      const free = await this.freeSpots(application.vehicleType, lottery, trx)
      const spot = free.find((row) => row.id === spotId)
      if (!spot) throw new FieldException('spotId', 'El parqueadero no está libre o no es del tipo')
      const startsOn = DateTime.max(lottery.periodStartsOn, DateTime.fromISO(this.today))
      await ParkingAssignment.create(
        {
          tenantId: this.tenant.id,
          spotId: spot.id,
          unitId: application.unitId,
          vehicleId: application.vehicleId,
          status: startsOn.toISODate()! <= this.today ? 'active' : 'scheduled',
          startsOn,
          endsOn: lottery.periodEndsOn,
          monthlyRate: this.settings.rates[spot.vehicleType].communal.toFixed(2),
          lotteryId: lottery.id,
          applicationId: application.id,
          createdById: userId,
        },
        { client: trx }
      )
      application.merge({ status: 'accepted', spotId: spot.id, respondedAt: DateTime.now() })
      await application.useTransaction(trx).save()
    })
    await application.load('spot')
    await this.notifyAssigned(application, lottery)
    return application
  }

  // Emails

  /** People with an account of each unit, by unit */
  private async residentsOf(unitIds: string[]) {
    const map = new Map<string, string[]>()
    if (!unitIds.length) return map
    const occupants = await UnitOccupant.query()
      .where('tenant_id', this.tenant.id)
      .whereIn('unit_id', unitIds)
      .whereNotNull('user_id')
      .where(activeOccupancy(this.today))
      .select('unit_id', 'user_id')
    for (const occupant of occupants) {
      const list = map.get(occupant.unitId) ?? []
      if (!list.includes(occupant.userId!)) list.push(occupant.userId!)
      map.set(occupant.unitId, list)
    }
    return map
  }

  /** Bell, email and push by each person's preferences (category parking) */
  private send(
    userIds: string[],
    content: {
      title: string
      paragraphs: string[]
      rows: Array<{ label: string; value: string }>
      action?: string
    },
    type: string
  ) {
    return new NotificationService(this.tenant).notify(userIds, {
      app: 'web',
      category: 'parking',
      type,
      title: content.title,
      body: content.paragraphs[0] ?? null,
      path: '/parqueaderos',
      email: {
        paragraphs: content.paragraphs,
        rows: content.rows,
        action: content.action ?? 'Ver en el portal',
      },
    })
  }

  private periodRow(lottery: ParkingLottery) {
    return {
      label: 'Periodo',
      value: `${this.formatDate(lottery.periodStartsOn.toISODate()!)} al ${this.formatDate(lottery.periodEndsOn.toISODate()!)}`,
    }
  }

  /**
   * Applications open, to every resident with an account. Bulk: it uses the
   * monthly email quota; without room nothing is sent. Returns a warning.
   */
  async notifyOpening(lottery: ParkingLottery) {
    const units = await Unit.query()
      .where('tenant_id', this.tenant.id)
      .whereNull('deleted_at')
      .whereIn('type', ['apartment', 'house', 'commercial'])
      .select('id')
    const residents = await this.residentsOf(units.map((unit) => unit.id))
    const recipients = [...new Set([...residents.values()].flat())]
    if (!recipients.length) return 'No hay residentes con cuenta a quienes avisar'
    // Bulk: the emails come out of the monthly quota (only who wants them by email)
    const users = await db
      .from('users')
      .whereIn('id', recipients)
      .select('notification_preferences')
    const emails = users.filter(
      (user) => notificationPreferences(user.notification_preferences).parking.email
    ).length
    const room = await new EmailQuotaService(this.tenant).reserve(emails)
    if (!room) {
      return `No se enviaron los avisos: no quedan ${emails} correos en el cupo del mes`
    }
    const closes = lottery.closesAt
      .setZone(this.tenant.timezone)
      .setLocale('es-CO')
      .toFormat("d 'de' LLLL 'a las' h:mm a")
    await this.send(
      recipients,
      {
        title: `Abrió el sorteo de parqueaderos: ${lottery.title}`,
        paragraphs: [
          `Puedes postular tu unidad para un cupo comunal hasta el ${closes}.`,
          lottery.notes ?? '',
        ].filter(Boolean),
        rows: [this.periodRow(lottery)],
        action: 'Postularme',
      },
      'parking.lottery_opened'
    )
    lottery.notifiedCount = recipients.length
    await lottery.save()
    return null
  }

  private async notifyResults(lottery: ParkingLottery, applications: ParkingApplication[]) {
    const residents = await this.residentsOf([...new Set(applications.map((a) => a.unitId))])
    const positions = await this.queuePositions([lottery.id])
    const spots = await this.parking.spotsQuery().whereIn(
      'id',
      applications.map((a) => a.spotId).filter((id): id is string => !!id)
    )
    for (const application of applications) {
      const type = VEHICLE_TYPE_LABELS[application.vehicleType].toLowerCase()
      const spot = spots.find((row) => row.id === application.spotId)
      const content =
        application.status === 'won'
          ? {
              title: `Ganaste el parqueadero ${spot?.code} en el sorteo`,
              paragraphs: [`Tu unidad tiene un cupo comunal para ${type} durante el periodo.`],
              rows: [
                { label: 'Parqueadero', value: spot?.code ?? '' },
                ...(spot?.location ? [{ label: 'Ubicación', value: spot.location }] : []),
                this.periodRow(lottery),
              ],
            }
          : application.status === 'waiting'
            ? {
                title: 'Quedaste en la lista de espera de parqueaderos',
                paragraphs: [
                  `No alcanzó un cupo para ${type}. Si se libera uno te lo ofreceremos y tendrás ${this.settings.offerDays} días para aceptarlo.`,
                ],
                rows: [
                  {
                    label: 'Puesto en la lista',
                    value: String(positions.get(application.id) ?? ''),
                  },
                  this.periodRow(lottery),
                ],
              }
            : {
                title: 'Tu postulación al sorteo de parqueaderos no participó',
                paragraphs: [application.ineligibleReason ?? 'No cumplía los requisitos.'],
                rows: [this.periodRow(lottery)],
              }
      await this.send(residents.get(application.unitId) ?? [], content, 'parking.lottery_result')
    }
  }

  private async notifyOffer(
    application: ParkingApplication,
    spot: ParkingSpot,
    lottery: ParkingLottery
  ) {
    const residents = await this.residentsOf([application.unitId])
    const until = application
      .offerExpiresAt!.setZone(this.tenant.timezone)
      .setLocale('es-CO')
      .toFormat("d 'de' LLLL 'a las' h:mm a")
    await this.send(
      residents.get(application.unitId) ?? [],
      {
        title: `Se liberó un parqueadero para tu unidad: ${spot.code}`,
        paragraphs: [
          `Estabas en la lista de espera. Acepta o rechaza el cupo en el portal antes del ${until}; si no respondes, pasa al siguiente.`,
        ],
        rows: [
          { label: 'Parqueadero', value: spot.code },
          ...(spot.location ? [{ label: 'Ubicación', value: spot.location }] : []),
          this.periodRow(lottery),
        ],
        action: 'Responder la oferta',
      },
      'parking.offered'
    )
  }

  private async notifyExpired(application: ParkingApplication) {
    const residents = await this.residentsOf([application.unitId])
    await this.send(
      residents.get(application.unitId) ?? [],
      {
        title: 'Venció el parqueadero que te ofrecimos',
        paragraphs: [
          'No recibimos tu respuesta a tiempo, así que el cupo pasó al siguiente de la lista de espera.',
        ],
        rows: [],
      },
      'parking.offer_expired'
    )
  }

  private async notifyAssigned(application: ParkingApplication, lottery: ParkingLottery) {
    const residents = await this.residentsOf([application.unitId])
    await this.send(
      residents.get(application.unitId) ?? [],
      {
        title: `La administración le asignó el parqueadero ${application.spot?.code} a tu unidad`,
        paragraphs: ['Lo tienes hasta el final del periodo del sorteo.'],
        rows: [
          { label: 'Parqueadero', value: application.spot?.code ?? '' },
          this.periodRow(lottery),
        ],
      },
      'parking.assigned'
    )
  }

  /** A cancellation or rejection by the administration, to the unit */
  async notifyEnded(assignment: ParkingAssignment, reason: string, note: string) {
    const residents = await this.residentsOf([assignment.unitId])
    const ended = isoDate(assignment.endedOn)
    await this.send(
      residents.get(assignment.unitId) ?? [],
      {
        title: `${assignment.status === 'rejected' ? 'Se rechazó' : 'Se canceló'} el parqueadero ${assignment.spot.code} de tu unidad`,
        paragraphs: [note],
        rows: [
          { label: 'Motivo', value: reason },
          ...(assignment.status === 'cancelled' && ended
            ? [{ label: 'Último día de uso', value: this.formatDate(ended) }]
            : []),
        ],
      },
      'parking.ended'
    )
  }
}
