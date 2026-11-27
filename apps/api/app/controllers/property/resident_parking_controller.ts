import type { HttpContext } from '@adonisjs/core/http'
import { VEHICLE_TYPES, type ResidentParkingOverview } from '@aptoph/shared'
import Unit from '#models/property/unit'
import Vehicle from '#models/property/vehicle'
import ResourceException from '#exceptions/resource_exception'
import ParkingLotteriesController from '#controllers/property/parking_lotteries_controller'
import { ParkingLotteryService } from '#services/property/parking_lottery'
import { findOwnUnit, residentUnitIds } from '#services/resident_scope'
import { parkingUnitRef, parkingVehicleRef } from '#transformers/property/parking_transformer'
import { applyValidator } from '#validators/property/parking'

/**
 * The parking lottery in the resident portal: apply, see the result and the
 * place in the waiting list, and accept or decline an offered spot.
 * docs/parking.md §Sorteo
 *
 *   GET  /resident/parking
 *   POST /resident/parking/applications
 *   POST /resident/parking/applications/:id/withdraw
 *   POST /resident/parking/applications/:id/accept
 *   POST /resident/parking/applications/:id/decline
 */
export default class ResidentParkingController {
  async show({ tenant, auth }: HttpContext) {
    const service = new ParkingLotteryService(tenant)
    await service.sync()
    const unitIds = await residentUnitIds(tenant, auth.getUserOrFail().id)
    const lottery = (await service.openLottery()) ?? (await service.currentLottery())
    const spots = await service.spotCounts()
    const types = VEHICLE_TYPES.filter((type) => spots.some((row) => row.type === type))

    const applications =
      lottery && unitIds.length
        ? await service
            .applicationsQuery()
            .where('lottery_id', lottery.id)
            .whereIn('unit_id', unitIds)
            .orderBy('created_at')
        : []

    const units = unitIds.length
      ? await Unit.query()
          .where('tenant_id', tenant.id)
          .whereIn('id', unitIds)
          .whereIn('type', ['apartment', 'house', 'commercial'])
          .whereNull('deleted_at')
          .preload('building')
          .orderBy('code')
      : []
    const vehicles = units.length
      ? await Vehicle.query()
          .where('tenant_id', tenant.id)
          .whereIn(
            'unit_id',
            units.map((unit) => unit.id)
          )
          .whereNull('deleted_at')
          .orderBy('plate')
      : []
    const accepting = lottery && service.settings.mode !== 'private'
    const unitRows = []
    for (const unit of units) {
      const eligibility = []
      if (accepting) {
        for (const type of types) {
          const errors = await service.applyErrors(lottery, unit.id, type, null)
          eligibility.push({ vehicleType: type, errors, warnings: [] })
        }
      }
      unitRows.push({
        unit: parkingUnitRef(unit),
        eligibility,
        vehicles: vehicles.filter((v) => v.unitId === unit.id).map(parkingVehicleRef),
      })
    }

    const [presented] = lottery
      ? await ParkingLotteriesController.present(service, [lottery])
      : [null]
    const overview: ResidentParkingOverview = {
      lottery: presented
        ? {
            id: presented.id,
            number: presented.number,
            title: presented.title,
            status: presented.status,
            closesAt: presented.closesAt,
            periodStartsOn: presented.periodStartsOn,
            periodEndsOn: presented.periodEndsOn,
            notes: presented.notes,
            seed: presented.seed,
            drawnAt: presented.drawnAt,
            createdAt: presented.createdAt,
            spots: presented.spots,
          }
        : null,
      applications: await ParkingLotteriesController.presentApplications(service, applications),
      units: unitRows,
      requirements: service.settings.requirements,
      offerDays: service.settings.offerDays,
    }
    return { data: overview }
  }

  async apply({ tenant, request, auth }: HttpContext) {
    const input = await request.validateUsing(applyValidator)
    const userId = auth.getUserOrFail().id
    await findOwnUnit(tenant, userId, input.unitId)
    const service = new ParkingLotteryService(tenant)
    await service.sync()
    const application = await service.apply(input, userId)
    const [data] = await ParkingLotteriesController.presentApplications(service, [
      await service.findApplication(application.id),
    ])
    return { data }
  }

  /** The resident's application, or 404 */
  private async own(ctx: HttpContext, service: ParkingLotteryService) {
    const unitIds = await residentUnitIds(ctx.tenant, ctx.auth.getUserOrFail().id)
    const application = await service.findApplication(ctx.params.id)
    if (!unitIds.includes(application.unitId)) {
      throw ResourceException.notFound('La postulación no existe')
    }
    return application
  }

  private async respond(
    ctx: HttpContext,
    action: (
      service: ParkingLotteryService,
      application: Awaited<ReturnType<ParkingLotteryService['findApplication']>>
    ) => Promise<unknown>
  ) {
    const service = new ParkingLotteryService(ctx.tenant)
    await service.sync()
    const application = await this.own(ctx, service)
    await action(service, application)
    const [data] = await ParkingLotteriesController.presentApplications(service, [
      await service.findApplication(application.id),
    ])
    return { data }
  }

  async withdraw(ctx: HttpContext) {
    return this.respond(ctx, (service, application) => service.withdraw(application))
  }

  async accept(ctx: HttpContext) {
    return this.respond(ctx, (service, application) => service.accept(application))
  }

  async decline(ctx: HttpContext) {
    return this.respond(ctx, (service, application) => {
      if (application.status !== 'offered') {
        throw ResourceException.conflict('No hay un cupo ofrecido para esta postulación')
      }
      return service.closeOffer(application, 'declined')
    })
  }
}
