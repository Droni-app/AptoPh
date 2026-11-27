import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import type { BookingCreateInput } from '@aptoph/shared'
import FieldException from '#exceptions/field_exception'
import ResourceException from '#exceptions/resource_exception'
import Amenity from '#models/amenities/amenity'
import AmenityBooking from '#models/amenities/amenity_booking'
import { BookingService } from '#services/amenities/bookings'
import { presentAmenity } from '#services/amenities/rules'
import { AttachmentsService } from '#services/files/attachments'
import { findOwnUnit, residentUnitIds } from '#services/resident_scope'
import { serializeAttachment } from '#transformers/files/attachment_transformer'
import {
  bookingValidator,
  cancelBookingValidator,
  rangeValidator,
} from '#validators/amenities/amenities'
import { attachmentUrlValidator, uploadAttachmentValidator } from '#validators/files/attachment'

/** History shown to the resident */
const HISTORY_DAYS = 60
/** Payment receipts of a booking */
const RECEIPTS_MAX = 3

/**
 * Common areas in the portal (docs/amenities.md):
 *   GET  /resident/amenities                    GET /resident/amenities/:id/availability
 *   POST /resident/bookings/quote               GET /resident/bookings(/:id)
 *   POST /resident/bookings                     DELETE /resident/bookings/:id (cancels)
 *   POST /resident/bookings/:id/attachments     the payment receipt
 */
export default class ResidentBookingsController {
  private service(ctx: HttpContext) {
    return new BookingService(ctx.tenant)
  }

  private actor(ctx: HttpContext) {
    return { userId: ctx.auth.getUserOrFail().id, staff: false }
  }

  private async activeAmenity(ctx: HttpContext, id: string) {
    const amenity = await Amenity.query()
      .where('tenant_id', ctx.tenant.id)
      .where('id', id)
      .where('is_active', true)
      .first()
    if (!amenity) throw ResourceException.notFound('La zona común no existe')
    return amenity
  }

  private async own(ctx: HttpContext) {
    const unitIds = await residentUnitIds(ctx.tenant, ctx.auth.getUserOrFail().id)
    return { unitIds, booking: await this.service(ctx).find(ctx.params.id, unitIds) }
  }

  private async detail(ctx: HttpContext, booking: AmenityBooking) {
    const attachments = await new AttachmentsService(ctx.tenant).list('amenity_booking', booking.id)
    return {
      ...this.service(ctx).present(booking, ctx.auth.getUserOrFail().id, attachments.length),
      attachments: attachments.map(serializeAttachment),
      terms: booking.amenity.terms,
    }
  }

  async amenities({ tenant }: HttpContext) {
    const amenities = await Amenity.query()
      .where('tenant_id', tenant.id)
      .where('is_active', true)
      .orderBy('name')
    // Third-party fees are the administration's business
    return { data: amenities.map((amenity) => ({ ...presentAmenity(amenity), externalFee: null })) }
  }

  async availability(ctx: HttpContext) {
    const { from, to } = await ctx.request.validateUsing(rangeValidator, {
      data: ctx.request.qs(),
    })
    const amenity = await this.activeAmenity(ctx, ctx.params.id)
    return { data: await this.service(ctx).availability(amenity, from, to) }
  }

  async quote(ctx: HttpContext) {
    const input = (await ctx.request.validateUsing(bookingValidator)) as BookingCreateInput
    const amenity = await this.activeAmenity(ctx, input.amenityId)
    const service = this.service(ctx)
    const slot = service.slotFor(amenity, input)
    return {
      data: {
        ...service.quoteJson(amenity, input.bookingType === 'guest' ? 'guest' : 'resident', input),
        startsAt: slot.startsAt.toISO(),
        endsAt: slot.endsAt.toISO(),
      },
    }
  }

  async index(ctx: HttpContext) {
    const user = ctx.auth.getUserOrFail()
    const unitIds = await residentUnitIds(ctx.tenant, user.id)
    const service = this.service(ctx)
    const bookings = await service
      .withRelations(
        AmenityBooking.query()
          .where('tenant_id', ctx.tenant.id)
          .whereIn('unit_id', unitIds)
          .where('ends_at', '>=', DateTime.now().minus({ days: HISTORY_DAYS }).toSQL()!)
      )
      .orderBy('starts_at', 'desc')
      .limit(100)
    const counts = await service.attachmentCounts(bookings.map((booking) => booking.id))
    return {
      data: bookings.map((booking) =>
        service.present(booking, user.id, counts.get(booking.id) ?? 0)
      ),
    }
  }

  async show(ctx: HttpContext) {
    const { booking } = await this.own(ctx)
    return { data: await this.detail(ctx, booking) }
  }

  async store(ctx: HttpContext) {
    const user = ctx.auth.getUserOrFail()
    const input = (await ctx.request.validateUsing(bookingValidator)) as BookingCreateInput
    if (input.bookingType !== 'resident' && input.bookingType !== 'guest') {
      throw new FieldException('bookingType', 'Reserva para tu unidad o a nombre de un invitado')
    }
    if (!input.unitId) throw new FieldException('unitId', 'Elige la unidad')
    await findOwnUnit(ctx.tenant, user.id, input.unitId)
    const booking = await this.service(ctx).create(input, this.actor(ctx))
    ctx.response.status(201)
    return { data: await this.detail(ctx, booking) }
  }

  async destroy(ctx: HttpContext) {
    const { unitIds } = await this.own(ctx)
    const { reason } = await ctx.request.validateUsing(cancelBookingValidator)
    const { booking } = await this.service(ctx).cancel(
      ctx.params.id,
      reason ?? null,
      this.actor(ctx),
      unitIds
    )
    return { data: await this.detail(ctx, booking) }
  }

  /** The payment receipt, while the booking waits for approval */
  async attach(ctx: HttpContext) {
    const { booking } = await this.own(ctx)
    if (booking.status !== 'pending') {
      throw ResourceException.conflict(
        'La reserva ya fue revisada: no se le pueden agregar soportes'
      )
    }
    const { file } = await ctx.request.validateUsing(uploadAttachmentValidator)
    const attachment = await new AttachmentsService(ctx.tenant).upload(
      'amenity_booking',
      booking.id,
      file,
      ctx.auth.getUserOrFail().id,
      { max: RECEIPTS_MAX }
    )
    ctx.response.status(201)
    return { data: serializeAttachment(attachment) }
  }

  async attachmentUrl(ctx: HttpContext) {
    const { download } = await ctx.request.validateUsing(attachmentUrlValidator, {
      data: ctx.request.qs(),
    })
    const files = new AttachmentsService(ctx.tenant)
    const attachment = await files.find(ctx.params.id, ['amenity_booking'])
    const unitIds = await residentUnitIds(ctx.tenant, ctx.auth.getUserOrFail().id)
    await this.service(ctx).find(attachment.ownerId, unitIds)
    return { data: { url: await files.url(attachment, download ?? false) } }
  }
}
