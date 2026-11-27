import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { PARKING_END_REASON_LABELS, normalizePlate } from '@aptoph/shared'
import type ParkingSpot from '#models/property/parking_spot'
import Vehicle from '#models/property/vehicle'
import { ParkingService } from '#services/property/parking'
import { ParkingLotteryService } from '#services/property/parking_lottery'
import { paginated } from '#transformers/finance/finance'
import {
  parkingUnitRef,
  serializeAssignment,
  serializeSpot,
} from '#transformers/property/parking_transformer'
import {
  assignValidator,
  createSpotValidator,
  eligibilityValidator,
  endAssignmentValidator,
  listAssignmentsValidator,
  listSpotsValidator,
  parkingLookupValidator,
  parkingSettingsValidator,
  spotBatchValidator,
  updateAssignmentValidator,
  updateSpotValidator,
} from '#validators/property/parking'

/**
 * Parking of the conjunto: spots, assignments of the communal ones and the
 * guard lookup. The administration manages it; the council and the guards
 * consult it (the guards without rates). docs/parking.md
 *
 *   GET  /parking/summary           GET  /parking/settings     PUT /parking/settings
 *   GET  /parking/spots             POST /parking/spots        POST /parking/spots/batch
 *   POST /parking/spots/import      PATCH /parking/spots/:id   DELETE /parking/spots/:id
 *   GET  /parking/assignments       POST /parking/assignments  PATCH /parking/assignments/:id
 *   POST /parking/assignments/:id/end
 *   GET  /parking/eligibility       GET  /parking/lookup?q=
 */
export default class ParkingController {
  private showRates({ tenantRoles }: HttpContext) {
    return tenantRoles.some((role) => role !== 'security_guard')
  }

  private async presentSpots(ctx: HttpContext, service: ParkingService, spots: ParkingSpot[]) {
    const holding = await service.holdingBySpot(spots.map((spot) => spot.id))
    const unitIds = spots
      .map((spot) => spot.ownerUnitId ?? holding.get(spot.id)?.unitId)
      .filter((id): id is string => !!id)
    const vehicles = await service.vehiclesByUnit([...new Set(unitIds)])
    const showRates = this.showRates(ctx)
    return (spot: ParkingSpot) => {
      const assignment = holding.get(spot.id) ?? null
      const unitId = spot.ownerUnitId ?? assignment?.unitId
      return serializeSpot(spot, {
        assignment,
        vehicles: (unitId && vehicles.get(unitId)) || [],
        showRates,
      })
    }
  }

  private async oneSpot(ctx: HttpContext, service: ParkingService, id: string) {
    const spot = await service
      .spotsQuery()
      .where('id', id)
      .preload('ownerUnit', (unit) => unit.preload('building'))
      .firstOrFail()
    return (await this.presentSpots(ctx, service, [spot]))(spot)
  }

  async settings({ tenant }: HttpContext) {
    return { data: new ParkingService(tenant).settings }
  }

  async updateSettings({ tenant, request }: HttpContext) {
    const data = await request.validateUsing(parkingSettingsValidator)
    return { data: await new ParkingService(tenant).saveSettings(data) }
  }

  async summary({ tenant }: HttpContext) {
    return { data: await new ParkingService(tenant).summary() }
  }

  async spots(ctx: HttpContext) {
    const { tenant, request } = ctx
    const filters = await request.validateUsing(listSpotsValidator, { data: request.qs() })
    const service = new ParkingService(tenant)
    await service.endExpired()
    const holding = `EXISTS (SELECT 1 FROM parking_assignments a WHERE a.tenant_id = parking_spots.tenant_id AND a.spot_id = parking_spots.id AND a.status IN ('offered', 'active'))`
    const query = service
      .spotsQuery()
      .preload('ownerUnit', (unit) => unit.preload('building'))
      .orderByRaw('length(code), code')
    if (filters.ownership) query.where('ownership', filters.ownership)
    if (filters.vehicleType) query.where('vehicle_type', filters.vehicleType)
    if (filters.state === 'inactive') query.where('is_active', false)
    if (filters.state === 'free') {
      query.where('ownership', 'communal').where('is_active', true).whereRaw(`NOT ${holding}`)
    }
    if (filters.state === 'assigned') query.whereRaw(holding)
    if (filters.search) {
      const term = filters.search
      const plate = normalizePlate(term)
      // Units matching the code, or with a vehicle matching the plate
      const units = db
        .from('units')
        .where('tenant_id', tenant.id)
        .whereNull('deleted_at')
        .where((q) => {
          q.whereILike('code', `%${term}%`)
          if (plate) {
            q.orWhereIn(
              'id',
              db
                .from('vehicles')
                .where('tenant_id', tenant.id)
                .whereNull('deleted_at')
                .whereILike('plate', `%${plate}%`)
                .select('unit_id')
            )
          }
        })
        .select('id')
      query.where((q) =>
        q
          .whereILike('code', `%${term}%`)
          .orWhereILike('location', `%${term}%`)
          .orWhereIn('owner_unit_id', units)
          .orWhereExists((sub) =>
            sub
              .from('parking_assignments as a')
              .whereColumn('a.spot_id', 'parking_spots.id')
              .whereIn('a.status', ['offered', 'active'])
              .whereIn('a.unit_id', units)
          )
      )
    }
    const page = await query.paginate(filters.page ?? 1, filters.perPage ?? 50)
    return paginated(page, await this.presentSpots(ctx, service, page.all()))
  }

  async storeSpot(ctx: HttpContext) {
    const data = await ctx.request.validateUsing(createSpotValidator)
    const service = new ParkingService(ctx.tenant)
    const spot = await service.createSpot(data)
    ctx.response.status(201)
    return { data: await this.oneSpot(ctx, service, spot.id) }
  }

  async storeBatch({ tenant, request, response }: HttpContext) {
    const data = await request.validateUsing(spotBatchValidator)
    const spots = await new ParkingService(tenant).createBatch(data)
    response.status(201)
    return { data: { created: spots.length } }
  }

  async importSpots({ tenant }: HttpContext) {
    return { data: await new ParkingService(tenant).importFromStructure() }
  }

  async updateSpot(ctx: HttpContext) {
    const data = await ctx.request.validateUsing(updateSpotValidator)
    const service = new ParkingService(ctx.tenant)
    const spot = await service.updateSpot(await service.findSpot(ctx.params.id), data)
    return { data: await this.oneSpot(ctx, service, spot.id) }
  }

  async destroySpot({ tenant, params, response }: HttpContext) {
    const service = new ParkingService(tenant)
    await service.removeSpot(await service.findSpot(params.id))
    return response.noContent()
  }

  async assignments(ctx: HttpContext) {
    const { tenant, request } = ctx
    const filters = await request.validateUsing(listAssignmentsValidator, { data: request.qs() })
    const service = new ParkingService(tenant)
    await service.endExpired()
    const query = service.assignmentsQuery().orderBy('parking_assignments.created_at', 'desc')
    if (filters.status) query.where('status', filters.status)
    if (filters.current) query.whereIn('status', ['scheduled', 'offered', 'active'])
    if (filters.unitId) query.where('unit_id', filters.unitId)
    if (filters.spotId) query.where('spot_id', filters.spotId)
    if (filters.search) {
      const term = filters.search
      query.where((q) =>
        q
          .whereIn('spot_id', service.spotsQuery().whereILike('code', `%${term}%`).select('id'))
          .orWhereIn(
            'unit_id',
            tenant.related('units').query().whereILike('code', `%${term}%`).select('id')
          )
      )
    }
    const page = await query.paginate(filters.page ?? 1, filters.perPage ?? 25)
    const showRates = this.showRates(ctx)
    return paginated(page, (assignment) => serializeAssignment(assignment, showRates))
  }

  async eligibility({ tenant, request }: HttpContext) {
    const data = await request.validateUsing(eligibilityValidator, { data: request.qs() })
    return { data: await new ParkingService(tenant).eligibility(data.unitId, data.vehicleType) }
  }

  async assign({ tenant, request, response, auth }: HttpContext) {
    const data = await request.validateUsing(assignValidator)
    const service = new ParkingService(tenant)
    const { assignment, warnings } = await service.assign(data, auth.getUserOrFail().id)
    response.status(201)
    return {
      data: serializeAssignment(await service.findAssignment(assignment.id), true),
      warnings,
    }
  }

  async updateAssignment({ tenant, params, request }: HttpContext) {
    const data = await request.validateUsing(updateAssignmentValidator)
    const service = new ParkingService(tenant)
    await service.updateAssignment(await service.findAssignment(params.id), data)
    return { data: serializeAssignment(await service.findAssignment(params.id), true) }
  }

  async endAssignment({ tenant, params, request, auth }: HttpContext) {
    const data = await request.validateUsing(endAssignmentValidator)
    const service = new ParkingService(tenant)
    const result = await service.end(
      await service.findAssignment(params.id),
      data,
      auth.getUserOrFail().id
    )
    const ended = await service.findAssignment(params.id)
    // "Cambios de asignación": tell the unit, and offer the spot to the waiting list
    const lotteries = new ParkingLotteryService(tenant)
    await lotteries.notifyEnded(ended, PARKING_END_REASON_LABELS[data.reason], data.note)
    const offered = await lotteries.offerNext(ended.spotId)
    return {
      data: serializeAssignment(ended, true),
      offeredTo: offered ? { applicationId: offered.id, unitId: offered.unitId } : null,
      credited: result.credited,
      paidPeriods: result.paidPeriods,
    }
  }

  /** Portería: a plate or a spot code */
  async lookup(ctx: HttpContext) {
    const { tenant, request } = ctx
    const { q } = await request.validateUsing(parkingLookupValidator, { data: request.qs() })
    const service = new ParkingService(tenant)
    await service.endExpired()
    const plate = normalizePlate(q)
    const vehicle = plate
      ? await Vehicle.query()
          .where('tenant_id', tenant.id)
          .whereNull('deleted_at')
          .where('plate', plate)
          .preload('unit', (unit) => unit.preload('building'))
          .first()
      : null
    const query = service
      .spotsQuery()
      .preload('ownerUnit', (unit) => unit.preload('building'))
      .orderByRaw('length(code), code')
      .limit(10)
    if (vehicle) {
      query.where((q2) =>
        q2
          .where('owner_unit_id', vehicle.unitId)
          .orWhereExists((sub) =>
            sub
              .from('parking_assignments as a')
              .whereColumn('a.spot_id', 'parking_spots.id')
              .whereIn('a.status', ['offered', 'active'])
              .where('a.unit_id', vehicle.unitId)
          )
      )
    } else {
      query.whereRaw('lower(code) = lower(?)', [q.trim()])
    }
    const spots = await query
    const present = await this.presentSpots(ctx, service, spots)
    return {
      data: {
        spots: spots.map(present),
        vehicle: vehicle
          ? {
              id: vehicle.id,
              plate: vehicle.plate,
              type: vehicle.type,
              brand: vehicle.brand,
              color: vehicle.color,
              unit: parkingUnitRef(vehicle.unit),
              ownerName: vehicle.ownerType === 'third_party' ? vehicle.ownerName : null,
            }
          : null,
      },
    }
  }
}
