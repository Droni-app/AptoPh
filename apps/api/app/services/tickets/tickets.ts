import db from '@adonisjs/lucid/services/db'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import { DateTime } from 'luxon'
import {
  TICKET_ACTIVE_STATUSES,
  TICKET_ASSIGNEE_ROLES,
  TICKET_DUE_DAYS,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  TICKET_TYPE_LABELS,
  type EnrollmentRole,
  type TicketAssignee,
  type TicketFilters,
  type TicketPriority,
  type TicketStats,
  type TicketStatus,
} from '@aptoph/shared'
import FieldException from '#exceptions/field_exception'
import ResourceException from '#exceptions/resource_exception'
import TicketMail from '#mails/tickets/ticket_mail'
import User from '#models/auth/user'
import type Tenant from '#models/tenants/tenant'
import type Ticket from '#models/tickets/ticket'
import TicketComment from '#models/tickets/ticket_comment'
import { appUrl } from '#services/app_urls'
import { queueMail } from '#services/mailer'
import { tenantToday } from '#services/resident_scope'

type TicketQuery = ModelQueryBuilderContract<typeof Ticket>

/** Who is using the back-office: their roles decide what they see and change */
export type TicketViewer = { id: string; roles: EnrollmentRole[] }

/** SQL of a ticket's due date: created_at plus the days of its priority */
const DUE_AT_SQL = `(tickets.created_at + (CASE tickets.priority ${Object.entries(TICKET_DUE_DAYS)
  .map(([priority, days]) => `WHEN '${priority}' THEN ${days}`)
  .join(' ')} END) * INTERVAL '1 day')`

/** Due date of a ticket (TICKET_DUE_DAYS). Must match DUE_AT_SQL */
export function dueAtOf(ticket: Pick<Ticket, 'createdAt' | 'priority'>) {
  return ticket.createdAt.plus({ days: TICKET_DUE_DAYS[ticket.priority] })
}

export function isOverdue(ticket: Pick<Ticket, 'createdAt' | 'priority' | 'status'>) {
  return TICKET_ACTIVE_STATUSES.includes(ticket.status) && dueAtOf(ticket) < DateTime.now()
}

/** Active (not resolved or closed) and past its due date */
function overdue(query: TicketQuery) {
  query.whereIn('tickets.status', [...TICKET_ACTIVE_STATUSES]).whereRaw(`${DUE_AT_SQL} < now()`)
}

/**
 * PQRS in the back-office. The administration and the council see every
 * ticket; `staff` only the ones assigned to them (404 for the rest).
 * The administration assigns and prioritizes; administration and staff answer
 * and change the status. docs/tickets.md
 */
export class TicketsService {
  constructor(
    private tenant: Tenant,
    private viewer: TicketViewer
  ) {}

  get canManage() {
    return this.viewer.roles.includes('administrator')
  }

  /** Administration and council see every ticket */
  get seesAll() {
    return this.viewer.roles.some((role) => role === 'administrator' || role === 'council_member')
  }

  get canWork() {
    return this.viewer.roles.some((role) => role === 'administrator' || role === 'staff')
  }

  /** Tickets the viewer can see */
  visible() {
    return this.tenant
      .related('tickets')
      .query()
      .if(!this.seesAll, (q) => q.where('tickets.assigned_to_id', this.viewer.id))
  }

  /** The bandeja: filtered, with the comment count and last activity of each ticket */
  list(filters: TicketFilters) {
    const query = this.visible()
      .select('tickets.*')
      .select(
        db.raw(
          '(SELECT count(*) FROM ticket_comments c WHERE c.ticket_id = tickets.id)::int AS comment_count'
        ),
        db.raw(
          '(SELECT max(c.created_at) FROM ticket_comments c WHERE c.ticket_id = tickets.id) AS last_comment_at'
        )
      )
      .preload('unit', (unit) => unit.preload('building'))
      .preload('createdBy')
      .preload('assignedTo')
      .orderBy('tickets.number', 'desc')

    if (filters.status === 'active') query.whereIn('tickets.status', [...TICKET_ACTIVE_STATUSES])
    else if (filters.status) query.where('tickets.status', filters.status)
    if (filters.type) query.where('tickets.type', filters.type)
    if (filters.priority) query.where('tickets.priority', filters.priority)
    if (filters.overdue) query.where(overdue)
    if (filters.assignedTo === 'me') query.where('tickets.assigned_to_id', this.viewer.id)
    else if (filters.assignedTo === 'none') query.whereNull('tickets.assigned_to_id')
    else if (filters.assignedTo) query.where('tickets.assigned_to_id', filters.assignedTo)
    if (filters.buildingId) {
      query.whereIn(
        'tickets.unit_id',
        db
          .from('units')
          .where('tenant_id', this.tenant.id)
          .where('building_id', filters.buildingId)
          .select('id')
      )
    }
    // Dates are local to the conjunto
    const localDate = `(tickets.created_at AT TIME ZONE ?)::date`
    if (filters.from) query.whereRaw(`${localDate} >= ?`, [this.tenant.timezone, filters.from])
    if (filters.to) query.whereRaw(`${localDate} <= ?`, [this.tenant.timezone, filters.to])
    if (filters.search) {
      const term = filters.search.replace(/^#/, '')
      query.where((q) => {
        if (/^\d{1,9}$/.test(term)) q.where('tickets.number', Number(term))
        q.orWhereILike('tickets.subject', `%${term}%`).orWhereIn(
          'tickets.unit_id',
          db
            .from('units')
            .where('tenant_id', this.tenant.id)
            .whereILike('code', `%${term}%`)
            .select('id')
        )
      })
    }
    return query
  }

  /** Counts of the tabs of the bandeja */
  async stats(): Promise<TicketStats> {
    const row = await this.visible()
      .clearSelect()
      .select(
        db.raw(`count(*) FILTER (WHERE tickets.status = 'open')::int AS open`),
        db.raw(`count(*) FILTER (WHERE tickets.status = 'in_progress')::int AS in_progress`),
        db.raw(`count(*) FILTER (WHERE tickets.status = 'resolved')::int AS resolved`),
        db.raw(`count(*) FILTER (WHERE tickets.status = 'closed')::int AS closed`),
        db.raw(
          `count(*) FILTER (WHERE tickets.status IN ('open', 'in_progress') AND ${DUE_AT_SQL} < now())::int AS overdue`
        ),
        db.raw(
          `count(*) FILTER (WHERE tickets.status IN ('open', 'in_progress') AND tickets.assigned_to_id IS NULL)::int AS unassigned`
        ),
        db.raw(
          `count(*) FILTER (WHERE tickets.status IN ('open', 'in_progress') AND tickets.assigned_to_id = ?)::int AS mine`,
          [this.viewer.id]
        )
      )
      .pojo<Record<string, number>>()
      .first()
    return {
      open: row?.open ?? 0,
      inProgress: row?.in_progress ?? 0,
      resolved: row?.resolved ?? 0,
      closed: row?.closed ?? 0,
      overdue: row?.overdue ?? 0,
      unassigned: row?.unassigned ?? 0,
      mine: row?.mine ?? 0,
    }
  }

  /** A ticket the viewer can see, with everything the detail shows (404 otherwise) */
  async find(id: string) {
    const ticket = await this.visible()
      .where('tickets.id', id)
      .preload('unit', (unit) => unit.preload('building'))
      .preload('createdBy')
      .preload('assignedTo')
      .first()
    if (!ticket) throw ResourceException.notFound('La solicitud no existe')
    return ticket
  }

  comments(ticket: Ticket) {
    return TicketComment.query()
      .where('tenant_id', this.tenant.id)
      .where('ticket_id', ticket.id)
      .preload('author')
      .orderBy('created_at')
      .orderBy('id')
  }

  /** People who can be assigned a ticket: active administration and staff */
  async assignees(): Promise<TicketAssignee[]> {
    const today = tenantToday(this.tenant)
    const rows = await db
      .from('enrollments as e')
      .join('users as u', 'u.id', 'e.user_id')
      .where('e.tenant_id', this.tenant.id)
      .where('e.status', 'active')
      .whereIn('e.role', [...TICKET_ASSIGNEE_ROLES])
      .where((q) => q.whereNull('e.starts_on').orWhere('e.starts_on', '<=', today))
      .where((q) => q.whereNull('e.ends_on').orWhere('e.ends_on', '>=', today))
      .whereNull('u.deleted_at')
      .select('u.id', 'u.full_name', 'e.role')
      .orderBy('u.full_name')
    // A person with both roles appears once, as administrator
    const people = new Map<string, TicketAssignee>()
    for (const row of rows) {
      const current = people.get(row.id)
      if (!current || row.role === 'administrator') {
        people.set(row.id, { id: row.id, fullName: row.full_name, role: row.role })
      }
    }
    return [...people.values()]
  }

  /**
   * Changes the status, priority or assignee. Staff can only change the status
   * of their tickets; assigning and prioritizing is for the administration.
   */
  async update(
    ticket: Ticket,
    input: { status?: TicketStatus; priority?: TicketPriority; assignedToId?: string | null }
  ) {
    this.assertCanWork()
    const reassigning =
      input.assignedToId !== undefined && input.assignedToId !== ticket.assignedToId
    const reprioritizing = input.priority !== undefined && input.priority !== ticket.priority
    if ((reassigning || reprioritizing) && !this.canManage) {
      throw ResourceException.forbidden(
        'Solo la administración asigna las solicitudes y cambia su prioridad'
      )
    }

    let assignee: User | null = null
    if (reassigning && input.assignedToId) {
      const assignees = await this.assignees()
      if (!assignees.some((person) => person.id === input.assignedToId)) {
        throw new FieldException(
          'assignedToId',
          'Solo puedes asignar a la administración o al personal activo del conjunto'
        )
      }
      assignee = await User.findOrFail(input.assignedToId)
    }

    const previousStatus = ticket.status
    if (reassigning) ticket.assignedToId = input.assignedToId ?? null
    if (reprioritizing) ticket.priority = input.priority!
    if (input.status) this.applyStatus(ticket, input.status)
    await ticket.save()

    if (assignee && assignee.id !== this.viewer.id) this.notifyAssignee(ticket, assignee)
    if (ticket.status !== previousStatus) {
      await this.notifyRequester(ticket, { status: ticket.status })
    }
    return ticket
  }

  /**
   * Adds a reply (seen by the resident) or an internal note, optionally changing
   * the status with it. The first public reply to an open ticket moves it to
   * «En trámite». Residents get an email for each reply and status change.
   */
  async comment(
    ticket: Ticket,
    input: { body: string; isInternal: boolean; status?: TicketStatus }
  ) {
    this.assertCanWork()
    const isPublic = !input.isInternal
    if (isPublic && ticket.status === 'closed' && (!input.status || input.status === 'closed')) {
      throw ResourceException.conflict(
        'La solicitud está cerrada. Reábrela para responderle al residente.'
      )
    }

    const previousStatus = ticket.status
    const status = input.status ?? (isPublic && ticket.status === 'open' ? 'in_progress' : null)
    const comment = await db.transaction(async (trx) => {
      if (status && status !== ticket.status) {
        ticket.useTransaction(trx)
        this.applyStatus(ticket, status)
        await ticket.save()
      } else {
        // The bandeja sorts and shows the last activity
        await trx
          .from('tickets')
          .where('tenant_id', this.tenant.id)
          .where('id', ticket.id)
          .update({ updated_at: new Date() })
      }
      return TicketComment.create(
        {
          tenantId: this.tenant.id,
          ticketId: ticket.id,
          authorId: this.viewer.id,
          body: input.body,
          isInternal: input.isInternal,
        },
        { client: trx }
      )
    })
    await comment.load('author')

    const statusChanged = ticket.status !== previousStatus
    if (isPublic || statusChanged) {
      await this.notifyRequester(ticket, {
        reply: isPublic ? input.body : undefined,
        status: statusChanged ? ticket.status : undefined,
      })
    }
    return comment
  }

  private assertCanWork() {
    if (!this.canWork) {
      throw ResourceException.forbidden('Tu rol solo puede consultar las solicitudes')
    }
  }

  private applyStatus(ticket: Ticket, status: TicketStatus) {
    if (status === ticket.status) return
    ticket.status = status
    if (status === 'resolved' || status === 'closed') ticket.resolvedAt ??= DateTime.now()
    else ticket.resolvedAt = null
  }

  /** Email to whoever filed the ticket (unless they are the one acting) */
  private async notifyRequester(ticket: Ticket, update: { reply?: string; status?: TicketStatus }) {
    if (ticket.createdById === this.viewer.id) return
    await ticket.load('createdBy')
    const requester = ticket.createdBy
    if (!requester || requester.deletedAt) return

    const ref = `#${ticket.number} · ${ticket.subject}`
    const status = update.status ? TICKET_STATUS_LABELS[update.status] : null
    const title = update.reply
      ? `La administración respondió tu solicitud #${ticket.number}`
      : `Tu solicitud #${ticket.number} está ${status!.toLowerCase()}`
    const paragraphs = update.reply
      ? update.reply
          .split(/\n{2,}/)
          .map((p) => p.trim())
          .filter(Boolean)
      : [
          status === TICKET_STATUS_LABELS.resolved
            ? 'Si el problema sigue, respóndenos desde el portal y la solicitud se reabre.'
            : `La administración cambió el estado de tu solicitud a «${status}».`,
        ]
    queueMail(
      new TicketMail(requester, this.tenant.name, {
        subject: `${this.tenant.name}: ${title}`,
        title,
        paragraphs,
        rows: [
          { label: 'Solicitud', value: ref },
          { label: 'Tipo', value: TICKET_TYPE_LABELS[ticket.type] },
          { label: 'Estado', value: TICKET_STATUS_LABELS[ticket.status] },
        ],
        action: 'Ver la solicitud',
        url: new URL(`/pqrs/${ticket.id}`, appUrl('web')).toString(),
      }),
      'ticket update'
    )
  }

  /** Email to the person a ticket was assigned to */
  private notifyAssignee(ticket: Ticket, assignee: User) {
    const title = `Te asignaron la solicitud #${ticket.number}`
    const url = new URL('/pqrs', appUrl('backoffice'))
    url.searchParams.set('id', ticket.id)
    queueMail(
      new TicketMail(assignee, this.tenant.name, {
        subject: `${this.tenant.name}: ${title}`,
        title,
        paragraphs: [ticket.subject],
        rows: [
          { label: 'Tipo', value: TICKET_TYPE_LABELS[ticket.type] },
          { label: 'Prioridad', value: TICKET_PRIORITY_LABELS[ticket.priority] },
          {
            label: 'Fecha límite',
            value: dueAtOf(ticket)
              .setZone(this.tenant.timezone)
              .setLocale('es-CO')
              .toFormat("d 'de' LLLL"),
          },
        ],
        action: 'Abrir la solicitud',
        url: url.toString(),
      }),
      'ticket assignment'
    )
  }
}
