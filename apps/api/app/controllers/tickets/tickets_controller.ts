import type { HttpContext } from '@adonisjs/core/http'
import type Ticket from '#models/tickets/ticket'
import { AttachmentsService } from '#services/files/attachments'
import { TicketsService } from '#services/tickets/tickets'
import { paginated } from '#transformers/finance/finance'
import { serializeAttachment } from '#transformers/files/attachment_transformer'
import {
  serializeTicket,
  serializeTicketComment,
  serializeTicketDetail,
} from '#transformers/tickets/ticket_transformer'
import { attachmentUrlValidator, uploadAttachmentValidator } from '#validators/files/attachment'
import {
  listTicketsValidator,
  ticketCommentValidator,
  updateTicketValidator,
} from '#validators/tickets/backoffice'

/**
 * PQRS in the back-office: the bandeja, the conversation with the resident,
 * internal notes, assignment and attachments. docs/tickets.md
 *
 *   GET    /api/v1/tickets              GET  /api/v1/tickets/:id
 *   GET    /api/v1/tickets/stats        PATCH /api/v1/tickets/:id
 *   GET    /api/v1/tickets/assignees    POST /api/v1/tickets/:id/comments
 *   POST   /api/v1/tickets/:id/attachments
 *   GET    /api/v1/tickets/attachments/:id/url
 *   DELETE /api/v1/tickets/attachments/:id
 */
export default class TicketsController {
  private service({ tenant, tenantRoles, auth }: HttpContext) {
    return new TicketsService(tenant, { id: auth.getUserOrFail().id, roles: tenantRoles })
  }

  private async detail(ctx: HttpContext, service: TicketsService, ticket: Ticket) {
    const [comments, attachments] = await Promise.all([
      service.comments(ticket),
      new AttachmentsService(ctx.tenant).list('ticket', ticket.id),
    ])
    return serializeTicketDetail(ticket, comments, attachments.map(serializeAttachment))
  }

  async index(ctx: HttpContext) {
    const filters = await ctx.request.validateUsing(listTicketsValidator, {
      data: ctx.request.qs(),
    })
    const page = await this.service(ctx)
      .list(filters)
      .paginate(filters.page ?? 1, filters.perPage ?? 20)
    return paginated(page, serializeTicket)
  }

  async stats(ctx: HttpContext) {
    return { data: await this.service(ctx).stats() }
  }

  async assignees(ctx: HttpContext) {
    return { data: await this.service(ctx).assignees() }
  }

  async show(ctx: HttpContext) {
    const service = this.service(ctx)
    const ticket = await service.find(ctx.params.id)
    return { data: await this.detail(ctx, service, ticket) }
  }

  async update(ctx: HttpContext) {
    const service = this.service(ctx)
    const ticket = await service.find(ctx.params.id)
    const data = await ctx.request.validateUsing(updateTicketValidator)
    await service.update(ticket, data)
    return { data: await this.detail(ctx, service, await service.find(ticket.id)) }
  }

  async comment(ctx: HttpContext) {
    const service = this.service(ctx)
    const ticket = await service.find(ctx.params.id)
    const data = await ctx.request.validateUsing(ticketCommentValidator)
    const comment = await service.comment(ticket, data)
    ctx.response.status(201)
    return { data: serializeTicketComment(ticket, comment) }
  }

  async attach(ctx: HttpContext) {
    const service = this.service(ctx)
    const ticket = await service.find(ctx.params.id)
    const { file } = await ctx.request.validateUsing(uploadAttachmentValidator)
    const attachment = await new AttachmentsService(ctx.tenant).upload(
      'ticket',
      ticket.id,
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
    const attachment = await files.find(ctx.params.id, ['ticket'])
    // Staff only open the files of the tickets they can see
    await this.service(ctx).find(attachment.ownerId)
    return { data: { url: await files.url(attachment, download ?? false) } }
  }

  async detach(ctx: HttpContext) {
    const files = new AttachmentsService(ctx.tenant)
    const attachment = await files.find(ctx.params.id, ['ticket'])
    await this.service(ctx).find(attachment.ownerId)
    await files.remove(attachment, ctx.auth.getUserOrFail().id)
    ctx.response.status(204)
  }
}
