import type {
  Attachment,
  Ticket as TicketData,
  TicketComment as TicketCommentData,
  TicketDetail,
  TicketPerson,
} from '@aptoph/shared'
import type User from '#models/auth/user'
import type Ticket from '#models/tickets/ticket'
import type TicketComment from '#models/tickets/ticket_comment'
import { iso } from '#transformers/helpers'
import { dueAtOf, isOverdue } from '#services/tickets/tickets'

/** JSON shapes of the back-office: PQRS */

const person = (user: User | null | undefined): TicketPerson | null =>
  user ? { id: user.id, fullName: user.fullName } : null

/** Preload `unit.building`, `createdBy` and `assignedTo` */
export function serializeTicket(ticket: Ticket): TicketData {
  const lastComment = ticket.$extras.last_comment_at as Date | string | null | undefined
  const activity = [
    ticket.createdAt.toISO()!,
    iso(ticket.updatedAt),
    lastComment ? new Date(lastComment).toISOString() : null,
  ]
    .filter((value): value is string => Boolean(value))
    .sort()
  return {
    id: ticket.id,
    number: ticket.number,
    type: ticket.type,
    subject: ticket.subject,
    description: ticket.description,
    priority: ticket.priority,
    status: ticket.status,
    unit: ticket.unit
      ? {
          id: ticket.unit.id,
          code: ticket.unit.code,
          building: ticket.unit.building
            ? { id: ticket.unit.building.id, name: ticket.unit.building.name }
            : null,
        }
      : null,
    createdBy: person(ticket.createdBy),
    assignedTo: person(ticket.assignedTo),
    createdAt: ticket.createdAt.toISO()!,
    updatedAt: iso(ticket.updatedAt),
    resolvedAt: iso(ticket.resolvedAt),
    dueAt: dueAtOf(ticket).toISO()!,
    isOverdue: isOverdue(ticket),
    commentCount: Number(ticket.$extras.comment_count ?? 0),
    lastActivityAt: activity[activity.length - 1]!,
  }
}

/** Preload `author` */
export function serializeTicketComment(ticket: Ticket, comment: TicketComment): TicketCommentData {
  return {
    id: comment.id,
    body: comment.body,
    isInternal: comment.isInternal,
    author: person(comment.author),
    isFromRequester: comment.authorId === ticket.createdById,
    createdAt: comment.createdAt.toISO()!,
  }
}

export function serializeTicketDetail(
  ticket: Ticket,
  comments: TicketComment[],
  attachments: Attachment[]
): TicketDetail {
  const requester = ticket.createdBy
  return {
    ...serializeTicket(ticket),
    commentCount: comments.length,
    lastActivityAt: [
      ticket.createdAt.toISO()!,
      iso(ticket.updatedAt),
      ...comments.map((comment) => comment.createdAt.toISO()!),
    ]
      .filter((value): value is string => Boolean(value))
      .sort()
      .pop()!,
    createdBy: requester
      ? {
          id: requester.id,
          fullName: requester.fullName,
          email: requester.email,
          phone: requester.phone ?? null,
        }
      : null,
    comments: comments.map((comment) => serializeTicketComment(ticket, comment)),
    attachments,
  }
}
