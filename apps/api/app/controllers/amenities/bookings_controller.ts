import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import type { BookingCreateInput } from '@aptoph/shared'
import ResourceException from '#exceptions/resource_exception'
import Amenity from '#models/amenities/amenity'
import AmenityBooking from '#models/amenities/amenity_booking'
import { BookingService } from '#services/amenities/bookings'
import { AttachmentsService } from '#services/files/attachments'
import { paginated } from '#transformers/finance/finance'
import { serializeAttachment } from '#transformers/files/attachment_transformer'
import {
  approveBookingValidator,
  bookingListValidator,
  cancelBookingValidator,
  depositValidator,
  rangeValidator,
  reasonValidator,
  staffBookingValidator,
} from '#validators/amenities/amenities'
import { attachmentUrlValidator, uploadAttachmentValidator } from '#validators/files/attachment'

/**
 * Bookings of common areas in the back-office (docs/amenities.md): the
 * calendar, the queue to approve, bookings made by the administration (for a
 * unit, a third party or a maintenance block) and the deposit.
 */
export default class BookingsController {
  private service(ctx: HttpContext) {
    return new BookingService(ctx.tenant)
  }

  private actor(ctx: HttpContext) {
    return { userId: ctx.auth.getUserOrFail().id, staff: true }
  }

  private async many(ctx: HttpContext, bookings: AmenityBooking[]) {
    const service = this.service(ctx)
    const counts = await service.attachmentCounts(bookings.map((booking) => booking.id))
    const viewer = ctx.auth.getUserOrFail().id
    return bookings.map((booking) =>
      service.present(booking, viewer, counts.get(booking.id) ?? 0, { staff: true })
    )
  }

  private async one(ctx: HttpContext, booking: AmenityBooking) {
    const attachments = await new AttachmentsService(ctx.tenant).list('amenity_booking', booking.id)
    return {
      ...this.service(ctx).present(booking, ctx.auth.getUserOrFail().id, attachments.length, {
        staff: true,
      }),
      attachments: attachments.map(serializeAttachment),
    }
  }

  /** GET /bookings/calendar?from&to&amenityId */
  async calendar(ctx: HttpContext) {
    const filters = await ctx.request.validateUsing(rangeValidator, { data: ctx.request.qs() })
    const bookings = await this.service(ctx).calendar(filters.from, filters.to, filters)
    return { data: await this.many(ctx, bookings) }
  }

  /** GET /bookings?status=pending — the queue and the history */
  async index(ctx: HttpContext) {
    const filters = await ctx.request.validateUsing(bookingListValidator, {
      data: ctx.request.qs(),
    })
    const query = this.service(ctx)
      .withRelations(AmenityBooking.query().where('tenant_id', ctx.tenant.id))
      .whereNot('booking_type', 'block')
      .if(filters.amenityId, (q) => q.where('amenity_id', filters.amenityId!))
    if (filters.status === 'deposit') query.where('deposit_status', 'held')
    else if (filters.status) query.where('status', filters.status)
    if (filters.status === 'pending' || filters.status === 'deposit') query.orderBy('starts_at')
    else query.orderBy('starts_at', 'desc')
    const page = await query.paginate(filters.page ?? 1, filters.perPage ?? 25)
    const data = await this.many(ctx, page.all())
    return { ...paginated(page, (row) => row), data }
  }

  /** GET /bookings/stats — counters of the module's tabs */
  async stats({ tenant }: HttpContext) {
    const row = await db
      .from('amenity_bookings')
      .where('tenant_id', tenant.id)
      .select(
        db.raw(`count(*) filter (where status = 'pending' and ends_at > now())::int as pending`),
        db.raw(`count(*) filter (where deposit_status = 'held')::int as deposits`),
        db.raw(
          `count(*) filter (where status = 'approved' and booking_type <> 'block' and (starts_at at time zone ?)::date = (now() at time zone ?)::date)::int as today`,
          [tenant.timezone || 'America/Bogota', tenant.timezone || 'America/Bogota']
        )
      )
      .first()
    return {
      data: {
        pending: row?.pending ?? 0,
        deposits: row?.deposits ?? 0,
        today: row?.today ?? 0,
      },
    }
  }

  async show(ctx: HttpContext) {
    const booking = await this.service(ctx).find(ctx.params.id)
    return { data: await this.one(ctx, booking) }
  }

  /** POST /bookings/quote — slot and price before booking */
  async quote(ctx: HttpContext) {
    const input = (await ctx.request.validateUsing(staffBookingValidator)) as BookingCreateInput
    const amenity = await this.amenity(ctx, input.amenityId)
    const service = this.service(ctx)
    const slot = service.slotFor(amenity, input)
    return {
      data: {
        ...service.quoteJson(amenity, input.bookingType, input),
        startsAt: slot.startsAt.toISO(),
        endsAt: slot.endsAt.toISO(),
      },
    }
  }

  async store(ctx: HttpContext) {
    const { approve, ...input } = await ctx.request.validateUsing(staffBookingValidator)
    const service = this.service(ctx)
    let booking = await service.create(input as BookingCreateInput, this.actor(ctx))
    if (approve && booking.status === 'pending') {
      booking = await service.approve(booking.id, approve, this.actor(ctx), { receipt: false })
    }
    ctx.response.status(201)
    return { data: await this.one(ctx, booking) }
  }

  async approve(ctx: HttpContext) {
    const input = await ctx.request.validateUsing(approveBookingValidator)
    const booking = await this.service(ctx).approve(ctx.params.id, input, this.actor(ctx))
    return { data: await this.one(ctx, booking) }
  }

  async reject(ctx: HttpContext) {
    const { reason } = await ctx.request.validateUsing(reasonValidator)
    const booking = await this.service(ctx).reject(ctx.params.id, reason, this.actor(ctx))
    return { data: await this.one(ctx, booking) }
  }

  async cancel(ctx: HttpContext) {
    const { reason } = await ctx.request.validateUsing(cancelBookingValidator)
    const { booking, warnings } = await this.service(ctx).cancel(
      ctx.params.id,
      reason ?? null,
      this.actor(ctx)
    )
    return { data: await this.one(ctx, booking), warnings }
  }

  async deposit(ctx: HttpContext) {
    const input = await ctx.request.validateUsing(depositValidator)
    const booking = await this.service(ctx).settleDeposit(ctx.params.id, input, this.actor(ctx))
    return { data: await this.one(ctx, booking) }
  }

  async attach(ctx: HttpContext) {
    const booking = await this.service(ctx).find(ctx.params.id)
    const { file } = await ctx.request.validateUsing(uploadAttachmentValidator)
    const attachment = await new AttachmentsService(ctx.tenant).upload(
      'amenity_booking',
      booking.id,
      file,
      ctx.auth.getUserOrFail().id
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
    return { data: { url: await files.url(attachment, download ?? false) } }
  }

  async detach(ctx: HttpContext) {
    const files = new AttachmentsService(ctx.tenant)
    const attachment = await files.find(ctx.params.id, ['amenity_booking'])
    await files.remove(attachment, ctx.auth.getUserOrFail().id)
    ctx.response.status(204)
  }

  private async amenity(ctx: HttpContext, id: string) {
    const amenity = await Amenity.query()
      .where('tenant_id', ctx.tenant.id)
      .where('id', id)
      .where('is_active', true)
      .first()
    if (!amenity) throw ResourceException.notFound('La zona común no existe')
    return amenity
  }
}
