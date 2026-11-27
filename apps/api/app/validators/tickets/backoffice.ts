import vine from '@vinejs/vine'
import {
  TICKET_COMMENT_MAX,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  TICKET_TYPES,
} from '@aptoph/shared'

/** Validators of the back-office PQRS (/api/v1/tickets) */

const date = () =>
  vine
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()

export const listTicketsValidator = vine.create({
  status: vine.enum([...TICKET_STATUSES, 'active'] as const).optional(),
  type: vine.enum(TICKET_TYPES).optional(),
  priority: vine.enum(TICKET_PRIORITIES).optional(),
  buildingId: vine.string().uuid().optional(),
  assignedTo: vine
    .string()
    .trim()
    .regex(/^(me|none|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i)
    .optional(),
  overdue: vine.boolean().optional(),
  from: date(),
  to: date(),
  search: vine.string().trim().maxLength(100).optional(),
  page: vine.number().withoutDecimals().min(1).optional(),
  perPage: vine.number().withoutDecimals().min(1).max(100).optional(),
})

export const updateTicketValidator = vine.create({
  status: vine.enum(TICKET_STATUSES).optional(),
  priority: vine.enum(TICKET_PRIORITIES).optional(),
  assignedToId: vine.string().uuid().nullable().optional(),
})

export const ticketCommentValidator = vine.create({
  body: vine.string().trim().minLength(1).maxLength(TICKET_COMMENT_MAX),
  isInternal: vine.boolean(),
  status: vine.enum(TICKET_STATUSES).optional(),
})
