import type { HttpContext } from '@adonisjs/core/http'
import { TICKET_MANAGE_ROLES, TICKET_TYPE_LABELS } from '@aptoph/shared'
import { NotificationService } from '#services/notifications/notifications'
import db from '@adonisjs/lucid/services/db'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import Ticket from '#models/tickets/ticket'
import TicketComment from '#models/tickets/ticket_comment'
import ResourceException from '#exceptions/resource_exception'
import { findOwnUnit, residentUnitIds } from '#services/resident_scope'
import { presentTicket, presentTicketComment } from '#transformers/tickets/resident'
import { createTicketCommentValidator, createTicketValidator } from '#validators/tickets/resident'

/**
 * PQRS (petitions, complaints, claims, suggestions) and maintenance requests.
 * A resident sees the tickets they opened and those of their units, with the
 * public conversation only (internal notes of the administration stay hidden).
 *
 *   GET  /api/v1/resident/tickets
 *   POST /api/v1/resident/tickets
 *   GET  /api/v1/resident/tickets/:id
 *   POST /api/v1/resident/tickets/:id/comments
 */
export default class TicketsController {
  async index(ctx: HttpContext) {
    const user = ctx.auth.getUserOrFail()
    const tickets = await Ticket.query()
      .where(await this.visible(ctx))
      .preload('unit', (unit) => unit.preload('building'))
      .orderBy('number', 'desc')
      .limit(200)
    return { data: tickets.map((ticket) => presentTicket(ticket, user.id)) }
  }

  async show(ctx: HttpContext) {
    const user = ctx.auth.getUserOrFail()
    const ticket = await this.find(ctx)
    await ticket.load('comments', (comments) =>
      comments.where('is_internal', false).preload('author').orderBy('created_at')
    )
    return {
      data: {
        ...presentTicket(ticket, user.id),
        comments: ticket.comments.map((comment) => presentTicketComment(comment, user.id)),
      },
    }
  }

  async store({ tenant, auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const data = await request.validateUsing(createTicketValidator)
    if (data.unitId) await findOwnUnit(tenant, user.id, data.unitId)

    const ticket = await db.transaction(async (trx) => {
      // Consecutive number per conjunto: lock the tenant row while taking the next one
      await trx.from('tenants').where('id', tenant.id).forUpdate().first()
      const [{ max }] = await trx.from('tickets').where('tenant_id', tenant.id).max('number as max')
      return Ticket.create(
        {
          tenantId: tenant.id,
          number: Number(max ?? 0) + 1,
          unitId: data.unitId ?? null,
          createdById: user.id,
          type: data.type,
          subject: data.subject,
          description: data.description,
          priority: 'medium',
          status: 'open',
        },
        { client: trx }
      )
    })

    if (ticket.unitId) await ticket.load('unit', (unit) => unit.preload('building'))
    // The administration sees it in its bell
    const notifications = new NotificationService(tenant)
    await notifications.notify(await notifications.staffWith(TICKET_MANAGE_ROLES), {
      app: 'backoffice',
      category: 'tickets',
      type: 'ticket.created',
      title: `Nueva solicitud #${ticket.number}: ${ticket.subject}`,
      body: [ticket.unit ? `Unidad ${ticket.unit.code}` : null, user.fullName]
        .filter(Boolean)
        .join(' · '),
      path: `/pqrs?id=${ticket.id}`,
      email: {
        paragraphs: [ticket.description.slice(0, 600)],
        rows: [
          { label: 'Tipo', value: TICKET_TYPE_LABELS[ticket.type] },
          { label: 'Radicada por', value: user.fullName },
        ],
        action: 'Abrir la solicitud',
      },
    })
    response.status(201)
    return { data: { ...presentTicket(ticket, user.id), comments: [] } }
  }

  /** Replying to a resolved ticket reopens it; closed tickets are final */
  async comment(ctx: HttpContext) {
    const user = ctx.auth.getUserOrFail()
    const ticket = await this.find(ctx)
    if (ticket.status === 'closed') {
      throw ResourceException.conflict(
        'Esta solicitud está cerrada. Radica una nueva si lo necesitas.'
      )
    }
    const { body } = await ctx.request.validateUsing(createTicketCommentValidator)

    const comment = await db.transaction(async (trx) => {
      if (ticket.status === 'resolved') {
        ticket.useTransaction(trx)
        ticket.merge({ status: 'open', resolvedAt: null })
        await ticket.save()
      }
      return TicketComment.create(
        {
          tenantId: ctx.tenant.id,
          ticketId: ticket.id,
          authorId: user.id,
          body,
          isInternal: false,
        },
        { client: trx }
      )
    })
    await comment.load('author')
    // To whoever works on it, or the administration if nobody does
    const notifications = new NotificationService(ctx.tenant)
    await notifications.notify(
      ticket.assignedToId
        ? [ticket.assignedToId]
        : await notifications.staffWith(TICKET_MANAGE_ROLES),
      {
        app: 'backoffice',
        category: 'tickets',
        type: 'ticket.resident_reply',
        title: `${user.fullName} respondió la solicitud #${ticket.number}`,
        body: body.slice(0, 280),
        path: `/pqrs?id=${ticket.id}`,
      }
    )
    ctx.response.status(201)
    return { data: presentTicketComment(comment, user.id) }
  }

  /**
   * Condition for the tickets the resident opened or that belong to one of their
   * units. Returned as a callback: awaiting a query builder would run it.
   */
  private async visible({ tenant, auth }: HttpContext) {
    const user = auth.getUserOrFail()
    const unitIds = await residentUnitIds(tenant, user.id)
    return (query: ModelQueryBuilderContract<typeof Ticket>) => {
      query.where('tenant_id', tenant.id).where((q) => {
        q.where('created_by_id', user.id)
        if (unitIds.length) q.orWhereIn('unit_id', unitIds)
      })
    }
  }

  private async find(ctx: HttpContext) {
    const ticket = await Ticket.query()
      .where(await this.visible(ctx))
      .where('id', ctx.params.id)
      .preload('unit', (unit) => unit.preload('building'))
      .first()
    if (!ticket) throw ResourceException.notFound('La solicitud no existe')
    return ticket
  }
}
