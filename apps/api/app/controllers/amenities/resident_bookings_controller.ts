import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import Amenity from '#models/amenities/amenity'
import AmenityBooking from '#models/amenities/amenity_booking'
import type Tenant from '#models/tenants/tenant'
import FieldException from '#exceptions/field_exception'
import ResourceException from '#exceptions/resource_exception'
import { findOwnUnit, residentUnitIds } from '#services/resident_scope'
import { amenityRules, presentAmenity, presentBooking } from '#transformers/amenities/resident'
import { createBookingValidator } from '#validators/amenities/resident'

/** Bookings can be made up to this many days ahead */
const MAX_DAYS_AHEAD = 90
/** History shown to the resident */
const HISTORY_DAYS = 30
const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

/**
 * Common areas and the resident's bookings:
 *   GET    /api/v1/resident/amenities
 *   GET    /api/v1/resident/bookings
 *   POST   /api/v1/resident/bookings
 *   DELETE /api/v1/resident/bookings/:id   (cancels; future bookings only)
 *
 * A slot belongs to one booking at a time (the amenity_bookings exclusion
 * constraint). Amenities that require approval start `pending`; the rest are
 * approved at once.
 */
export default class BookingsController {
  async amenities({ tenant }: HttpContext) {
    const amenities = await Amenity.query()
      .where('tenant_id', tenant.id)
      .where('is_active', true)
      .orderBy('name')
    return { data: amenities.map(presentAmenity) }
  }

  async index({ tenant, auth }: HttpContext) {
    const user = auth.getUserOrFail()
    const unitIds = await residentUnitIds(tenant, user.id)
    const bookings = await AmenityBooking.query()
      .where('tenant_id', tenant.id)
      .whereIn('unit_id', unitIds)
      .where('ends_at', '>=', DateTime.now().minus({ days: HISTORY_DAYS }).toSQL()!)
      .preload('amenity')
      .preload('unit', (unit) => unit.preload('building'))
      .orderBy('starts_at', 'desc')
      .limit(100)

    const now = DateTime.now()
    return { data: bookings.map((booking) => presentBooking(booking, user.id, now)) }
  }

  async store({ tenant, auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const data = await request.validateUsing(createBookingValidator)
    await findOwnUnit(tenant, user.id, data.unitId)

    const startsAt = DateTime.fromISO(data.startsAt, { setZone: true })
    const endsAt = DateTime.fromISO(data.endsAt, { setZone: true })
    const guests = data.guestsCount ?? 1

    const booking = await db.transaction(async (trx) => {
      // Lock the amenity: concurrent requests for the same slot wait for each other
      const amenity = await Amenity.query({ client: trx })
        .where('tenant_id', tenant.id)
        .where('id', data.amenityId)
        .where('is_active', true)
        .forUpdate()
        .first()
      if (!amenity) throw new FieldException('amenityId', 'La zona común no existe')

      this.assertRules(tenant, amenity, startsAt, endsAt, guests)

      // Checked here for a clear message; the exclusion constraint is the guarantee
      const taken = await AmenityBooking.query({ client: trx })
        .where('tenant_id', tenant.id)
        .where('amenity_id', amenity.id)
        .whereIn('status', ['pending', 'approved'])
        .where('starts_at', '<', endsAt.toSQL()!)
        .where('ends_at', '>', startsAt.toSQL()!)
        .first()
      if (taken) throw ResourceException.conflict('Ese horario ya está reservado. Elige otro.')

      return AmenityBooking.create(
        {
          tenantId: tenant.id,
          amenityId: amenity.id,
          unitId: data.unitId,
          requestedById: user.id,
          startsAt,
          endsAt,
          guestsCount: data.guestsCount ?? null,
          status: amenity.requiresApproval ? 'pending' : 'approved',
        },
        { client: trx }
      )
    })

    await booking.load('amenity')
    await booking.load('unit', (unit) => unit.preload('building'))
    response.status(201)
    return { data: presentBooking(booking, user.id, DateTime.now()) }
  }

  async destroy({ tenant, auth, params }: HttpContext) {
    const user = auth.getUserOrFail()
    const unitIds = await residentUnitIds(tenant, user.id)
    const booking = await AmenityBooking.query()
      .where('tenant_id', tenant.id)
      .where('id', params.id)
      .whereIn('unit_id', unitIds)
      .preload('amenity')
      .preload('unit', (unit) => unit.preload('building'))
      .first()
    if (!booking) throw ResourceException.notFound('La reserva no existe')

    const now = DateTime.now()
    if (!presentBooking(booking, user.id, now).canCancel) {
      throw ResourceException.conflict('Esta reserva ya no se puede cancelar')
    }
    booking.status = 'cancelled'
    await booking.save()
    return { data: presentBooking(booking, user.id, now) }
  }

  /** Time window, opening hours, closed days, duration and capacity */
  private assertRules(
    tenant: Tenant,
    amenity: Amenity,
    startsAt: DateTime,
    endsAt: DateTime,
    guests: number
  ) {
    const rules = amenityRules(amenity)
    const now = DateTime.now()
    if (!startsAt.isValid || startsAt <= now) {
      throw new FieldException('startsAt', 'La reserva debe empezar en el futuro')
    }
    if (startsAt > now.plus({ days: MAX_DAYS_AHEAD })) {
      throw new FieldException(
        'startsAt',
        `Puedes reservar hasta con ${MAX_DAYS_AHEAD} días de anticipación`
      )
    }
    if (!endsAt.isValid || endsAt <= startsAt) {
      throw new FieldException('endsAt', 'La hora de fin debe ser posterior a la de inicio')
    }

    // Opening hours and closed days are local to the conjunto
    const start = startsAt.setZone(tenant.timezone)
    const end = endsAt.setZone(tenant.timezone)
    if (!start.hasSame(end, 'day') && !(end.hour === 0 && end.minute === 0)) {
      throw new FieldException('endsAt', 'La reserva debe terminar el mismo día')
    }
    if (rules.maxHours && endsAt.diff(startsAt, 'hours').hours > rules.maxHours) {
      throw new FieldException('endsAt', `La reserva puede durar máximo ${rules.maxHours} horas`)
    }
    if (rules.closedOn?.includes(WEEKDAYS[start.weekday - 1]!)) {
      throw new FieldException('startsAt', `${amenity.name} está cerrado ese día`)
    }
    const hhmm = (time: DateTime) => time.toFormat('HH:mm')
    if (rules.opensAt && hhmm(start) < rules.opensAt) {
      throw new FieldException('startsAt', `${amenity.name} abre a las ${rules.opensAt}`)
    }
    const endTime = end.hour === 0 && end.minute === 0 ? '24:00' : hhmm(end)
    if (rules.closesAt && endTime > rules.closesAt) {
      throw new FieldException('endsAt', `${amenity.name} cierra a las ${rules.closesAt}`)
    }
    if (amenity.capacity && guests > amenity.capacity) {
      throw new FieldException('guestsCount', `El aforo máximo es de ${amenity.capacity} personas`)
    }
  }
}
