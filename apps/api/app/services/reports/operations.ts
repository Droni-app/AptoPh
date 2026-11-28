import { DateTime } from 'luxon'
import {
  ANNOUNCEMENT_AUDIENCE_LABELS,
  BOOKING_STATUS_LABELS,
  BOOKING_TYPE_LABELS,
  DEPOSIT_STATUS_LABELS,
  DOCUMENT_CATEGORY_LABELS,
  PARKING_SETTLEMENT_LABELS,
  TICKET_DUE_DAYS,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  TICKET_TYPE_LABELS,
  type AnnouncementAudience,
  type BookingStatus,
  type BookingType,
  type DepositStatus,
  type DocumentCategory,
  type ParkingSettlement,
  type ReportCell,
  type ReportColumn,
  type TicketPriority,
  type TicketStatus,
  type TicketType,
} from '@aptoph/shared'
import Announcement from '#models/announcements/announcement'
import Survey from '#models/surveys/survey'
import { AnnouncementsService } from '#services/announcements/announcements'
import type { ReportRunner } from '#services/reports/engine'
import { SurveysService } from '#services/surveys/surveys'
import {
  col,
  int,
  isoDate,
  localDay,
  money,
  percent,
  rangeText,
  round1,
  select,
  totalsOf,
  UNIT_LABEL,
} from '#services/reports/support'

type Row = Record<string, ReportCell>

/** Deadline of a ticket by priority (TICKET_DUE_DAYS) */
const DUE_AT = `(t.created_at + (CASE t.priority ${Object.entries(TICKET_DUE_DAYS)
  .map(([priority, days]) => `WHEN '${priority}' THEN ${days}`)
  .join(' ')} ELSE 7 END) * interval '1 day')`

export const tickets: ReportRunner = async ({ tenant, zone, filters }) => {
  const { from, to } = filters as { from: string; to: string }
  const where = ['t.tenant_id = ?', `${localDay('t.created_at')} BETWEEN ?::date AND ?::date`]
  const bindings: unknown[] = [tenant.id, zone, from, to]
  for (const key of ['type', 'status', 'priority'] as const) {
    if (filters[key]) {
      where.push(`t.${key} = ?`)
      bindings.push(filters[key])
    }
  }
  if (filters.buildingId) {
    where.push('u.building_id = ?')
    bindings.push(filters.buildingId)
  }
  const base = `FROM tickets t
     LEFT JOIN units u ON u.id = t.unit_id
     LEFT JOIN buildings b ON b.id = u.building_id
     LEFT JOIN users usr ON usr.id = t.assigned_to_id
    WHERE ${where.join(' AND ')}`
  const metrics = `COUNT(*) AS total,
       COUNT(*) FILTER (WHERE t.status = 'open') AS open,
       COUNT(*) FILTER (WHERE t.status = 'in_progress') AS in_progress,
       COUNT(*) FILTER (WHERE t.status IN ('resolved', 'closed')) AS resolved,
       COUNT(*) FILTER (WHERE t.status IN ('open', 'in_progress') AND ${DUE_AT} < now()) AS overdue,
       COUNT(*) FILTER (WHERE t.resolved_at IS NOT NULL AND t.resolved_at > ${DUE_AT}) AS late,
       AVG(EXTRACT(EPOCH FROM (t.resolved_at - t.created_at)) / 3600) FILTER (WHERE t.resolved_at IS NOT NULL) AS hours`
  const [all] = await select(`SELECT ${metrics} ${base}`, bindings)
  const summary = [
    { label: 'Solicitudes', value: int(all.total), type: 'number' as const },
    { label: 'Pendientes', value: int(all.open) + int(all.in_progress), type: 'number' as const },
    {
      label: 'Vencidas sin resolver',
      value: int(all.overdue),
      type: 'number' as const,
      tone: int(all.overdue) > 0 ? ('danger' as const) : ('good' as const),
      hint: 'Abiertas o en trámite después del plazo de su prioridad',
    },
    {
      label: 'Resueltas',
      value: percent(int(all.resolved), int(all.total)),
      type: 'percent' as const,
    },
    {
      label: 'Tiempo promedio de solución',
      value: round1(Number(all.hours)),
      type: 'hours' as const,
    },
  ]

  const groupBy = String(filters.groupBy ?? 'type')
  if (groupBy === 'detail') {
    const rows = await select(
      `SELECT t.number, ${localDay('t.created_at')} AS day, t.type, t.subject, ${UNIT_LABEL} AS unit,
              t.priority, t.status, usr.full_name AS assignee, t.resolved_at,
              EXTRACT(EPOCH FROM (t.resolved_at - t.created_at)) / 3600 AS hours,
              CASE WHEN t.resolved_at IS NOT NULL THEN (t.resolved_at > ${DUE_AT})
                   ELSE (${DUE_AT} < now()) END AS late
         ${base}
        ORDER BY t.created_at DESC LIMIT 5001`,
      [zone, ...bindings]
    )
    const columns: ReportColumn[] = [
      col('number', 'Número', 'number'),
      col('date', 'Fecha', 'date'),
      col('type', 'Tipo'),
      col('subject', 'Asunto'),
      col('unit', 'Unidad'),
      col('priority', 'Prioridad'),
      col('status', 'Estado'),
      col('assignee', 'Responsable'),
      col('resolvedAt', 'Resuelta', 'datetime'),
      col('hours', 'Horas para resolver', 'hours'),
      col('deadline', 'Plazo'),
    ]
    const data: Row[] = rows.map((row) => ({
      number: int(row.number),
      date: isoDate(row.day),
      type: TICKET_TYPE_LABELS[row.type as TicketType] ?? row.type,
      subject: row.subject,
      unit: row.unit || null,
      priority: TICKET_PRIORITY_LABELS[row.priority as TicketPriority] ?? row.priority,
      status: TICKET_STATUS_LABELS[row.status as TicketStatus] ?? row.status,
      assignee: row.assignee ?? 'Sin asignar',
      resolvedAt: row.resolved_at ? DateTime.fromJSDate(row.resolved_at).toISO() : null,
      hours: row.hours === null ? null : round1(Number(row.hours)),
      deadline: row.resolved_at
        ? row.late
          ? 'Fuera de plazo'
          : 'A tiempo'
        : row.late
          ? 'Vencida'
          : 'En plazo',
    }))
    return { period: rangeText(from, to), summary, columns, rows: data }
  }

  const groups: Record<string, { expr: string; label: string; type: ReportColumn['type'] }> = {
    status: { expr: 't.status', label: 'Estado', type: 'text' },
    type: { expr: 't.type', label: 'Tipo', type: 'text' },
    priority: { expr: 't.priority', label: 'Prioridad', type: 'text' },
    assignee: {
      expr: `COALESCE(usr.full_name, 'Sin asignar')`,
      label: 'Responsable',
      type: 'text',
    },
    month: {
      expr: `date_trunc('month', t.created_at AT TIME ZONE ?)::date`,
      label: 'Mes',
      type: 'month',
    },
    building: {
      expr: `COALESCE(b.name, CASE WHEN t.unit_id IS NULL THEN 'Sin unidad' ELSE 'Sin torre' END)`,
      label: 'Torre',
      type: 'text',
    },
  }
  const group = groups[groupBy] ?? groups.type!
  const rows = await select(
    `SELECT ${group.expr} AS key, ${metrics} ${base} GROUP BY 1 ORDER BY ${group.type === 'month' ? '1' : 'total DESC'}`,
    groupBy === 'month' ? [zone, ...bindings] : bindings
  )
  const labels: Record<string, Record<string, string>> = {
    status: TICKET_STATUS_LABELS,
    type: TICKET_TYPE_LABELS,
    priority: TICKET_PRIORITY_LABELS,
  }
  const columns: ReportColumn[] = [
    col('group', group.label, group.type),
    col('total', 'Solicitudes', 'number'),
    col('open', 'Abiertas', 'number'),
    col('inProgress', 'En trámite', 'number'),
    col('resolved', 'Resueltas o cerradas', 'number'),
    col('overdue', 'Vencidas', 'number'),
    col('late', 'Resueltas fuera de plazo', 'number'),
    col('hours', 'Horas promedio de solución', 'hours'),
    col('resolvedShare', '% resueltas', 'percent'),
  ]
  const data: Row[] = rows.map((row) => ({
    group: group.type === 'month' ? isoDate(row.key) : (labels[groupBy]?.[row.key] ?? row.key),
    total: int(row.total),
    open: int(row.open),
    inProgress: int(row.in_progress),
    resolved: int(row.resolved),
    overdue: int(row.overdue),
    late: int(row.late),
    hours: row.hours === null ? null : round1(Number(row.hours)),
    resolvedShare: percent(int(row.resolved), int(row.total)),
  }))
  const totals = totalsOf(columns, data)
  totals.group = 'Total'
  totals.hours = round1(Number(all.hours))
  totals.resolvedShare = percent(int(all.resolved), int(all.total))
  return { period: rangeText(from, to), summary, columns, rows: data, totals }
}

export const amenities: ReportRunner = async ({ tenant, zone, filters }) => {
  const { from, to } = filters as { from: string; to: string }
  const where = [
    'k.tenant_id = ?',
    `k.booking_type <> 'block'`,
    `${localDay('k.starts_at')} BETWEEN ?::date AND ?::date`,
  ]
  const bindings: unknown[] = [tenant.id, zone, from, to]
  if (filters.amenityId) {
    where.push('k.amenity_id = ?')
    bindings.push(filters.amenityId)
  }
  const base = `FROM amenity_bookings k
     JOIN amenities a ON a.id = k.amenity_id
     LEFT JOIN units u ON u.id = k.unit_id
     LEFT JOIN buildings b ON b.id = u.building_id
    WHERE ${where.join(' AND ')}`
  const hoursOf = `EXTRACT(EPOCH FROM (k.ends_at - k.starts_at)) / 3600`
  const metrics = `COUNT(*) AS requests,
       COUNT(*) FILTER (WHERE k.status = 'approved') AS approved,
       COUNT(*) FILTER (WHERE k.status = 'pending') AS pending,
       COUNT(*) FILTER (WHERE k.status = 'rejected') AS rejected,
       COUNT(*) FILTER (WHERE k.status = 'cancelled') AS cancelled,
       COALESCE(SUM(${hoursOf}) FILTER (WHERE k.status = 'approved'), 0) AS hours,
       COALESCE(SUM(k.fee_amount) FILTER (WHERE k.status = 'approved'), 0) AS revenue,
       COALESCE(SUM(k.deposit_amount) FILTER (WHERE k.deposit_status = 'held'), 0) AS deposits_held,
       COALESCE(SUM(k.deposit_retained) FILTER (WHERE k.deposit_status = 'retained'), 0) AS deposits_retained,
       COUNT(DISTINCT k.unit_id) FILTER (WHERE k.status = 'approved') AS units`
  const [all] = await select(`SELECT ${metrics} ${base}`, bindings)
  const summary = [
    { label: 'Reservas aprobadas', value: int(all.approved), type: 'number' as const },
    { label: 'Horas reservadas', value: round1(Number(all.hours)), type: 'hours' as const },
    { label: 'Ingresos por reservas', value: money(all.revenue), type: 'money' as const },
    {
      label: 'Depósitos en garantía',
      value: money(all.deposits_held),
      type: 'money' as const,
      hint: 'Recibidos y aún sin devolver ni liquidar',
    },
    {
      label: 'Por aprobar',
      value: int(all.pending),
      type: 'number' as const,
      tone: int(all.pending) > 0 ? ('warning' as const) : ('neutral' as const),
    },
  ]
  const groupBy = String(filters.groupBy ?? 'amenity')

  if (groupBy === 'detail') {
    const rows = await select(
      `SELECT k.number, k.starts_at, k.ends_at, a.name AS amenity, k.booking_type, ${UNIT_LABEL} AS unit,
              k.holder_name, ${hoursOf} AS hours, k.status, k.fee_amount, k.deposit_amount, k.deposit_status
         ${base} ORDER BY k.starts_at LIMIT 5001`,
      bindings
    )
    const columns: ReportColumn[] = [
      col('number', 'Reserva', 'number'),
      col('startsAt', 'Inicio', 'datetime'),
      col('amenity', 'Zona'),
      col('type', 'Tipo'),
      col('who', 'Unidad o tercero'),
      col('hours', 'Horas', 'hours'),
      col('status', 'Estado'),
      col('fee', 'Tarifa', 'money'),
      col('deposit', 'Depósito', 'money'),
      col('depositStatus', 'Estado del depósito'),
    ]
    const data: Row[] = rows.map((row) => ({
      number: int(row.number),
      startsAt: DateTime.fromJSDate(row.starts_at).toISO(),
      amenity: row.amenity,
      type: BOOKING_TYPE_LABELS[row.booking_type as BookingType] ?? row.booking_type,
      who: [row.unit || null, row.holder_name].filter(Boolean).join(' · ') || null,
      hours: round1(Number(row.hours)),
      status: BOOKING_STATUS_LABELS[row.status as BookingStatus] ?? row.status,
      fee: money(row.fee_amount),
      deposit: money(row.deposit_amount),
      depositStatus: row.deposit_status
        ? (DEPOSIT_STATUS_LABELS[row.deposit_status as DepositStatus] ?? row.deposit_status)
        : null,
    }))
    return { period: rangeText(from, to), summary, columns, rows: data }
  }

  const groups: Record<string, { expr: string; label: string; type: ReportColumn['type'] }> = {
    amenity: { expr: 'a.name', label: 'Zona', type: 'text' },
    month: {
      expr: `date_trunc('month', k.starts_at AT TIME ZONE ?)::date`,
      label: 'Mes',
      type: 'month',
    },
    unit: {
      expr: `COALESCE(NULLIF(${UNIT_LABEL}, ''), 'Terceros externos')`,
      label: 'Unidad',
      type: 'text',
    },
  }
  const group = groups[groupBy] ?? groups.amenity!
  const rows = await select(
    `SELECT ${group.expr} AS key, ${metrics} ${base} GROUP BY 1 ORDER BY ${group.type === 'month' ? '1' : 'approved DESC, 1'}`,
    groupBy === 'month' ? [zone, ...bindings] : bindings
  )
  const columns: ReportColumn[] = [
    col('group', group.label, group.type),
    col('requests', 'Solicitudes', 'number'),
    col('approved', 'Aprobadas', 'number'),
    col('rejected', 'Rechazadas', 'number'),
    col('cancelled', 'Canceladas', 'number'),
    col('hours', 'Horas reservadas', 'hours'),
    ...(groupBy === 'unit' ? [] : [col('units', 'Unidades', 'number')]),
    col('revenue', 'Ingresos', 'money'),
    col('retained', 'Depósitos retenidos', 'money'),
  ]
  const data: Row[] = rows.map((row) => ({
    group: group.type === 'month' ? isoDate(row.key) : row.key,
    requests: int(row.requests),
    approved: int(row.approved),
    rejected: int(row.rejected),
    cancelled: int(row.cancelled),
    hours: round1(Number(row.hours)),
    units: int(row.units),
    revenue: money(row.revenue),
    retained: money(row.deposits_retained),
  }))
  const totals = totalsOf(columns, data, ['units'])
  totals.group = 'Total'
  totals.hours = round1(Number(all.hours))
  if (groupBy !== 'unit') totals.units = int(all.units)
  return { period: rangeText(from, to), summary, columns, rows: data, totals }
}

export const gatehouse: ReportRunner = async ({ tenant, zone, filters }) => {
  const { from, to } = filters as { from: string; to: string }
  const groupBy = String(filters.groupBy ?? 'day')
  const keyOf = (column: string) =>
    groupBy === 'building'
      ? `COALESCE(b.name, 'Sin torre')`
      : groupBy === 'month'
        ? `date_trunc('month', ${column} AT TIME ZONE ?)::date`
        : localDay(column)
  const zoned = groupBy !== 'building'
  const visits = await select(
    `SELECT ${keyOf('v.checked_in_at')} AS key, COUNT(*) AS visits,
            COUNT(*) FILTER (WHERE v.type = 'guest') AS guests,
            COUNT(*) FILTER (WHERE v.type = 'delivery') AS deliveries,
            COUNT(*) FILTER (WHERE v.type = 'service_provider') AS providers,
            COUNT(*) FILTER (WHERE v.type = 'other') AS others,
            COUNT(*) FILTER (WHERE v.authorized_by_id IS NOT NULL) AS pre_authorized
       FROM visits v JOIN units u ON u.id = v.unit_id LEFT JOIN buildings b ON b.id = u.building_id
      WHERE v.tenant_id = ? AND v.checked_in_at IS NOT NULL
        AND ${localDay('v.checked_in_at')} BETWEEN ?::date AND ?::date
      GROUP BY 1`,
    [...(zoned ? [zone] : []), tenant.id, zone, from, to]
  )
  const parcels = await select(
    `SELECT ${keyOf('p.received_at')} AS key, COUNT(*) AS received,
            COUNT(*) FILTER (WHERE p.status = 'delivered') AS delivered,
            COUNT(*) FILTER (WHERE p.status = 'pending') AS pending,
            COUNT(*) FILTER (WHERE p.status = 'returned') AS returned,
            AVG(EXTRACT(EPOCH FROM (p.delivered_at - p.received_at)) / 3600)
              FILTER (WHERE p.delivered_at IS NOT NULL) AS hours
       FROM parcels p JOIN units u ON u.id = p.unit_id LEFT JOIN buildings b ON b.id = u.building_id
      WHERE p.tenant_id = ? AND ${localDay('p.received_at')} BETWEEN ?::date AND ?::date
      GROUP BY 1`,
    [...(zoned ? [zone] : []), tenant.id, zone, from, to]
  )
  const [pendingNow] = await select(
    `SELECT COUNT(*) AS pending, MIN(received_at) AS oldest FROM parcels WHERE tenant_id = ? AND status = 'pending'`,
    [tenant.id]
  )
  const keyText = (key: unknown) => (zoned ? isoDate(key) : String(key))
  const merged = new Map<string, Row>()
  const blank = (key: string): Row => ({
    group: key,
    visits: 0,
    guests: 0,
    deliveries: 0,
    providers: 0,
    others: 0,
    preAuthorized: 0,
    received: 0,
    delivered: 0,
    pending: 0,
    returned: 0,
    hours: null,
  })
  for (const row of visits) {
    const key = keyText(row.key)
    merged.set(key, {
      ...blank(key),
      visits: int(row.visits),
      guests: int(row.guests),
      deliveries: int(row.deliveries),
      providers: int(row.providers),
      others: int(row.others),
      preAuthorized: int(row.pre_authorized),
    })
  }
  for (const row of parcels) {
    const key = keyText(row.key)
    merged.set(key, {
      ...(merged.get(key) ?? blank(key)),
      received: int(row.received),
      delivered: int(row.delivered),
      pending: int(row.pending),
      returned: int(row.returned),
      hours: row.hours === null ? null : round1(Number(row.hours)),
    })
  }
  const data = [...merged.values()].sort((a, b) =>
    zoned ? String(a.group).localeCompare(String(b.group)) : Number(b.visits) - Number(a.visits)
  )
  const columns: ReportColumn[] = [
    col(
      'group',
      groupBy === 'building' ? 'Torre' : groupBy === 'month' ? 'Mes' : 'Día',
      groupBy === 'building' ? 'text' : groupBy === 'month' ? 'month' : 'date'
    ),
    col('visits', 'Visitas', 'number'),
    col('guests', 'Invitados', 'number'),
    col('deliveries', 'Domicilios', 'number'),
    col('providers', 'Proveedores de servicio', 'number'),
    col('others', 'Otras', 'number'),
    col('preAuthorized', 'Autorizadas desde el portal', 'number'),
    col('received', 'Paquetes recibidos', 'number'),
    col('delivered', 'Entregados', 'number'),
    col('pending', 'Pendientes', 'number'),
    col('returned', 'Devueltos', 'number'),
    col('hours', 'Horas promedio de entrega', 'hours'),
  ]
  const totals = totalsOf(columns, data)
  totals.group = 'Total'
  const deliveredRows = parcels.filter((row) => row.hours !== null)
  const avgHours = deliveredRows.length
    ? deliveredRows.reduce((sum, row) => sum + Number(row.hours) * int(row.delivered), 0) /
      Math.max(
        1,
        deliveredRows.reduce((sum, row) => sum + int(row.delivered), 0)
      )
    : null
  totals.hours = round1(avgHours)
  return {
    period: rangeText(from, to),
    summary: [
      { label: 'Visitas', value: totals.visits, type: 'number' },
      { label: 'Paquetes recibidos', value: totals.received, type: 'number' },
      { label: 'Tiempo promedio de entrega', value: round1(avgHours), type: 'hours' },
      {
        label: 'Paquetes sin entregar hoy',
        value: int(pendingNow.pending),
        type: 'number',
        tone: int(pendingNow.pending) > 0 ? 'warning' : 'good',
        hint: pendingNow.oldest
          ? `El más antiguo llegó el ${DateTime.fromJSDate(pendingNow.oldest).setZone(zone).toFormat('dd/MM/yyyy')}`
          : undefined,
      },
    ],
    columns,
    rows: data,
    totals,
  }
}

export const visitorParking: ReportRunner = async ({ tenant, zone, filters }) => {
  const { from, to } = filters as { from: string; to: string }
  const groupBy = String(filters.groupBy ?? 'day')
  const groups: Record<
    string,
    { expr: string; label: string; type: ReportColumn['type']; zoned?: boolean }
  > = {
    day: { expr: localDay('s.exited_at'), label: 'Día', type: 'date', zoned: true },
    month: {
      expr: `date_trunc('month', s.exited_at AT TIME ZONE ?)::date`,
      label: 'Mes',
      type: 'month',
      zoned: true,
    },
    settlement: { expr: `COALESCE(s.settlement, 'free')`, label: 'Forma de pago', type: 'text' },
    unit: { expr: UNIT_LABEL, label: 'Unidad visitada', type: 'text' },
  }
  const group = groups[groupBy] ?? groups.day!
  const rows = await select(
    `SELECT ${group.expr} AS key, COUNT(*) AS stays, AVG(s.minutes) AS minutes,
            COALESCE(SUM(s.billed_minutes), 0) / 60.0 AS billed_hours,
            COALESCE(SUM(s.amount) FILTER (WHERE s.settlement IN ('gate', 'unit')), 0) AS amount,
            COALESCE(SUM(s.amount) FILTER (WHERE s.settlement = 'gate'), 0) AS gate,
            COALESCE(SUM(s.amount) FILTER (WHERE s.settlement = 'unit'), 0) AS unit_charges,
            COALESCE(SUM(s.vat_amount) FILTER (WHERE s.settlement IN ('gate', 'unit')), 0) AS vat,
            COUNT(*) FILTER (WHERE s.settlement = 'exempt') AS exempt,
            COUNT(*) FILTER (WHERE s.over_capacity) AS over_capacity
       FROM parking_stays s JOIN units u ON u.id = s.unit_id LEFT JOIN buildings b ON b.id = u.building_id
      WHERE s.tenant_id = ? AND s.status = 'exited' AND ${localDay('s.exited_at')} BETWEEN ?::date AND ?::date
      GROUP BY 1 ORDER BY ${group.zoned ? '1' : 'stays DESC'}`,
    [...(group.zoned ? [zone] : []), tenant.id, zone, from, to]
  )
  const [inside] = await select(
    `SELECT COUNT(*) AS inside FROM parking_stays WHERE tenant_id = ? AND status = 'inside'`,
    [tenant.id]
  )
  const columns: ReportColumn[] = [
    col('group', group.label, group.type),
    col('stays', 'Vehículos', 'number'),
    col('hours', 'Permanencia promedio (horas)', 'hours'),
    col('billedHours', 'Horas cobradas', 'hours'),
    col('gate', 'Pagado en portería', 'money'),
    col('unitCharges', 'Cargado a la unidad', 'money'),
    col('amount', 'Total cobrado', 'money'),
    col('vat', 'IVA incluido', 'money'),
    col('exempt', 'Exonerados', 'number'),
    col('overCapacity', 'Ingresos sin cupo', 'number'),
  ]
  const totalStays = rows.reduce((sum, row) => sum + int(row.stays), 0)
  const data: Row[] = rows.map((row) => ({
    group:
      group.type === 'text'
        ? groupBy === 'settlement'
          ? (PARKING_SETTLEMENT_LABELS[row.key as ParkingSettlement] ?? row.key)
          : row.key
        : isoDate(row.key),
    stays: int(row.stays),
    hours: row.minutes === null ? null : round1(Number(row.minutes) / 60),
    billedHours: round1(Number(row.billed_hours)),
    gate: money(row.gate),
    unitCharges: money(row.unit_charges),
    amount: money(row.amount),
    vat: money(row.vat),
    exempt: int(row.exempt),
    overCapacity: int(row.over_capacity),
  }))
  const totals = totalsOf(columns, data)
  totals.group = 'Total'
  totals.billedHours = round1(rows.reduce((sum, row) => sum + Number(row.billed_hours), 0))
  totals.hours = totalStays
    ? round1(
        rows.reduce((sum, row) => sum + Number(row.minutes ?? 0) * int(row.stays), 0) /
          totalStays /
          60
      )
    : null
  return {
    period: rangeText(from, to),
    summary: [
      { label: 'Vehículos atendidos', value: totalStays, type: 'number' },
      { label: 'Total cobrado', value: totals.amount, type: 'money' },
      {
        label: 'Pagado en portería',
        value: totals.gate,
        type: 'money',
        hint: 'Efectivo o transferencia recibidos por los vigilantes',
      },
      {
        label: 'Exonerados',
        value: totals.exempt,
        type: 'number',
        tone: Number(totals.exempt) > 0 ? 'warning' : 'neutral',
      },
      { label: 'Dentro ahora', value: int(inside.inside), type: 'number' },
    ],
    columns,
    rows: data,
    totals,
    notes: ['Se cuentan los vehículos por la fecha de salida.'],
  }
}

export const announcements: ReportRunner = async ({ tenant, zone, filters }) => {
  const { from, to } = filters as { from: string; to: string }
  const start = DateTime.fromISO(from, { zone }).startOf('day')
  const end = DateTime.fromISO(to, { zone }).endOf('day')
  const list = await Announcement.query()
    .where('tenant_id', tenant.id)
    .whereNull('deleted_at')
    .whereNotNull('published_at')
    .where('published_at', '>=', start.toISO()!)
    .where('published_at', '<=', DateTime.min(end, DateTime.now())!.toISO()!)
    .preload('buildings')
    .orderBy('published_at', 'desc')
    .limit(5001)
  const stats = await new AnnouncementsService(tenant).readStats(list)
  const columns: ReportColumn[] = [
    col('publishedAt', 'Publicado', 'datetime'),
    col('title', 'Comunicado'),
    col('audience', 'Audiencia'),
    col('recipients', 'Destinatarios', 'number'),
    col('read', 'Lo leyeron', 'number'),
    col('readShare', '% de lectura', 'percent'),
    col('emails', 'Correos enviados', 'number'),
  ]
  const data: Row[] = list.map((item) => {
    const stat = stats.get(item.id) ?? { read: 0, total: 0 }
    const buildings = ((item.$preloaded.buildings ?? []) as unknown as Array<{ name: string }>).map(
      (building) => building.name
    )
    const audience =
      ANNOUNCEMENT_AUDIENCE_LABELS[item.audience as AnnouncementAudience] ?? item.audience
    return {
      publishedAt: item.publishedAt!.toISO(),
      title: item.title,
      audience: buildings.length ? `${audience} · ${buildings.join(', ')}` : audience,
      recipients: stat.total,
      read: stat.read,
      readShare: percent(stat.read, stat.total),
      emails: item.emailCount ?? 0,
    }
  })
  const recipients = data.reduce((sum, row) => sum + Number(row.recipients), 0)
  const read = data.reduce((sum, row) => sum + Number(row.read), 0)
  const totals = totalsOf(columns, data)
  totals.publishedAt = null
  totals.title = 'Total'
  totals.readShare = percent(read, recipients)
  return {
    period: rangeText(from, to),
    summary: [
      { label: 'Comunicados publicados', value: data.length, type: 'number' },
      { label: 'Lectura promedio', value: percent(read, recipients), type: 'percent' },
      { label: 'Correos enviados', value: totals.emails, type: 'number' },
    ],
    columns,
    rows: data,
    totals,
    notes: [
      'Los destinatarios son las personas que hoy pertenecen a la audiencia de cada comunicado.',
    ],
  }
}

export const surveys: ReportRunner = async ({ tenant, zone, filters }) => {
  const { from, to } = filters as { from: string; to: string }
  const start = DateTime.fromISO(from, { zone }).startOf('day')
  const end = DateTime.fromISO(to, { zone }).endOf('day')
  const list = await Survey.query()
    .where('tenant_id', tenant.id)
    .whereNotNull('published_at')
    .where('published_at', '>=', start.toISO()!)
    .where('published_at', '<=', end.toISO()!)
    .orderBy('published_at', 'desc')
    .limit(5001)
  const participation = await new SurveysService(tenant).participation(list)
  const columns: ReportColumn[] = [
    col('title', 'Encuesta'),
    col('status', 'Estado'),
    col('opensAt', 'Abrió', 'datetime'),
    col('closesAt', 'Cierra', 'datetime'),
    col('eligible', 'Unidades que votan', 'number'),
    col('voted', 'Respondieron', 'number'),
    col('unitShare', '% de unidades', 'percent'),
    col('coefficientShare', '% del coeficiente', 'percent'),
    col('minimum', 'Participación mínima', 'percent'),
    col('reached', '¿La alcanzó?'),
  ]
  const now = DateTime.now()
  const data: Row[] = list.map((survey) => {
    const row = participation.get(survey.id)
    const coefficientShare = row ? percent(row.votedCoefficient, row.totalCoefficient) : null
    return {
      title: survey.title,
      status: survey.closesAt > now ? 'Abierta' : 'Cerrada',
      opensAt: (survey.opensAt ?? survey.publishedAt)?.toISO() ?? null,
      closesAt: survey.closesAt.toISO(),
      eligible: row?.eligibleUnits ?? 0,
      voted: row?.votedUnits ?? 0,
      unitShare: row ? percent(row.votedUnits, row.eligibleUnits) : null,
      coefficientShare,
      minimum: row?.minParticipation ?? null,
      reached: row?.minParticipation === null || !row ? 'Sin mínimo' : row.reached ? 'Sí' : 'No',
    }
  })
  return {
    period: rangeText(from, to),
    summary: [
      { label: 'Encuestas publicadas', value: data.length, type: 'number' },
      {
        label: 'Participación promedio (coeficiente)',
        value: data.length
          ? round1(
              data.reduce((sum, row) => sum + Number(row.coefficientShare ?? 0), 0) / data.length
            )
          : null,
        type: 'percent',
      },
      {
        label: 'No alcanzaron el mínimo',
        value: data.filter((row) => row.reached === 'No').length,
        type: 'number',
      },
    ],
    columns,
    rows: data,
    notes: ['Las unidades que votan son las de hoy con coeficiente mayor que cero.'],
  }
}

export const documentAccess: ReportRunner = async ({ tenant, zone, filters }) => {
  const { from, to } = filters as { from: string; to: string }
  const base = `FROM document_access_logs l
     JOIN documents d ON d.id = l.document_id
     LEFT JOIN users usr ON usr.id = l.user_id
    WHERE l.tenant_id = ? AND ${localDay('l.created_at')} BETWEEN ?::date AND ?::date`
  const bindings = [tenant.id, zone, from, to]
  const [all] = await select(
    `SELECT COUNT(*) FILTER (WHERE l.action = 'view') AS views,
            COUNT(*) FILTER (WHERE l.action = 'download') AS downloads,
            COUNT(DISTINCT l.user_id) AS people, COUNT(DISTINCT l.document_id) AS documents ${base}`,
    bindings
  )
  const summary = [
    { label: 'Consultas', value: int(all.views), type: 'number' as const },
    { label: 'Descargas', value: int(all.downloads), type: 'number' as const },
    { label: 'Personas', value: int(all.people), type: 'number' as const },
    { label: 'Documentos consultados', value: int(all.documents), type: 'number' as const },
  ]
  const groupBy = String(filters.groupBy ?? 'document')
  if (groupBy === 'detail') {
    const rows = await select(
      `SELECT l.created_at, d.title, d.category, usr.full_name, usr.email, l.action
         ${base} ORDER BY l.created_at DESC LIMIT 5001`,
      bindings
    )
    const columns: ReportColumn[] = [
      col('at', 'Fecha y hora', 'datetime'),
      col('document', 'Documento'),
      col('category', 'Tipo'),
      col('person', 'Persona'),
      col('email', 'Correo'),
      col('action', 'Acción'),
    ]
    const data: Row[] = rows.map((row) => ({
      at: DateTime.fromJSDate(row.created_at).toISO(),
      document: row.title,
      category: DOCUMENT_CATEGORY_LABELS[row.category as DocumentCategory] ?? row.category,
      person: row.full_name ?? 'Cuenta eliminada',
      email: row.email,
      action: row.action === 'download' ? 'Descargó' : 'Abrió',
    }))
    return { period: rangeText(from, to), summary, columns, rows: data }
  }
  const byUser = groupBy === 'user'
  const rows = await select(
    `SELECT ${byUser ? `COALESCE(usr.full_name, 'Cuenta eliminada') AS key, usr.email AS extra` : 'd.title AS key, d.category AS extra'},
            COUNT(*) FILTER (WHERE l.action = 'view') AS views,
            COUNT(*) FILTER (WHERE l.action = 'download') AS downloads,
            COUNT(DISTINCT ${byUser ? 'l.document_id' : 'l.user_id'}) AS distinct_count,
            MAX(l.created_at) AS last_at
       ${base}
      GROUP BY ${byUser ? 'usr.id' : 'd.id'}
      ORDER BY COUNT(*) DESC`,
    bindings
  )
  const columns: ReportColumn[] = [
    col('group', byUser ? 'Persona' : 'Documento'),
    col('extra', byUser ? 'Correo' : 'Tipo'),
    col('views', 'Consultas', 'number'),
    col('downloads', 'Descargas', 'number'),
    col('distinct', byUser ? 'Documentos' : 'Personas', 'number'),
    col('lastAt', 'Último acceso', 'datetime'),
  ]
  const data: Row[] = rows.map((row) => ({
    group: row.key,
    extra: byUser
      ? row.extra
      : (DOCUMENT_CATEGORY_LABELS[row.extra as DocumentCategory] ?? row.extra),
    views: int(row.views),
    downloads: int(row.downloads),
    distinct: int(row.distinct_count),
    lastAt: DateTime.fromJSDate(row.last_at).toISO(),
  }))
  const totals = totalsOf(columns, data, ['distinct'])
  return { period: rangeText(from, to), summary, columns, rows: data, totals }
}
