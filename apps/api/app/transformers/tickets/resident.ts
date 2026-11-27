import type Ticket from '#models/tickets/ticket'
import type TicketComment from '#models/tickets/ticket_comment'
import { iso } from '#transformers/helpers'
import { unitRef } from '#transformers/property/resident'

/** JSON shapes of the resident app: PQRS */

/** Preload `unit.building` (when the ticket has a unit) */
export function presentTicket(ticket: Ticket, viewerId: string) {
  return {
    id: ticket.id,
    number: ticket.number,
    type: ticket.type,
    subject: ticket.subject,
    description: ticket.description,
    priority: ticket.priority,
    status: ticket.status,
    unit: ticket.unit ? unitRef(ticket.unit) : null,
    isMine: ticket.createdById === viewerId,
    createdAt: iso(ticket.createdAt),
    updatedAt: iso(ticket.updatedAt),
    resolvedAt: iso(ticket.resolvedAt),
  }
}

/** Public comments only; preload `author` */
export function presentTicketComment(comment: TicketComment, viewerId: string) {
  return {
    id: comment.id,
    body: comment.body,
    isMine: comment.authorId === viewerId,
    authorName: comment.author?.fullName ?? 'Administración',
    createdAt: iso(comment.createdAt),
  }
}
