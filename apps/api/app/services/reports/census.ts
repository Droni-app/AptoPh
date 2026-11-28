import { DateTime } from 'luxon'
import {
  ENROLLMENT_STATUS_LABELS,
  ROLE_LABELS,
  UNIT_STATUS_LABELS,
  UNIT_TYPE_LABELS,
  VEHICLE_TYPE_LABELS,
  type EnrollmentRole,
  type EnrollmentStatus,
  type ReportCell,
  type ReportColumn,
  type UnitStatus,
  type UnitType,
  type VehicleType,
} from '@aptoph/shared'
import type { ReportRunner } from '#services/reports/engine'
import {
  col,
  int,
  isoDate,
  money,
  percent,
  select,
  sumMoney,
  totalsOf,
  UNIT_LABEL,
} from '#services/reports/support'

type Row = Record<string, ReportCell>

/** Occupants in effect today */
const CURRENT = `(o.starts_on IS NULL OR o.starts_on <= ?::date) AND (o.ends_on IS NULL OR o.ends_on >= ?::date)`

export const census: ReportRunner = async ({ tenant, today, filters }) => {
  const where = ['u.tenant_id = ?', 'u.deleted_at IS NULL']
  const bindings: unknown[] = [tenant.id]
  if (filters.buildingId) {
    where.push('u.building_id = ?')
    bindings.push(filters.buildingId)
  }
  if (filters.unitType) {
    where.push('u.type = ?')
    bindings.push(filters.unitType)
  }
  if (filters.status) {
    where.push('u.status = ?')
    bindings.push(filters.status)
  }
  const rows = await select(
    `WITH people AS (
       SELECT o.unit_id,
              string_agg(o.full_name, ', ' ORDER BY o.full_name) FILTER (WHERE o.relationship = 'owner') AS owners,
              string_agg(o.full_name, ', ' ORDER BY o.full_name) FILTER (WHERE o.relationship = 'renter') AS renters,
              COUNT(*) AS occupants,
              COUNT(*) FILTER (WHERE o.relationship = 'owner') AS owner_count,
              COUNT(o.user_id) AS accounts,
              COUNT(*) FILTER (WHERE o.phone IS NOT NULL OR o.email IS NOT NULL) AS contacts
         FROM unit_occupants o
        WHERE o.tenant_id = ? AND ${CURRENT}
        GROUP BY o.unit_id
     )
     SELECT u.id, ${UNIT_LABEL} AS unit, u.type, u.floor, u.ownership_coefficient, u.private_area, u.status,
            parent.code AS parent_code, p.owners, p.renters, COALESCE(p.occupants, 0) AS occupants,
            COALESCE(p.owner_count, 0) AS owner_count, COALESCE(p.accounts, 0) AS accounts,
            COALESCE(p.contacts, 0) AS contacts,
            (SELECT COUNT(*) FROM vehicles v WHERE v.unit_id = u.id AND v.deleted_at IS NULL) AS vehicles,
            (SELECT COUNT(*) FROM pets x WHERE x.unit_id = u.id AND x.deleted_at IS NULL) AS pets
       FROM units u
       LEFT JOIN buildings b ON b.id = u.building_id
       LEFT JOIN units parent ON parent.id = u.parent_unit_id
       LEFT JOIN people p ON p.unit_id = u.id
      WHERE ${where.join(' AND ')}
      ORDER BY b.sort_order NULLS FIRST, b.name NULLS FIRST, length(u.code), u.code`,
    [tenant.id, today, today, ...bindings]
  )
  // Annexes (parking, storage) have no people of their own: they follow their unit
  const annex = (row: Record<string, any>) => Boolean(row.parent_code)
  const issue = filters.issue
  const filtered = rows.filter((row) => {
    if (issue === 'no_owner') return !annex(row) && int(row.owner_count) === 0
    if (issue === 'no_contact') return !annex(row) && int(row.contacts) === 0
    if (issue === 'no_account') return !annex(row) && int(row.accounts) === 0
    if (issue === 'no_coefficient') return Number(row.ownership_coefficient) === 0
    return true
  })
  const columns: ReportColumn[] = [
    col('unit', 'Unidad'),
    col('type', 'Tipo'),
    col('floor', 'Piso', 'number'),
    col('coefficient', 'Coeficiente', 'number'),
    col('area', 'Área privada (m²)', 'number'),
    col('status', 'Estado'),
    col('owners', 'Propietarios'),
    col('renters', 'Arrendatarios'),
    col('occupants', 'Personas', 'number'),
    col('accounts', 'Con cuenta en el portal', 'number'),
    col('vehicles', 'Vehículos', 'number'),
    col('pets', 'Mascotas', 'number'),
    col('annexOf', 'Anexo de'),
  ]
  const data: Row[] = filtered.map((row) => ({
    _unitId: row.id,
    unit: row.unit,
    type: UNIT_TYPE_LABELS[row.type as UnitType] ?? row.type,
    floor: row.floor === null ? null : int(row.floor),
    coefficient: Number(row.ownership_coefficient),
    area: row.private_area === null ? null : Number(row.private_area),
    status: UNIT_STATUS_LABELS[row.status as UnitStatus] ?? row.status,
    owners: row.owners,
    renters: row.renters,
    occupants: int(row.occupants),
    accounts: int(row.accounts),
    vehicles: int(row.vehicles),
    pets: int(row.pets),
    annexOf: row.parent_code,
  }))
  const totals = totalsOf(columns, data, ['floor'])
  totals.coefficient =
    Math.round(data.reduce((sum, row) => sum + Number(row.coefficient), 0) * 1e6) / 1e6
  totals.area = Math.round(data.reduce((sum, row) => sum + Number(row.area ?? 0), 0) * 100) / 100

  // The check is over every unit of the conjunto, whatever the filters
  const coefficient = rows.reduce((sum, row) => sum + Number(row.ownership_coefficient), 0)
  const notes: string[] = []
  const filteredView = Boolean(filters.buildingId || filters.unitType || filters.status || issue)
  if (!filteredView && rows.length) {
    const closeTo = (target: number, tolerance: number) =>
      Math.abs(coefficient - target) <= tolerance
    if (!closeTo(1, 0.0001) && !closeTo(100, 0.01)) {
      notes.push(
        `Los coeficientes suman ${coefficient.toLocaleString('es-CO', { maximumFractionDigits: 6 })}: deberían sumar 1 (100 %). Revísalos antes de facturar o votar.`
      )
    }
  }
  const main = rows.filter((row) => !annex(row))
  return {
    summary: [
      { label: 'Unidades', value: rows.length, type: 'number' },
      {
        label: 'Suma de coeficientes',
        value: Math.round(coefficient * 1e6) / 1e6,
        type: 'number',
        tone: notes.length ? 'danger' : 'good',
      },
      {
        label: 'Sin propietario registrado',
        value: main.filter((row) => int(row.owner_count) === 0).length,
        type: 'number',
        tone: main.some((row) => int(row.owner_count) === 0) ? 'warning' : 'good',
      },
      {
        label: 'Sin datos de contacto',
        value: main.filter((row) => int(row.contacts) === 0).length,
        type: 'number',
      },
      {
        label: 'Unidades con alguien en el portal',
        value: percent(main.filter((row) => int(row.accounts) > 0).length, main.length),
        type: 'percent',
      },
    ],
    columns,
    rows: data,
    totals,
    notes: [
      ...notes,
      'Los anexos (parqueaderos y depósitos de una unidad) no cuentan para los datos de personas.',
    ],
    rowLink: { route: 'unit', params: { id: '_unitId' } },
  }
}

export const vehicles: ReportRunner = async ({ tenant, today, filters }) => {
  const where = ['v.tenant_id = ?', 'v.deleted_at IS NULL']
  const bindings: unknown[] = [tenant.id]
  if (filters.buildingId) {
    where.push('u.building_id = ?')
    bindings.push(filters.buildingId)
  }
  if (filters.type) {
    where.push('v.type = ?')
    bindings.push(filters.type)
  }
  const soon = DateTime.fromISO(today).plus({ days: 30 }).toISODate()!
  const documents = String(filters.documents ?? 'all')
  if (documents === 'expired') {
    where.push('(v.soat_expires_on < ?::date OR v.inspection_expires_on < ?::date)')
    bindings.push(today, today)
  } else if (documents === 'expiring') {
    where.push(
      '(v.soat_expires_on BETWEEN ?::date AND ?::date OR v.inspection_expires_on BETWEEN ?::date AND ?::date)'
    )
    bindings.push(today, soon, today, soon)
  } else if (documents === 'missing') {
    where.push(
      `v.type IN ('car', 'motorcycle') AND (v.soat_expires_on IS NULL OR v.inspection_expires_on IS NULL)`
    )
  }
  const rows = await select(
    `SELECT v.plate, v.type, v.brand, v.model, v.color, ${UNIT_LABEL} AS unit, u.id AS unit_id, v.owner_type, v.owner_name,
            v.soat_expires_on, v.inspection_expires_on,
            (SELECT s.code FROM parking_assignments a JOIN parking_spots s ON s.id = a.spot_id
              WHERE a.vehicle_id = v.id AND a.status = 'active' LIMIT 1) AS spot
       FROM vehicles v JOIN units u ON u.id = v.unit_id LEFT JOIN buildings b ON b.id = u.building_id
      WHERE ${where.join(' AND ')}
      ORDER BY b.name NULLS FIRST, length(u.code), u.code, v.plate`,
    bindings
  )
  const state = (date: unknown) => {
    if (!date) return 'Sin fecha'
    const iso = isoDate(date)
    if (iso < today) return 'Vencido'
    if (iso <= soon) return 'Por vencer'
    return 'Al día'
  }
  const columns: ReportColumn[] = [
    col('plate', 'Placa'),
    col('type', 'Tipo'),
    col('description', 'Vehículo'),
    col('unit', 'Unidad'),
    col('owner', 'Propietario'),
    col('spot', 'Parqueadero asignado'),
    col('soat', 'SOAT vence', 'date'),
    col('soatState', 'SOAT'),
    col('inspection', 'Revisión vence', 'date'),
    col('inspectionState', 'Revisión técnico-mecánica'),
  ]
  const data: Row[] = rows.map((row) => ({
    _unitId: row.unit_id,
    plate: row.plate,
    type: VEHICLE_TYPE_LABELS[row.type as VehicleType] ?? row.type,
    description: [row.brand, row.model, row.color].filter(Boolean).join(' ') || null,
    unit: row.unit,
    owner:
      row.owner_type === 'third_party' ? `${row.owner_name ?? 'Tercero'} (tercero)` : 'Residente',
    spot: row.spot,
    soat: row.soat_expires_on ? isoDate(row.soat_expires_on) : null,
    soatState: row.type === 'bicycle' ? null : state(row.soat_expires_on),
    inspection: row.inspection_expires_on ? isoDate(row.inspection_expires_on) : null,
    inspectionState: row.type === 'bicycle' ? null : state(row.inspection_expires_on),
  }))
  const count = (value: string) =>
    data.filter((row) => row.soatState === value || row.inspectionState === value).length
  return {
    summary: [
      { label: 'Vehículos', value: data.length, type: 'number' },
      {
        label: 'Con documentos vencidos',
        value: count('Vencido'),
        type: 'number',
        tone: count('Vencido') ? 'danger' : 'good',
      },
      {
        label: 'Vencen en 30 días',
        value: count('Por vencer'),
        type: 'number',
        tone: count('Por vencer') ? 'warning' : 'neutral',
      },
      { label: 'Sin fechas registradas', value: count('Sin fecha'), type: 'number' },
    ],
    columns,
    rows: data,
    rowLink: { route: 'unit', params: { id: '_unitId' } },
    notes: ['Las bicicletas no requieren SOAT ni revisión técnico-mecánica.'],
  }
}

export const parking: ReportRunner = async ({ tenant, filters }) => {
  const where = ['s.tenant_id = ?', 's.deleted_at IS NULL']
  const bindings: unknown[] = [tenant.id]
  if (filters.vehicleType) {
    where.push('s.vehicle_type = ?')
    bindings.push(filters.vehicleType)
  }
  if (filters.ownership) {
    where.push('s.ownership = ?')
    bindings.push(filters.ownership)
  }
  const rows = await select(
    `SELECT s.code, s.vehicle_type, s.ownership, s.is_covered, s.is_active, s.location,
            (SELECT concat_ws(' · ', ob.name, ou.code) FROM units ou LEFT JOIN buildings ob ON ob.id = ou.building_id
              WHERE ou.id = s.owner_unit_id) AS owner_unit,
            a.starts_on, a.ends_on, a.monthly_rate, ${UNIT_LABEL} AS assigned_unit, v.plate
       FROM parking_spots s
       LEFT JOIN parking_assignments a ON a.spot_id = s.id AND a.status = 'active'
       LEFT JOIN units u ON u.id = a.unit_id
       LEFT JOIN buildings b ON b.id = u.building_id
       LEFT JOIN vehicles v ON v.id = a.vehicle_id
      WHERE ${where.join(' AND ')}
      ORDER BY s.ownership, length(s.code), s.code`,
    bindings
  )
  const stateOf = (row: Record<string, any>) =>
    !row.is_active
      ? 'inactive'
      : row.ownership === 'private' || row.assigned_unit
        ? 'assigned'
        : 'free'
  const filtered = filters.state ? rows.filter((row) => stateOf(row) === filters.state) : rows
  const columns: ReportColumn[] = [
    col('code', 'Parqueadero'),
    col('type', 'Tipo'),
    col('ownership', 'Propiedad'),
    col('covered', 'Cubierto'),
    col('location', 'Ubicación'),
    col('state', 'Estado'),
    col('unit', 'Unidad'),
    col('plate', 'Placa'),
    col('since', 'Desde', 'date'),
    col('until', 'Hasta', 'date'),
    col('rate', 'Tarifa mensual', 'money'),
  ]
  const stateLabels = {
    assigned: 'Asignado',
    free: 'Libre',
    inactive: 'Fuera de servicio',
  } as const
  const data: Row[] = filtered.map((row) => ({
    code: row.code,
    type: VEHICLE_TYPE_LABELS[row.vehicle_type as VehicleType] ?? row.vehicle_type,
    ownership: row.ownership === 'private' ? 'Propio' : 'Comunal',
    covered: row.is_covered ? 'Sí' : 'No',
    location: row.location,
    state:
      row.ownership === 'private' && row.is_active ? 'De la unidad' : stateLabels[stateOf(row)],
    unit: row.ownership === 'private' ? row.owner_unit : row.assigned_unit || null,
    plate: row.plate,
    since: row.starts_on ? isoDate(row.starts_on) : null,
    until: row.ends_on ? isoDate(row.ends_on) : null,
    rate: row.monthly_rate === null ? null : money(row.monthly_rate),
  }))
  const communal = rows.filter((row) => row.ownership === 'communal' && row.is_active)
  const assigned = communal.filter((row) => row.assigned_unit)
  return {
    summary: [
      { label: 'Parqueaderos', value: rows.length, type: 'number' },
      { label: 'Comunales activos', value: communal.length, type: 'number' },
      {
        label: 'Comunales asignados',
        value: percent(assigned.length, communal.length),
        type: 'percent',
      },
      { label: 'Comunales libres', value: communal.length - assigned.length, type: 'number' },
      {
        label: 'Recaudo mensual por cupos',
        value: sumMoney(
          assigned.map((row) => ({
            rate: row.monthly_rate === null ? '0' : money(row.monthly_rate),
          })),
          'rate'
        ),
        type: 'money',
      },
    ],
    columns,
    rows: data,
    totals: {
      ...Object.fromEntries(columns.map((column) => [column.key, null])),
      code: 'Total',
      rate: sumMoney(data, 'rate'),
    },
  }
}

export const membersAccess: ReportRunner = async ({ tenant, filters }) => {
  const where = ['e.tenant_id = ?', `e.role <> 'resident'`]
  const bindings: unknown[] = [tenant.id]
  if (filters.role) {
    where.push('e.role = ?')
    bindings.push(filters.role)
  }
  if (filters.status) {
    where.push('e.status = ?')
    bindings.push(filters.status)
  }
  const rows = await select(
    `SELECT usr.full_name, usr.email, e.role, e.title, e.status, e.starts_on, e.ends_on, e.accepted_at,
            e.created_at, inviter.full_name AS invited_by,
            (SELECT MAX(t.last_used_at) FROM auth_access_tokens t WHERE t.tokenable_id = usr.id) AS last_used_at
       FROM enrollments e
       JOIN users usr ON usr.id = e.user_id
       LEFT JOIN users inviter ON inviter.id = e.invited_by_id
      WHERE ${where.join(' AND ')}
      ORDER BY e.status = 'active' DESC, e.role, usr.full_name`,
    bindings
  )
  const columns: ReportColumn[] = [
    col('name', 'Persona'),
    col('email', 'Correo'),
    col('role', 'Rol'),
    col('title', 'Cargo'),
    col('status', 'Estado'),
    col('startsOn', 'Desde', 'date'),
    col('endsOn', 'Hasta', 'date'),
    col('invitedBy', 'Invitado por'),
    col('acceptedAt', 'Aceptó', 'datetime'),
    col('lastUsedAt', 'Última actividad', 'datetime'),
  ]
  const iso = (value: unknown) => (value ? DateTime.fromJSDate(value as Date).toISO() : null)
  const data: Row[] = rows.map((row) => ({
    name: row.full_name,
    email: row.email,
    role: ROLE_LABELS[row.role as EnrollmentRole] ?? row.role,
    title: row.title,
    status: ENROLLMENT_STATUS_LABELS[row.status as EnrollmentStatus] ?? row.status,
    startsOn: row.starts_on ? isoDate(row.starts_on) : null,
    endsOn: row.ends_on ? isoDate(row.ends_on) : null,
    invitedBy: row.invited_by,
    acceptedAt: iso(row.accepted_at),
    lastUsedAt: iso(row.last_used_at),
  }))
  const active = rows.filter((row) => row.status === 'active')
  const idle = active.filter(
    (row) =>
      !row.last_used_at ||
      DateTime.fromJSDate(row.last_used_at) < DateTime.now().minus({ days: 90 })
  )
  const expired = active.filter(
    (row) => row.ends_on && isoDate(row.ends_on) < DateTime.now().toISODate()!
  )
  return {
    summary: [
      { label: 'Accesos activos', value: active.length, type: 'number' },
      {
        label: 'Invitaciones pendientes',
        value: rows.filter((row) => row.status === 'invited').length,
        type: 'number',
      },
      {
        label: 'Sin actividad en 90 días',
        value: idle.length,
        type: 'number',
        tone: idle.length ? 'warning' : 'good',
        hint: 'Accesos activos que nadie usa: considera revocarlos',
      },
      {
        label: 'Activos con vigencia vencida',
        value: expired.length,
        type: 'number',
        tone: expired.length ? 'danger' : 'good',
      },
    ],
    columns,
    rows: data,
    notes: ['La última actividad es la de la cuenta en AptoPH (cualquier conjunto o app).'],
  }
}
