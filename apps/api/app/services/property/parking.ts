import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import {
  DOCUMENTED_VEHICLE_TYPES,
  VEHICLE_TYPES,
  VEHICLE_TYPE_LABELS,
  parkingSettings,
  proratedCents,
  toCents,
  type ParkingAssignInput,
  type ParkingEligibility,
  type ParkingEndInput,
  type ParkingSettings,
  type ParkingSpotBatchInput,
  type ParkingSpotInput,
  type ParkingSpotsSummary,
  type VehicleType,
} from '@aptoph/shared'
import Charge from '#models/finance/charge'
import ParkingAssignment from '#models/property/parking_assignment'
import ParkingSpot from '#models/property/parking_spot'
import Unit from '#models/property/unit'
import Vehicle from '#models/property/vehicle'
import type Tenant from '#models/tenants/tenant'
import FieldException from '#exceptions/field_exception'
import ResourceException from '#exceptions/resource_exception'
import { ChargeService } from '#services/finance/charges'
import { withFinance } from '#services/finance/scope'
import { balancesFor, tenantToday } from '#services/resident_scope'

type Trx = TransactionClientContract

/** Units that can hold a spot (not the parking or storage units themselves) */
const HOLDER_UNIT_TYPES = ['apartment', 'house', 'commercial']
/** Statuses that hold the spot */
const HOLDING = ['offered', 'active'] as const
/** Statuses the administration can still cancel or reject (`scheduled`: won in a lottery) */
const ENDABLE = ['scheduled', ...HOLDING] as const
const endable = (status: string) => (ENDABLE as readonly string[]).includes(status)

const isoDate = (value: DateTime | null | undefined) => value?.toISODate() ?? null

/** Whether the SOAT and the inspection of a vehicle are valid on `today` */
export function documentsOk(vehicle: Vehicle, today: string) {
  if (!DOCUMENTED_VEHICLE_TYPES.includes(vehicle.type)) return true
  const soat = isoDate(vehicle.soatExpiresOn)
  const inspection = isoDate(vehicle.inspectionExpiresOn)
  return !!soat && soat >= today && (!inspection || inspection >= today)
}

/**
 * Parking of the conjunto: spots, assignments of the communal ones and their
 * monthly charge (billed with the fee, see BillingService). docs/parking.md
 */
export class ParkingService {
  readonly settings: ParkingSettings

  constructor(private tenant: Tenant) {
    this.settings = parkingSettings((tenant.settings ?? {}).parking)
  }

  get today() {
    return tenantToday(this.tenant)
  }

  async saveSettings(input: ParkingSettings) {
    this.tenant.settings = { ...(this.tenant.settings ?? {}), parking: input }
    await this.tenant.save()
    return parkingSettings(input)
  }

  // Spots

  spotsQuery(client?: Trx) {
    return ParkingSpot.query({ client })
      .where('parking_spots.tenant_id', this.tenant.id)
      .whereNull('parking_spots.deleted_at')
  }

  async findSpot(id: string, client?: Trx) {
    const spot = await this.spotsQuery(client).where('id', id).first()
    if (!spot) throw ResourceException.notFound('El parqueadero no existe')
    return spot
  }

  private async holderUnit(unitId: string, field: string, client?: Trx) {
    if (!unitId) throw new FieldException(field, 'Elige la unidad')
    const unit = await Unit.query({ client })
      .where('tenant_id', this.tenant.id)
      .where('id', unitId)
      .whereNull('deleted_at')
      .whereIn('type', HOLDER_UNIT_TYPES)
      .first()
    if (!unit) throw new FieldException(field, 'Elige un apartamento, casa o local')
    return unit
  }

  private async assertCodeIsFree(code: string, exceptId?: string, client?: Trx) {
    const taken = await this.spotsQuery(client)
      .whereRaw('lower(code) = lower(?)', [code])
      .if(exceptId, (q) => q.whereNot('id', exceptId!))
      .first()
    if (taken) throw new FieldException('code', `Ya existe el parqueadero ${code}`)
  }

  async createSpot(input: ParkingSpotInput) {
    const code = input.code.trim()
    await this.assertCodeIsFree(code)
    const owner =
      input.ownership === 'private'
        ? await this.holderUnit(input.ownerUnitId ?? '', 'ownerUnitId')
        : null
    const ownerUnitId = owner?.id ?? null
    return ParkingSpot.create({
      tenantId: this.tenant.id,
      code,
      vehicleType: input.vehicleType,
      ownership: input.ownership,
      isCovered: input.isCovered ?? false,
      location: input.location?.trim() || null,
      notes: input.notes?.trim() || null,
      isActive: input.isActive ?? true,
      ownerUnitId,
    })
  }

  /** Communal spots in a row: P-001 … P-080 */
  async createBatch(input: ParkingSpotBatchInput) {
    if (input.ownership !== 'communal') {
      throw new FieldException('ownership', 'En lote solo se crean parqueaderos comunales')
    }
    if (input.to < input.from) throw new FieldException('to', 'Debe ser mayor o igual a «desde»')
    if (input.to - input.from >= 500) throw new FieldException('to', 'Máximo 500 por lote')
    const digits = input.digits ?? String(input.to).length
    const codes = Array.from(
      { length: input.to - input.from + 1 },
      (_, i) => `${input.prefix.trim()}${String(input.from + i).padStart(digits, '0')}`
    )
    return db.transaction(async (trx) => {
      const taken = await this.spotsQuery(trx)
        .whereRaw('lower(code) = any(?)', [codes.map((code) => code.toLowerCase())])
        .select('code')
      if (taken.length) {
        throw new FieldException(
          'prefix',
          `Ya existen: ${taken
            .slice(0, 5)
            .map((spot) => spot.code)
            .join(', ')}${taken.length > 5 ? '…' : ''}`
        )
      }
      return ParkingSpot.createMany(
        codes.map((code) => ({
          tenantId: this.tenant.id,
          code,
          vehicleType: input.vehicleType,
          ownership: 'communal' as const,
          isCovered: input.isCovered ?? false,
          location: input.location?.trim() || null,
          notes: input.notes?.trim() || null,
          isActive: true,
        })),
        { client: trx }
      )
    })
  }

  /**
   * Private spots from the parking units of the structure (annexed to an
   * apartment). Already imported ones are skipped.
   */
  async importFromStructure() {
    const units = await Unit.query()
      .where('tenant_id', this.tenant.id)
      .whereNull('deleted_at')
      .where('type', 'parking')
      .whereNotNull('parent_unit_id')
      .whereNotExists((sub) =>
        sub
          .from('parking_spots')
          .whereColumn('parking_spots.property_unit_id', 'units.id')
          .whereNull('parking_spots.deleted_at')
      )
      .preload('parentUnit')
    const current = await this.spotsQuery().select('code')
    const existing = new Set(current.map((spot) => spot.code.toLowerCase()))
    const rows = units
      .filter((unit) => unit.parentUnit && !unit.parentUnit.deletedAt)
      .map((unit) => {
        let code = unit.code
        if (existing.has(code.toLowerCase())) code = `${unit.code}-${unit.parentUnit.code}`
        existing.add(code.toLowerCase())
        return {
          tenantId: this.tenant.id,
          code,
          vehicleType: 'car' as const,
          ownership: 'private' as const,
          isCovered: false,
          isActive: true,
          ownerUnitId: unit.parentUnitId,
          propertyUnitId: unit.id,
        }
      })
    if (rows.length) await ParkingSpot.createMany(rows)
    return { created: rows.length }
  }

  async updateSpot(spot: ParkingSpot, input: Partial<ParkingSpotInput>) {
    const holding = await this.holding(spot.id)
    if (input.code !== undefined && input.code.trim() !== spot.code) {
      await this.assertCodeIsFree(input.code.trim(), spot.id)
      spot.code = input.code.trim()
    }
    const ownership = input.ownership ?? spot.ownership
    const vehicleType = input.vehicleType ?? spot.vehicleType
    if (holding && (ownership !== 'communal' || vehicleType !== spot.vehicleType)) {
      throw ResourceException.conflict(
        `El parqueadero está asignado a ${holding.unit.code}: termina la asignación antes de cambiar su tipo`
      )
    }
    if (holding && input.isActive === false) {
      throw ResourceException.conflict(
        `El parqueadero está asignado a ${holding.unit.code}: termina la asignación antes de inactivarlo`
      )
    }
    spot.ownership = ownership
    spot.vehicleType = vehicleType
    if (ownership === 'private') {
      const ownerId = input.ownerUnitId ?? spot.ownerUnitId
      const owner = await this.holderUnit(ownerId ?? '', 'ownerUnitId')
      spot.ownerUnitId = owner.id
    } else {
      spot.ownerUnitId = null
    }
    if (input.isCovered !== undefined) spot.isCovered = input.isCovered
    if (input.location !== undefined) spot.location = input.location?.trim() || null
    if (input.notes !== undefined) spot.notes = input.notes?.trim() || null
    if (input.isActive !== undefined) spot.isActive = input.isActive
    await spot.save()
    return spot
  }

  async removeSpot(spot: ParkingSpot) {
    const holding = await this.holding(spot.id)
    if (holding) {
      throw ResourceException.conflict(
        `El parqueadero está asignado a ${holding.unit.code}: termina la asignación antes de eliminarlo`
      )
    }
    spot.deletedAt = DateTime.now()
    await spot.save()
  }

  // Assignments

  /** The assignment holding `spotId` now */
  holding(spotId: string, client?: Trx) {
    return ParkingAssignment.query({ client })
      .where('tenant_id', this.tenant.id)
      .where('spot_id', spotId)
      .whereIn('status', [...HOLDING])
      .preload('unit')
      .first()
  }

  assignmentsQuery(client?: Trx) {
    return ParkingAssignment.query({ client })
      .where('parking_assignments.tenant_id', this.tenant.id)
      .preload('spot')
      .preload('unit', (unit) => unit.preload('building'))
      .preload('vehicle')
      .preload('createdBy')
      .preload('endedBy')
  }

  async findAssignment(id: string, client?: Trx) {
    const assignment = await this.assignmentsQuery(client).where('id', id).first()
    if (!assignment) throw ResourceException.notFound('La asignación no existe')
    return assignment
  }

  /** Assignments past their period end: ended. Run before reading them */
  async endExpired() {
    await db
      .from('parking_assignments')
      .where('tenant_id', this.tenant.id)
      .where('status', 'active')
      .whereNotNull('ends_on')
      .where('ends_on', '<', this.today)
      .update({
        status: 'ended',
        ended_on: db.raw('ends_on'),
        ended_at: new Date(),
        updated_at: new Date(),
      })
    // Won in a lottery: starts with its period, once the spot is free
    await db
      .from('parking_assignments as a')
      .where('a.tenant_id', this.tenant.id)
      .where('a.status', 'scheduled')
      .where('a.starts_on', '<=', this.today)
      .whereNotExists((sub) =>
        sub
          .from('parking_assignments as b')
          .whereColumn('b.tenant_id', 'a.tenant_id')
          .whereColumn('b.spot_id', 'a.spot_id')
          .whereIn('b.status', ['offered', 'active'])
      )
      .update({ status: 'active', updated_at: new Date() })
  }

  /** Spots a unit has now: the private ones it owns and the communal ones it holds */
  async spotsOf(unitIds: string[], client?: Trx) {
    const counts = new Map<string, { private: number; communal: number }>()
    for (const id of unitIds) counts.set(id, { private: 0, communal: 0 })
    if (!unitIds.length) return counts
    const owned = await this.spotsQuery(client)
      .where('ownership', 'private')
      .where('is_active', true)
      .whereIn('owner_unit_id', unitIds)
      .select('owner_unit_id')
    for (const spot of owned) counts.get(spot.ownerUnitId!)!.private++
    const held = await ParkingAssignment.query({ client })
      .where('tenant_id', this.tenant.id)
      .whereIn('status', [...HOLDING])
      .whereIn('unit_id', unitIds)
      .select('unit_id')
    for (const row of held) counts.get(row.unitId)!.communal++
    return counts
  }

  /**
   * What blocks assigning a spot of `vehicleType` to the unit (the maximum of
   * spots) and which requirements it does not meet (debt, vehicle,
   * documents): the administration can still assign with those.
   */
  async eligibility(
    unitId: string,
    vehicleType: VehicleType,
    client?: Trx
  ): Promise<ParkingEligibility> {
    const unit = await this.holderUnit(unitId, 'unitId', client)
    await unit.load('building')
    const today = this.today
    const counts = await this.spotsOf([unit.id], client)
    const { private: privateSpots, communal } = counts.get(unit.id)!
    const spots = privateSpots + communal
    const vehicles = await Vehicle.query({ client })
      .where('tenant_id', this.tenant.id)
      .where('unit_id', unit.id)
      .whereNull('deleted_at')
      .orderBy('plate')
    const toleranceDay = DateTime.fromISO(today)
      .minus({ days: this.settings.requirements.debtToleranceDays })
      .toISODate()!
    const balances = await balancesFor(this.tenant, [unit.id], toleranceDay)
    const overdue = balances.get(unit.id)!.overdue

    const errors: string[] = []
    const warnings: string[] = []
    const max = this.settings.maxSpotsPerUnit
    if (spots >= max) {
      errors.push(
        `La unidad ya tiene ${spots} ${spots === 1 ? 'parqueadero' : 'parqueaderos'} y el máximo es ${max}`
      )
    }
    const req = this.settings.requirements
    if (req.noDebt && toCents(overdue) > 0) {
      warnings.push(
        `Tiene saldo vencido por $${Math.round(Number(overdue)).toLocaleString('es-CO')}`
      )
    }
    const ofType = vehicles.filter((vehicle) => vehicle.type === vehicleType)
    if (req.vehicle && ofType.length === 0) {
      warnings.push(`No tiene ${VEHICLE_TYPE_LABELS[vehicleType].toLowerCase()} registrado`)
    }
    if (req.documents && ofType.length && !ofType.some((v) => documentsOk(v, today))) {
      warnings.push('Ningún vehículo del tipo tiene el SOAT y la tecnomecánica vigentes')
    }

    return {
      unit: {
        id: unit.id,
        code: unit.code,
        building: unit.building ? { id: unit.building.id, name: unit.building.name } : null,
      },
      spots,
      maxSpots: max,
      privateSpots,
      overdue,
      vehicles: vehicles.map((vehicle) => ({
        id: vehicle.id,
        plate: vehicle.plate,
        type: vehicle.type,
        brand: vehicle.brand,
        color: vehicle.color,
        soatExpiresOn: isoDate(vehicle.soatExpiresOn),
        inspectionExpiresOn: isoDate(vehicle.inspectionExpiresOn),
        documentsOk: documentsOk(vehicle, today),
      })),
      errors,
      warnings,
    }
  }

  /** Default end of an assignment starting on `startsOn`: the lottery period */
  periodEnd(startsOn: string) {
    return DateTime.fromISO(startsOn)
      .plus({ months: this.settings.lotteryMonths })
      .minus({ days: 1 })
      .toISODate()!
  }

  private async vehicleOf(unitId: string, vehicleId: string, type: VehicleType, client?: Trx) {
    const vehicle = await Vehicle.query({ client })
      .where('tenant_id', this.tenant.id)
      .where('id', vehicleId)
      .where('unit_id', unitId)
      .whereNull('deleted_at')
      .first()
    if (!vehicle) throw new FieldException('vehicleId', 'El vehículo no es de la unidad')
    if (vehicle.type !== type) {
      throw new FieldException(
        'vehicleId',
        `El parqueadero es para ${VEHICLE_TYPE_LABELS[type].toLowerCase()}`
      )
    }
    return vehicle
  }

  async assign(input: ParkingAssignInput, userId: string) {
    return db.transaction(async (trx) => {
      const spot = await this.spotsQuery(trx).where('id', input.spotId).forUpdate().first()
      if (!spot) throw new FieldException('spotId', 'El parqueadero no existe')
      if (spot.ownership !== 'communal') {
        throw new FieldException('spotId', 'Solo se asignan los parqueaderos comunales')
      }
      if (!spot.isActive) throw new FieldException('spotId', 'El parqueadero está inactivo')
      const holding = await this.holding(spot.id, trx)
      if (holding) {
        throw new FieldException('spotId', `El parqueadero ya está asignado a ${holding.unit.code}`)
      }
      // Serializes assignments of the unit: the maximum of spots
      await trx.rawQuery('SELECT pg_advisory_xact_lock(hashtext(?))', [
        `parking-unit:${input.unitId}`,
      ])
      const eligibility = await this.eligibility(input.unitId, spot.vehicleType, trx)
      if (eligibility.errors.length) throw new FieldException('unitId', eligibility.errors[0]!)
      const vehicle = input.vehicleId
        ? await this.vehicleOf(input.unitId, input.vehicleId, spot.vehicleType, trx)
        : null

      const endsOn = input.endsOn === undefined ? this.periodEnd(input.startsOn) : input.endsOn
      if (endsOn && endsOn < input.startsOn) {
        throw new FieldException('endsOn', 'Debe ser posterior al inicio')
      }
      // Won by someone for the next period: it can only be lent until then
      const next = await ParkingAssignment.query({ client: trx })
        .where('tenant_id', this.tenant.id)
        .where('spot_id', spot.id)
        .where('status', 'scheduled')
        .first()
      if (next && (!endsOn || endsOn >= next.startsOn.toISODate()!)) {
        throw new FieldException(
          'endsOn',
          `El parqueadero ya se sorteó desde el ${next.startsOn.toISODate()}: termina antes`
        )
      }
      const assignment = await ParkingAssignment.create(
        {
          tenantId: this.tenant.id,
          spotId: spot.id,
          unitId: eligibility.unit.id,
          vehicleId: vehicle?.id ?? null,
          status: 'active',
          startsOn: DateTime.fromISO(input.startsOn),
          endsOn: endsOn ? DateTime.fromISO(endsOn) : null,
          monthlyRate: this.settings.rates[spot.vehicleType].communal.toFixed(2),
          notes: input.notes?.trim() || null,
          createdById: userId,
        },
        { client: trx }
      )
      return { assignment, warnings: eligibility.warnings }
    })
  }

  /** Changes the vehicle, the end of the period or the notes of a holding assignment */
  async updateAssignment(
    assignment: ParkingAssignment,
    input: { vehicleId?: string | null; endsOn?: string | null; notes?: string | null }
  ) {
    if (!HOLDING.includes(assignment.status as (typeof HOLDING)[number])) {
      throw ResourceException.conflict('La asignación ya terminó')
    }
    if (input.vehicleId !== undefined) {
      const vehicle = input.vehicleId
        ? await this.vehicleOf(assignment.unitId, input.vehicleId, assignment.spot.vehicleType)
        : null
      assignment.vehicleId = vehicle?.id ?? null
    }
    if (input.endsOn !== undefined) {
      if (input.endsOn && input.endsOn < assignment.startsOn.toISODate()!) {
        throw new FieldException('endsOn', 'Debe ser posterior al inicio')
      }
      if (input.endsOn && input.endsOn < this.today) {
        throw new FieldException('endsOn', 'Para terminarla antes, cancélala con un motivo')
      }
      assignment.endsOn = input.endsOn ? DateTime.fromISO(input.endsOn) : null
    }
    if (input.notes !== undefined) assignment.notes = input.notes?.trim() || null
    await assignment.save()
    return assignment
  }

  /**
   * Cancels (takes it away during the period) or rejects (it is never used)
   * an assignment. Charges already billed for days it no longer covers get a
   * credit note; what was already paid is reported to adjust in Cartera.
   */
  async end(assignment: ParkingAssignment, input: ParkingEndInput, userId: string) {
    if (!endable(assignment.status)) {
      throw ResourceException.conflict('La asignación ya terminó')
    }
    // Not started yet: it was never used
    if (assignment.status === 'scheduled') input = { ...input, status: 'rejected' }
    const startsOn = assignment.startsOn.toISODate()!
    let endedOn: string
    if (input.status === 'rejected') {
      endedOn = DateTime.fromISO(startsOn).minus({ days: 1 }).toISODate()!
    } else {
      endedOn = input.endedOn ?? this.today
      if (endedOn < startsOn) {
        throw new FieldException(
          'endedOn',
          'Es anterior al inicio: si nunca se usó, recházala en vez de cancelarla'
        )
      }
      const endsOn = isoDate(assignment.endsOn)
      if (endsOn && endedOn > endsOn) {
        throw new FieldException('endedOn', 'Es posterior al fin del periodo')
      }
    }

    return withFinance(this.tenant, userId, async (scope) => {
      const locked = await ParkingAssignment.query({ client: scope.trx })
        .where('tenant_id', this.tenant.id)
        .where('id', assignment.id)
        .forUpdate()
        .firstOrFail()
      if (!endable(locked.status)) {
        throw ResourceException.conflict('La asignación ya terminó')
      }
      locked.merge({
        status: input.status,
        endedOn: DateTime.fromISO(endedOn),
        endReason: input.reason,
        endNote: input.note.trim(),
        endedById: userId,
        endedAt: DateTime.now(),
      })
      await locked.useTransaction(scope.trx).save()

      // Billed months: lower them to the days it was really held
      const charges = await Charge.query({ client: scope.trx })
        .where('tenant_id', this.tenant.id)
        .where('source_type', 'parking')
        .where('source_id', locked.id)
        .whereNot('status', 'cancelled')
      const service = new ChargeService(scope)
      const rate = toCents(locked.monthlyRate)
      const notes: string[] = []
      let credited = 0
      for (const charge of charges) {
        const period = charge.period.toISODate()!
        const due = proratedCents(rate, period, startsOn, endedOn)
        const excess = toCents(charge.amount) - due
        if (excess <= 0) continue
        const balance = toCents(charge.balance)
        const reason = `Parqueadero ${assignment.spot.code} ${input.status === 'rejected' ? 'rechazado' : 'cancelado'}`
        if (due === 0 && balance === toCents(charge.amount)) {
          await service.cancel(charge, reason)
          credited += excess
        } else if (balance > 0) {
          const amount = Math.min(excess, balance)
          await service.creditNote(charge, amount, reason)
          credited += amount
          if (amount < excess) notes.push(period)
        } else {
          notes.push(period)
        }
      }
      return {
        status: input.status,
        credited,
        /** Periods already paid: the unit has a credit to adjust in Cartera */
        paidPeriods: notes,
      }
    })
  }

  // Reading

  async summary(): Promise<ParkingSpotsSummary> {
    await this.endExpired()
    const spots = await this.spotsQuery().select('id', 'vehicle_type', 'ownership', 'is_active')
    const holdingRows = await db
      .from('parking_assignments')
      .where('tenant_id', this.tenant.id)
      .whereIn('status', [...HOLDING])
      .select('spot_id')
    const held = new Set(holdingRows.map((row) => row.spot_id as string))
    const holders = await db
      .from('parking_assignments')
      .where('tenant_id', this.tenant.id)
      .whereIn('status', [...HOLDING])
      .distinct('unit_id')
    const balances = await balancesFor(
      this.tenant,
      holders.map((row) => row.unit_id as string),
      this.today
    )
    const withDebt = [...balances.values()].filter((b) => toCents(b.overdue) > 0).length

    return {
      mode: this.settings.mode,
      byType: VEHICLE_TYPES.map((type) => {
        const ofType = spots.filter((spot) => spot.vehicleType === type && spot.isActive)
        const communal = ofType.filter((spot) => spot.ownership === 'communal')
        const assigned = communal.filter((spot) => held.has(spot.id)).length
        return {
          type,
          private: ofType.length - communal.length,
          communal: communal.length,
          assigned,
          free: communal.length - assigned,
        }
      }),
      inactive: spots.filter((spot) => !spot.isActive).length,
      withDebt,
    }
  }

  /** Vehicles of the units, by unit (to show who uses a spot) */
  async vehiclesByUnit(unitIds: string[]) {
    const map = new Map<string, Vehicle[]>()
    if (!unitIds.length) return map
    const vehicles = await Vehicle.query()
      .where('tenant_id', this.tenant.id)
      .whereIn('unit_id', unitIds)
      .whereNull('deleted_at')
      .orderBy('plate')
    for (const vehicle of vehicles) {
      map.set(vehicle.unitId, [...(map.get(vehicle.unitId) ?? []), vehicle])
    }
    return map
  }

  /** Holding assignments of the spots, by spot */
  async holdingBySpot(spotIds: string[]) {
    const map = new Map<string, ParkingAssignment>()
    if (!spotIds.length) return map
    const rows = await this.assignmentsQuery()
      .whereIn('spot_id', spotIds)
      .whereIn('status', [...HOLDING])
    for (const row of rows) map.set(row.spotId, row)
    return map
  }
}
