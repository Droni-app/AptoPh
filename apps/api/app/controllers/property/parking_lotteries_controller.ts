import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { normalizePlate } from '@aptoph/shared'
import ParkingAssignment from '#models/property/parking_assignment'
import type ParkingApplication from '#models/property/parking_application'
import type ParkingLottery from '#models/property/parking_lottery'
import ResourceException from '#exceptions/resource_exception'
import { ParkingLotteryService } from '#services/property/parking_lottery'
import { serializeApplication, serializeLottery } from '#transformers/property/parking_transformer'
import {
  applyValidator,
  assignApplicationValidator,
  createLotteryValidator,
  listApplicationsValidator,
  updateLotteryValidator,
} from '#validators/property/parking'

/**
 * Lottery of the communal spots, from the back-office: the administration
 * opens it, draws it and manages the waiting list; the council consults it.
 * docs/parking.md §Sorteo
 *
 *   GET  /parking/lotteries                 POST /parking/lotteries
 *   GET  /parking/lotteries/:id             PATCH /parking/lotteries/:id
 *   GET  /parking/lotteries/:id/applications
 *   POST /parking/lotteries/:id/applications (on behalf of a unit)
 *   POST /parking/lotteries/:id/draw        POST /parking/lotteries/:id/cancel
 *   POST /parking/lotteries/:id/offer       (offers the free spots to the waiting list)
 *   POST /parking/applications/:id/withdraw POST /parking/applications/:id/assign
 */
export default class ParkingLotteriesController {
  static async present(service: ParkingLotteryService, lotteries: ParkingLottery[]) {
    const counts = await service.counts(lotteries.map((lottery) => lottery.id))
    const spots = await service.spotCounts()
    return lotteries.map((lottery) =>
      serializeLottery(lottery, { counts: counts.get(lottery.id), spots })
    )
  }

  static async presentApplications(
    service: ParkingLotteryService,
    applications: ParkingApplication[]
  ) {
    const positions = await service.queuePositions([
      ...new Set(applications.map((a) => a.lotteryId)),
    ])
    const assignments = applications.length
      ? await ParkingAssignment.query()
          .whereIn(
            'application_id',
            applications.map((a) => a.id)
          )
          .whereIn('status', ['scheduled', 'offered', 'active'])
          .select('id', 'application_id')
      : []
    return applications.map((application) =>
      serializeApplication(application, {
        queuePosition: positions.get(application.id) ?? null,
        assignmentId: assignments.find((a) => a.applicationId === application.id)?.id ?? null,
      })
    )
  }

  async index({ tenant }: HttpContext) {
    const service = new ParkingLotteryService(tenant)
    await service.sync()
    const lotteries = await service.lotteriesQuery().orderBy('number', 'desc').limit(50)
    return { data: await ParkingLotteriesController.present(service, lotteries) }
  }

  async show({ tenant, params }: HttpContext) {
    const service = new ParkingLotteryService(tenant)
    await service.sync()
    const lottery = await service.findLottery(params.id)
    const [data] = await ParkingLotteriesController.present(service, [lottery])
    return { data }
  }

  async store({ tenant, request, auth }: HttpContext) {
    const input = await request.validateUsing(createLotteryValidator)
    const service = new ParkingLotteryService(tenant)
    await service.sync()
    const created = await service.create(input, auth.getUserOrFail().id)
    const lottery = await service.findLottery(created.lottery.id)
    const warning = created.warning
    const [data] = await ParkingLotteriesController.present(service, [lottery])
    return { data, warning }
  }

  async update({ tenant, params, request }: HttpContext) {
    const input = await request.validateUsing(updateLotteryValidator)
    const service = new ParkingLotteryService(tenant)
    const lottery = await service.update(await service.findLottery(params.id), input)
    const [data] = await ParkingLotteriesController.present(service, [lottery])
    return { data }
  }

  async cancel({ tenant, params }: HttpContext) {
    const service = new ParkingLotteryService(tenant)
    const lottery = await service.cancel(await service.findLottery(params.id))
    const [data] = await ParkingLotteriesController.present(service, [lottery])
    return { data }
  }

  async draw({ tenant, params, auth }: HttpContext) {
    const service = new ParkingLotteryService(tenant)
    await service.sync()
    const lottery = await service.findLottery(params.id)
    await service.draw(lottery, auth.getUserOrFail().id)
    const drawn = await service.findLottery(params.id)
    const [data] = await ParkingLotteriesController.present(service, [drawn])
    return { data }
  }

  /** Offers every free communal spot to the next ones in the waiting list */
  async offer({ tenant, params }: HttpContext) {
    const service = new ParkingLotteryService(tenant)
    await service.sync()
    const lottery = await service.findLottery(params.id)
    const current = await service.currentLottery()
    if (current?.id !== lottery.id) {
      throw ResourceException.conflict('La lista de espera de este sorteo ya no está vigente')
    }
    let offered = 0
    for (const { type } of await service.spotCounts()) {
      for (const spot of await service.freeSpots(type, lottery)) {
        if (!(await service.offerNext(spot.id))) break
        offered++
      }
    }
    return { offered }
  }

  async applications({ tenant, params, request }: HttpContext) {
    const filters = await request.validateUsing(listApplicationsValidator, {
      data: request.qs(),
    })
    const service = new ParkingLotteryService(tenant)
    await service.sync()
    const lottery = await service.findLottery(params.id)
    const query = service
      .applicationsQuery()
      .where('lottery_id', lottery.id)
      .orderBy('vehicle_type')
      .orderByRaw('draw_position NULLS LAST')
      .orderBy('created_at')
    if (filters.status) query.where('status', filters.status)
    if (filters.vehicleType) query.where('vehicle_type', filters.vehicleType)
    if (filters.search) {
      const term = filters.search
      const plate = normalizePlate(term)
      query.where((q) => {
        q.whereIn(
          'unit_id',
          db
            .from('units')
            .where('tenant_id', tenant.id)
            .whereILike('code', `%${term}%`)
            .select('id')
        )
        if (plate) {
          q.orWhereIn(
            'unit_id',
            db
              .from('vehicles')
              .where('tenant_id', tenant.id)
              .whereNull('deleted_at')
              .whereILike('plate', `%${plate}%`)
              .select('unit_id')
          )
        }
      })
    }
    const applications = await query
    return { data: await ParkingLotteriesController.presentApplications(service, applications) }
  }

  /** The administration applies on behalf of a unit (residents without an account) */
  async apply({ tenant, params, request, auth }: HttpContext) {
    const input = await request.validateUsing(applyValidator)
    const service = new ParkingLotteryService(tenant)
    await service.sync()
    const lottery = await service.findLottery(params.id)
    const target = await service.applyTarget()
    if (target.id !== lottery.id) {
      throw ResourceException.conflict('Este sorteo ya no recibe postulaciones')
    }
    const application = await service.apply(input, auth.getUserOrFail().id)
    const [data] = await ParkingLotteriesController.presentApplications(service, [
      await service.findApplication(application.id),
    ])
    return { data }
  }

  async withdraw({ tenant, params }: HttpContext) {
    const service = new ParkingLotteryService(tenant)
    await service.withdraw(await service.findApplication(params.id))
    const [data] = await ParkingLotteriesController.presentApplications(service, [
      await service.findApplication(params.id),
    ])
    return { data }
  }

  async assign({ tenant, params, request, auth }: HttpContext) {
    const { spotId } = await request.validateUsing(assignApplicationValidator)
    const service = new ParkingLotteryService(tenant)
    await service.sync()
    await service.assignApplication(
      await service.findApplication(params.id),
      spotId,
      auth.getUserOrFail().id
    )
    const [data] = await ParkingLotteriesController.presentApplications(service, [
      await service.findApplication(params.id),
    ])
    return { data }
  }
}
