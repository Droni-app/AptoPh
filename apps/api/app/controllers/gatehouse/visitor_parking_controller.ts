import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import type ParkingStay from '#models/gatehouse/parking_stay'
import { VisitorParkingService } from '#services/gatehouse/visitor_parking'
import { paginated } from '#transformers/finance/finance'
import { serializeStay } from '#transformers/gatehouse/parking_transformer'
import {
  correctStayValidator,
  entryValidator,
  exitValidator,
  listStaysValidator,
  lookupValidator,
  parkingSettingsValidator,
  receiptValidator,
} from '#validators/gatehouse/visitor_parking'

/**
 * Visitor parking at the gate: the administration and the guards register
 * entries and exits; the administration configures spots, rates and payment.
 * docs/visitor-parking.md
 *
 *   GET  /visitor-parking/summary        GET  /visitor-parking/stays
 *   GET  /visitor-parking/settings       GET  /visitor-parking/stays/:id
 *   PUT  /visitor-parking/settings       POST /visitor-parking/stays
 *   GET  /visitor-parking/lookup?q=      PATCH /visitor-parking/stays/:id
 *   POST /visitor-parking/stays/:id/exit
 *   POST /visitor-parking/stays/:id/receipt
 */
export default class VisitorParkingController {
  private async present(service: VisitorParkingService, stays: ParkingStay[]) {
    const quotes = await service.quotes(stays)
    return (stay: ParkingStay) =>
      serializeStay(stay, { quote: quotes.get(stay.id)!, isOverstay: service.isOverstay(stay) })
  }

  private async one(service: VisitorParkingService, stay: ParkingStay) {
    return (await this.present(service, [stay]))(stay)
  }

  async settings({ tenant }: HttpContext) {
    return { data: new VisitorParkingService(tenant).settings }
  }

  async updateSettings({ tenant, request }: HttpContext) {
    const data = await request.validateUsing(parkingSettingsValidator)
    return { data: await new VisitorParkingService(tenant).saveSettings(data) }
  }

  async summary({ tenant }: HttpContext) {
    return { data: await new VisitorParkingService(tenant).summary() }
  }

  async lookup({ tenant, request }: HttpContext) {
    const { q } = await request.validateUsing(lookupValidator, { data: request.qs() })
    const service = new VisitorParkingService(tenant)
    const { inside, ...rest } = await service.lookup(q)
    return { data: { ...rest, inside: inside ? await this.one(service, inside) : null } }
  }

  async index({ tenant, request }: HttpContext) {
    const filters = await request.validateUsing(listStaysValidator, { data: request.qs() })
    const service = new VisitorParkingService(tenant)
    const status = filters.status ?? 'inside'
    const query = service.query().where('parking_stays.status', status)
    if (status === 'inside') query.orderBy('entered_at', 'asc')
    else query.orderBy('exited_at', 'desc')

    if (filters.vehicleType) query.where('vehicle_type', filters.vehicleType)
    if (filters.settlement) query.where('settlement', filters.settlement)
    if (filters.overstay && service.settings.maxStayHours) {
      query.whereRaw(`coalesce(exited_at, now()) - entered_at > (? * interval '1 hour')`, [
        service.settings.maxStayHours,
      ])
    }
    const day = (value: string) => DateTime.fromISO(value, { zone: service.zone })
    if (filters.from) query.where('entered_at', '>=', day(filters.from).startOf('day').toJSDate())
    if (filters.to) query.where('entered_at', '<=', day(filters.to).endOf('day').toJSDate())
    if (filters.search) {
      const term = filters.search
      const plate = term.toUpperCase().replace(/[^A-Z0-9]/g, '')
      query.where((q) => {
        if (plate) q.whereILike('plate', `%${plate}%`)
        q.orWhereILike('visitor_name', `%${term}%`)
        q.orWhereIn(
          'unit_id',
          tenant.related('units').query().whereILike('code', `%${term}%`).select('id')
        )
        if (/^\d{1,9}$/.test(term)) q.orWhere('number', Number(term))
      })
    }

    const page = await query.paginate(filters.page ?? 1, filters.perPage ?? 25)
    const serialize = await this.present(service, page.all())
    return paginated(page, serialize)
  }

  async show({ tenant, params }: HttpContext) {
    const service = new VisitorParkingService(tenant)
    return { data: await this.one(service, await service.find(params.id)) }
  }

  async store({ tenant, request, response, auth }: HttpContext) {
    const data = await request.validateUsing(entryValidator)
    const service = new VisitorParkingService(tenant)
    const stay = await service.enter(data, auth.getUserOrFail().id)
    response.status(201)
    return { data: await this.one(service, await service.find(stay.id)) }
  }

  async update({ tenant, params, request }: HttpContext) {
    const data = await request.validateUsing(correctStayValidator)
    const service = new VisitorParkingService(tenant)
    const stay = await service.correct(await service.find(params.id), data)
    return { data: await this.one(service, stay) }
  }

  async exit({ tenant, params, request, auth }: HttpContext) {
    const data = await request.validateUsing(exitValidator)
    const service = new VisitorParkingService(tenant)
    let stay = await service.exit(await service.find(params.id), data, auth.getUserOrFail().id)
    if (data.receiptEmail) stay = await service.sendReceipt(stay, data.receiptEmail)
    return { data: await this.one(service, stay) }
  }

  async receipt({ tenant, params, request }: HttpContext) {
    const { email } = await request.validateUsing(receiptValidator)
    const service = new VisitorParkingService(tenant)
    const stay = await service.sendReceipt(await service.find(params.id), email)
    return { data: await this.one(service, stay) }
  }
}
