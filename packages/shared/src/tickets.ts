/**
 * PQRS (peticiones, quejas, reclamos, sugerencias) y solicitudes de mantenimiento
 * en el backoffice. Ver docs/tickets.md.
 */
import type { EnrollmentRole } from './index.js'
import type { TicketPriority, TicketStatus, TicketType } from './domain.js'
import type { Attachment } from './files.js'

/** Ven la bandeja de PQRS. `staff` solo ve las que tiene asignadas */
export const TICKET_READ_ROLES: readonly EnrollmentRole[] = [
  'administrator',
  'council_member',
  'staff',
]

/** Responden y cambian el estado. `staff` solo en las que tiene asignadas */
export const TICKET_WORK_ROLES: readonly EnrollmentRole[] = ['administrator', 'staff']

/** Asignan, cambian la prioridad y gestionan todas las solicitudes */
export const TICKET_MANAGE_ROLES: readonly EnrollmentRole[] = ['administrator']

/** Pueden recibir solicitudes asignadas */
export const TICKET_ASSIGNEE_ROLES: readonly EnrollmentRole[] = ['administrator', 'staff']

/**
 * Días calendario para atender una solicitud según su prioridad. Pasado ese
 * plazo, una solicitud abierta o en trámite está vencida.
 */
export const TICKET_DUE_DAYS: Record<TicketPriority, number> = {
  urgent: 1,
  high: 3,
  medium: 7,
  low: 15,
}

/** Solicitudes que todavía esperan gestión */
export const TICKET_ACTIVE_STATUSES: readonly TicketStatus[] = ['open', 'in_progress']

export const TICKET_SUBJECT_MAX = 200
export const TICKET_COMMENT_MAX = 5000

/** Persona del conjunto vista desde una solicitud */
export interface TicketPerson {
  id: string
  fullName: string
}

/** Solicitud en la bandeja del backoffice */
export interface Ticket {
  id: string
  number: number
  type: TicketType
  subject: string
  description: string
  priority: TicketPriority
  status: TicketStatus
  unit: {
    id: string
    code: string
    building: { id: string; name: string } | null
  } | null
  createdBy: TicketPerson | null
  assignedTo: TicketPerson | null
  createdAt: string
  updatedAt: string | null
  resolvedAt: string | null
  /** Fecha límite según la prioridad (TICKET_DUE_DAYS) */
  dueAt: string
  /** Abierta o en trámite y pasada su fecha límite */
  isOverdue: boolean
  /** Comentarios públicos e internos */
  commentCount: number
  lastActivityAt: string
}

export interface TicketComment {
  id: string
  body: string
  /** Nota interna: el residente no la ve */
  isInternal: boolean
  author: TicketPerson | null
  /** Escrito por quien radicó la solicitud */
  isFromRequester: boolean
  createdAt: string
}

/** Contacto de quien radicó la solicitud */
export interface TicketRequester extends TicketPerson {
  email: string
  phone: string | null
}

export interface TicketDetail extends Omit<Ticket, 'createdBy'> {
  createdBy: TicketRequester | null
  comments: TicketComment[]
  attachments: Attachment[]
}

/** Conteos para las pestañas de la bandeja (con los permisos de quien consulta) */
export interface TicketStats {
  open: number
  inProgress: number
  resolved: number
  closed: number
  overdue: number
  unassigned: number
  mine: number
}

/** Quien puede recibir una solicitud asignada */
export interface TicketAssignee extends TicketPerson {
  role: EnrollmentRole
}

/** PATCH /api/v1/tickets/:id */
export interface TicketUpdateInput {
  status?: TicketStatus
  priority?: TicketPriority
  assignedToId?: string | null
}

/** POST /api/v1/tickets/:id/comments */
export interface TicketCommentInput {
  body: string
  isInternal: boolean
  /** Cambia el estado con la misma respuesta (p. ej. «Responder y resolver») */
  status?: TicketStatus
}

/** GET /api/v1/tickets */
export interface TicketFilters {
  status?: TicketStatus | 'active' | ''
  type?: TicketType | ''
  priority?: TicketPriority | ''
  buildingId?: string
  /** `me`, `none` o el id de una persona */
  assignedTo?: string
  overdue?: boolean
  /** Fechas de radicación, YYYY-MM-DD (zona del conjunto) */
  from?: string
  to?: string
  /** Número, asunto o código de la unidad */
  search?: string
  page?: number
  perPage?: number
}
