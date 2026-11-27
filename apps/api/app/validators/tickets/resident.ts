import vine from '@vinejs/vine'
import { TICKET_TYPES } from '@aptoph/shared'

/** Validators of the resident app (/api/v1/resident/*): PQRS */

export const createTicketValidator = vine.create({
  unitId: vine.string().uuid().nullable().optional(),
  type: vine.enum(TICKET_TYPES),
  subject: vine.string().trim().minLength(5).maxLength(200),
  description: vine.string().trim().minLength(10).maxLength(5000),
})

export const createTicketCommentValidator = vine.create({
  body: vine.string().trim().minLength(1).maxLength(5000),
})
