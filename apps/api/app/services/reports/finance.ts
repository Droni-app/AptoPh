import {
  ADJUSTMENT_KIND_LABELS,
  addMonths,
  BILL_STATUS_LABELS,
  fromCents,
  JOURNAL_ENTRY_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  toCents,
  VENDOR_PAYMENT_STATUS_LABELS,
  type AdjustmentKind,
  type BillStatus,
  type JournalEntryType,
  type PaymentMethod,
  type ReportCell,
  type ReportColumn,
  type VendorPaymentStatus,
} from '@aptoph/shared'
import type { ReportRunner } from '#services/reports/engine'
import {
  col,
  int,
  isoDate,
  localDay,
  money,
  monthRangeText,
  percent,
  rangeText,
  RESPONSIBLE,
  select,
  sumMoney,
  sumNumber,
  totalsOf,
  UNIT_LABEL,
} from '#services/reports/support'

type Row = Record<string, ReportCell>

/** Last day of the month of "2026-11-01" */
const monthEnd = (month: string) => {
  const next = addMonths(month, 1)
  const date = new Date(`${next}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() - 1)
  return date.toISOString().slice(0, 10)
}

const statementLink = { route: 'finance-statement', params: { unitId: '_unitId' } }

/** Recaudo: confirmed payments by receipt or grouped */
export const collections: ReportRunner = async ({ tenant, zone, filters }) => {
  const { from, to } = filters as { from: string; to: string }
  const where = [
    `p.tenant_id = ?`,
    `p.status = 'confirmed'`,
    `${localDay('p.paid_at')} BETWEEN ?::date AND ?::date`,
  ]
  const bindings: unknown[] = [tenant.id, zone, from, to]
  if (filters.cashAccountId) {
    where.push('p.cash_account_id = ?')
    bindings.push(filters.cashAccountId)
  }
  if (filters.method) {
    where.push('p.method = ?')
    bindings.push(filters.method)
  }
  if (filters.buildingId) {
    where.push('u.building_id = ?')
    bindings.push(filters.buildingId)
  }
  const base = `FROM payments p
     JOIN units u ON u.id = p.unit_id
     LEFT JOIN buildings b ON b.id = u.building_id
     LEFT JOIN cash_accounts c ON c.id = p.cash_account_id
    WHERE ${where.join(' AND ')}`

  const [totals] = await select(
    `SELECT COUNT(*) AS count, COALESCE(SUM(p.amount), 0) AS amount,
            COALESCE(SUM(p.unapplied_amount), 0) AS unapplied ${base}`,
    bindings
  )
  const [pending] = await select(
    `SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS amount FROM payments
      WHERE tenant_id = ? AND status = 'pending_review'`,
    [tenant.id]
  )
  const total = toCents(totals.amount)
  const count = int(totals.count)
  const summary = [
    { label: 'Recaudado', value: money(totals.amount), type: 'money' as const },
    { label: 'Recibos', value: count, type: 'number' as const },
    {
      label: 'Promedio por recibo',
      value: count ? fromCents(Math.round(total / count)) : null,
      type: 'money' as const,
    },
    {
      label: 'Quedó como saldo a favor',
      value: money(totals.unapplied),
      type: 'money' as const,
      hint: 'Parte de los pagos que no cubrió cobros y queda para los siguientes',
    },
    {
      label: 'Pagos por revisar',
      value: int(pending.count),
      type: 'number' as const,
      hint: `Reportados por los residentes y sin confirmar: ${money(pending.amount)}`,
      tone: int(pending.count) > 0 ? ('warning' as const) : ('neutral' as const),
    },
  ]

  const groupBy = String(filters.groupBy ?? 'detail')
  if (groupBy === 'detail') {
    const rows = await select(
      `SELECT ${localDay('p.paid_at')} AS day, p.number, ${UNIT_LABEL} AS unit, u.id AS unit_id,
              p.method, c.name AS cash_account, p.reference, p.amount, p.unapplied_amount
         ${base}
        ORDER BY p.paid_at, p.number LIMIT 5001`,
      [zone, ...bindings]
    )
    const columns: ReportColumn[] = [
      col('date', 'Fecha', 'date'),
      col('number', 'Recibo', 'number'),
      col('unit', 'Unidad'),
      col('method', 'Medio de pago'),
      col('cashAccount', 'Cuenta'),
      col('reference', 'Referencia'),
      col('amount', 'Valor', 'money'),
      col('unapplied', 'Saldo a favor', 'money'),
    ]
    const data: Row[] = rows.map((row) => ({
      _unitId: row.unit_id,
      date: isoDate(row.day),
      number: row.number === null ? null : int(row.number),
      unit: row.unit,
      method: PAYMENT_METHOD_LABELS[row.method as PaymentMethod] ?? row.method,
      cashAccount: row.cash_account,
      reference: row.reference,
      amount: money(row.amount),
      unapplied: money(row.unapplied_amount),
    }))
    const sums = totalsOf(columns, data, ['number'])
    return {
      period: rangeText(from, to),
      summary,
      columns,
      rows: data,
      totals: { ...sums, amount: money(totals.amount), unapplied: money(totals.unapplied) },
      rowLink: statementLink,
    }
  }

  const groups: Record<string, { expr: string; label: string; type: ReportColumn['type'] }> = {
    day: { expr: localDay('p.paid_at'), label: 'Día', type: 'date' },
    month: {
      expr: `date_trunc('month', p.paid_at AT TIME ZONE ?)::date`,
      label: 'Mes',
      type: 'month',
    },
    cash_account: { expr: `COALESCE(c.name, 'Sin cuenta')`, label: 'Cuenta', type: 'text' },
    method: { expr: 'p.method', label: 'Medio de pago', type: 'text' },
    building: { expr: `COALESCE(b.name, 'Sin torre')`, label: 'Torre', type: 'text' },
  }
  const group = groups[groupBy] ?? groups.day!
  const zoned = groupBy === 'day' || groupBy === 'month'
  const rows = await select(
    `SELECT ${group.expr} AS key, COUNT(*) AS count, SUM(p.amount) AS amount,
            SUM(p.unapplied_amount) AS unapplied, COUNT(DISTINCT p.unit_id) AS units
       ${base}
      GROUP BY 1 ORDER BY ${zoned ? '1' : 'SUM(p.amount) DESC'}`,
    zoned ? [zone, ...bindings] : bindings
  )
  const columns: ReportColumn[] = [
    col('group', group.label, group.type),
    col('count', 'Recibos', 'number'),
    col('units', 'Unidades', 'number'),
    col('amount', 'Recaudado', 'money'),
    col('unapplied', 'Saldo a favor', 'money'),
    col('share', 'Participación', 'percent'),
  ]
  const data: Row[] = rows.map((row) => ({
    group:
      group.type === 'date' || group.type === 'month'
        ? isoDate(row.key)
        : groupBy === 'method'
          ? (PAYMENT_METHOD_LABELS[row.key as PaymentMethod] ?? row.key)
          : row.key,
    count: int(row.count),
    units: int(row.units),
    amount: money(row.amount),
    unapplied: money(row.unapplied),
    share: percent(toCents(row.amount), total),
  }))
  return {
    period: rangeText(from, to),
    summary,
    columns,
    rows: data,
    totals: {
      ...totalsOf(columns, data, ['units']),
      group: 'Total',
      share: data.length ? 100 : null,
    },
  }
}

/** Billed against collected, month by month */
export const billingCollection: ReportRunner = async ({ tenant, zone, filters }) => {
  const { from, to } = filters as { from: string; to: string }
  const chargeFilters: string[] = []
  const chargeBindings: unknown[] = []
  if (filters.conceptId) {
    chargeFilters.push('AND c.charge_concept_id = ?')
    chargeBindings.push(filters.conceptId)
  }
  if (filters.buildingId) {
    chargeFilters.push('AND u.building_id = ?')
    chargeBindings.push(filters.buildingId)
  }
  const extra = chargeFilters.join(' ')
  const rows = await select(
    `WITH months AS (
       SELECT generate_series(?::date, ?::date, interval '1 month')::date AS month
     ),
     billed AS (
       SELECT c.period,
              SUM(c.amount) FILTER (WHERE c.status <> 'cancelled') AS billed,
              SUM(c.balance) FILTER (WHERE c.status <> 'cancelled') AS balance,
              SUM(c.amount) FILTER (WHERE c.status = 'cancelled') AS cancelled,
              COUNT(*) FILTER (WHERE c.status <> 'cancelled') AS charges
         FROM charges c JOIN units u ON u.id = c.unit_id
        WHERE c.tenant_id = ? AND c.period BETWEEN ?::date AND ?::date ${extra}
        GROUP BY c.period
     ),
     adjustments AS (
       SELECT c.period,
              SUM(a.amount) FILTER (WHERE a.type = 'early_payment_discount') AS discounts,
              SUM(a.amount) FILTER (WHERE a.type = 'credit_note') AS credit_notes
         FROM charge_adjustments a
         JOIN charges c ON c.id = a.charge_id
         JOIN units u ON u.id = c.unit_id
        WHERE a.tenant_id = ? AND c.status <> 'cancelled' AND c.period BETWEEN ?::date AND ?::date ${extra}
        GROUP BY c.period
     ),
     paid AS (
       SELECT c.period, SUM(pa.amount) AS paid
         FROM payment_allocations pa
         JOIN charges c ON c.id = pa.charge_id
         JOIN units u ON u.id = c.unit_id
        WHERE pa.tenant_id = ? AND c.period BETWEEN ?::date AND ?::date ${extra}
        GROUP BY c.period
     ),
     received AS (
       SELECT date_trunc('month', p.paid_at AT TIME ZONE ?)::date AS month, SUM(pa.amount) AS received
         FROM payment_allocations pa
         JOIN payments p ON p.id = pa.payment_id AND p.status = 'confirmed'
         JOIN charges c ON c.id = pa.charge_id
         JOIN units u ON u.id = c.unit_id
        WHERE pa.tenant_id = ? AND ${localDay('p.paid_at')} BETWEEN ?::date AND ?::date ${extra}
        GROUP BY 1
     )
     SELECT m.month, COALESCE(b.charges, 0) AS charges, COALESCE(b.billed, 0) AS billed,
            COALESCE(a.discounts, 0) AS discounts, COALESCE(a.credit_notes, 0) AS credit_notes,
            COALESCE(b.cancelled, 0) AS cancelled, COALESCE(pd.paid, 0) AS paid,
            COALESCE(b.balance, 0) AS balance, COALESCE(r.received, 0) AS received
       FROM months m
       LEFT JOIN billed b ON b.period = m.month
       LEFT JOIN adjustments a ON a.period = m.month
       LEFT JOIN paid pd ON pd.period = m.month
       LEFT JOIN received r ON r.month = m.month
      ORDER BY m.month`,
    [
      from,
      to,
      tenant.id,
      from,
      to,
      ...chargeBindings,
      tenant.id,
      from,
      to,
      ...chargeBindings,
      tenant.id,
      from,
      to,
      ...chargeBindings,
      zone,
      tenant.id,
      zone,
      from,
      monthEnd(to),
      ...chargeBindings,
    ]
  )
  const columns: ReportColumn[] = [
    col('month', 'Mes', 'month'),
    col('charges', 'Cobros', 'number'),
    col('billed', 'Facturado', 'money'),
    col('discounts', 'Descuentos pronto pago', 'money'),
    col('creditNotes', 'Notas crédito', 'money'),
    col('paid', 'Pagado de lo facturado', 'money'),
    col('balance', 'Pendiente', 'money'),
    col('rate', 'Recaudo', 'percent'),
    col('cancelled', 'Anulado', 'money'),
    col('received', 'Abonado en el mes', 'money'),
  ]
  const rate = (row: Record<string, unknown>) =>
    percent(
      toCents(row.paid as string),
      toCents(row.billed as string) -
        toCents(row.discounts as string) -
        toCents(row.credit_notes as string)
    )
  const data: Row[] = rows.map((row) => ({
    month: isoDate(row.month),
    charges: int(row.charges),
    billed: money(row.billed),
    discounts: money(row.discounts),
    creditNotes: money(row.credit_notes),
    paid: money(row.paid),
    balance: money(row.balance),
    rate: rate(row),
    cancelled: money(row.cancelled),
    received: money(row.received),
  }))
  const totals = totalsOf(columns, data)
  totals.month = 'Total'
  totals.rate = rate({
    billed: totals.billed,
    discounts: totals.discounts,
    credit_notes: totals.creditNotes,
    paid: totals.paid,
  })
  return {
    period: monthRangeText(from, to),
    summary: [
      { label: 'Facturado', value: totals.billed, type: 'money' },
      { label: 'Pagado de lo facturado', value: totals.paid, type: 'money' },
      {
        label: 'Pendiente',
        value: totals.balance,
        type: 'money',
        tone: toCents(totals.balance as string) > 0 ? 'warning' : 'good',
      },
      {
        label: 'Recaudo',
        value: totals.rate,
        type: 'percent',
        hint: 'Pagado ÷ (facturado − descuentos − notas crédito)',
      },
    ],
    columns,
    rows: data,
    totals,
    notes: [
      '“Pagado de lo facturado” son los abonos a los cobros de cada mes, sin importar cuándo se pagaron.',
      '“Abonado en el mes” son los abonos recibidos durante el mes a cobros de cualquier periodo (sin los saldos a favor).',
    ],
  }
}

/** Aging buckets per unit, from the open balance of the charges */
async function agingRows(tenantId: string, today: string, filters: Record<string, unknown>) {
  const where = ['u.tenant_id = ?', 'u.deleted_at IS NULL']
  const bindings: unknown[] = []
  if (filters.buildingId) {
    where.push('u.building_id = ?')
    bindings.push(filters.buildingId)
  }
  if (filters.unitType) {
    where.push('u.type = ?')
    bindings.push(filters.unitType)
  }
  return select(
    `WITH open AS (
       SELECT c.unit_id,
              SUM(c.balance) FILTER (WHERE c.due_on >= ?::date) AS current,
              SUM(c.balance) FILTER (WHERE c.due_on < ?::date AND c.due_on >= ?::date - 30) AS d30,
              SUM(c.balance) FILTER (WHERE c.due_on < ?::date - 30 AND c.due_on >= ?::date - 60) AS d60,
              SUM(c.balance) FILTER (WHERE c.due_on < ?::date - 60 AND c.due_on >= ?::date - 90) AS d90,
              SUM(c.balance) FILTER (WHERE c.due_on < ?::date - 90) AS over90,
              SUM(c.balance) AS total,
              SUM(c.balance) FILTER (WHERE c.due_on < ?::date) AS overdue,
              MIN(c.due_on) FILTER (WHERE c.due_on < ?::date) AS oldest_due,
              COUNT(DISTINCT c.period) FILTER (WHERE c.due_on < ?::date) AS months
         FROM charges c
        WHERE c.tenant_id = ? AND c.status IN ('pending', 'partially_paid') AND c.balance > 0
        GROUP BY c.unit_id
     ),
     credit AS (
       SELECT unit_id, SUM(unapplied_amount) AS credit FROM payments
        WHERE tenant_id = ? AND status = 'confirmed' AND unapplied_amount > 0
        GROUP BY unit_id
     ),
     last_payment AS (
       SELECT DISTINCT ON (unit_id) unit_id, paid_at, amount FROM payments
        WHERE tenant_id = ? AND status = 'confirmed'
        ORDER BY unit_id, paid_at DESC
     )
     SELECT u.id AS unit_id, ${UNIT_LABEL} AS unit, ${RESPONSIBLE} AS responsible,
            COALESCE(o.current, 0) AS current, COALESCE(o.d30, 0) AS d30, COALESCE(o.d60, 0) AS d60,
            COALESCE(o.d90, 0) AS d90, COALESCE(o.over90, 0) AS over90, COALESCE(o.total, 0) AS total,
            COALESCE(o.overdue, 0) AS overdue, o.oldest_due, COALESCE(o.months, 0) AS months,
            COALESCE(cr.credit, 0) AS credit, lp.paid_at AS last_paid_at, lp.amount AS last_amount,
            (SELECT x.phone FROM unit_occupants x WHERE x.unit_id = u.id AND x.phone IS NOT NULL
                AND (x.ends_on IS NULL OR x.ends_on >= CURRENT_DATE)
              ORDER BY x.is_billing_responsible DESC, x.is_primary_contact DESC LIMIT 1) AS phone,
            (SELECT x.email FROM unit_occupants x WHERE x.unit_id = u.id AND x.email IS NOT NULL
                AND (x.ends_on IS NULL OR x.ends_on >= CURRENT_DATE)
              ORDER BY x.is_billing_responsible DESC, x.is_primary_contact DESC LIMIT 1) AS email
       FROM units u
       LEFT JOIN buildings b ON b.id = u.building_id
       LEFT JOIN open o ON o.unit_id = u.id
       LEFT JOIN credit cr ON cr.unit_id = u.id
       LEFT JOIN last_payment lp ON lp.unit_id = u.id
      WHERE ${where.join(' AND ')} AND (o.unit_id IS NOT NULL OR cr.unit_id IS NOT NULL)
      ORDER BY COALESCE(o.overdue, 0) DESC, COALESCE(o.total, 0) DESC, b.name NULLS FIRST, length(u.code), u.code`,
    [...Array(11).fill(today), tenantId, tenantId, tenantId, tenantId, ...bindings]
  )
}

const cents = (value: unknown) => toCents((value as string) ?? 0)

/** A timestamp as "YYYY-MM-DD" in the conjunto's zone */
const localDate = (value: Date | string, zone: string) =>
  new Date(value).toLocaleDateString('en-CA', { timeZone: zone })

export const receivablesAging: ReportRunner = async ({ tenant, today, zone, filters }) => {
  const all = await agingRows(tenant.id, today, filters)
  const min = filters.minAmount ? Math.round(Number(filters.minAmount) * 100) : 0
  const overdue = String(filters.overdue ?? 'all')
  const rows = all.filter((row) => {
    if (min && cents(row.total) < min) return false
    if (overdue === 'overdue') return cents(row.overdue) > 0
    if (overdue === 'd30') return cents(row.d60) + cents(row.d90) + cents(row.over90) > 0
    if (overdue === 'd60') return cents(row.d90) + cents(row.over90) > 0
    if (overdue === 'd90') return cents(row.over90) > 0
    return cents(row.total) > 0 || cents(row.credit) > 0
  })
  const columns: ReportColumn[] = [
    col('unit', 'Unidad'),
    col('responsible', 'Responsable'),
    col('current', 'Al día', 'money'),
    col('d30', '1 a 30 días', 'money'),
    col('d60', '31 a 60 días', 'money'),
    col('d90', '61 a 90 días', 'money'),
    col('over90', 'Más de 90 días', 'money'),
    col('total', 'Total', 'money'),
    col('credit', 'Saldo a favor', 'money'),
    col('oldestDue', 'Vencimiento más antiguo', 'date'),
    col('lastPayment', 'Último pago', 'date'),
  ]
  const data: Row[] = rows.map((row) => ({
    _unitId: row.unit_id,
    unit: row.unit,
    responsible: row.responsible,
    current: money(row.current),
    d30: money(row.d30),
    d60: money(row.d60),
    d90: money(row.d90),
    over90: money(row.over90),
    total: money(row.total),
    credit: money(row.credit),
    oldestDue: row.oldest_due ? isoDate(row.oldest_due) : null,
    lastPayment: row.last_paid_at ? localDate(row.last_paid_at, zone) : null,
  }))
  const totals = totalsOf(columns, data)
  const totalCents = cents(totals.total)
  const overdueCents = totalCents - cents(totals.current)
  return {
    period: `Saldos al ${today.split('-').reverse().join('/')}`,
    summary: [
      { label: 'Cartera total', value: totals.total, type: 'money' },
      {
        label: 'Vencida',
        value: fromCents(overdueCents),
        type: 'money',
        tone: overdueCents > 0 ? 'warning' : 'good',
      },
      {
        label: 'Vencida sobre el total',
        value: percent(overdueCents, totalCents),
        type: 'percent',
      },
      {
        label: 'Más de 90 días',
        value: totals.over90,
        type: 'money',
        tone: cents(totals.over90) > 0 ? 'danger' : 'neutral',
      },
      {
        label: 'Unidades con saldo vencido',
        value: data.filter((row) => cents(row.total) - cents(row.current) > 0).length,
        type: 'number',
      },
      { label: 'Saldos a favor', value: totals.credit, type: 'money' },
    ],
    columns,
    rows: data,
    totals,
    rowLink: statementLink,
  }
}

export const delinquents: ReportRunner = async ({ tenant, today, zone, filters }) => {
  const all = await agingRows(tenant.id, today, filters)
  const minMonths = Number(filters.minMonths ?? 1)
  const min = filters.minAmount ? Math.round(Number(filters.minAmount) * 100) : 0
  const rows = all.filter(
    (row) => cents(row.overdue) > 0 && int(row.months) >= minMonths && cents(row.overdue) >= min
  )
  const columns: ReportColumn[] = [
    col('unit', 'Unidad'),
    col('responsible', 'Responsable'),
    col('phone', 'Teléfono'),
    col('email', 'Correo'),
    col('months', 'Meses en mora', 'number'),
    col('days', 'Días de mora', 'number'),
    col('overdue', 'Saldo vencido', 'money'),
    col('total', 'Deuda total', 'money'),
    col('lastPayment', 'Último pago', 'date'),
    col('lastAmount', 'Valor último pago', 'money'),
  ]
  const day = (value: string) => Date.parse(`${value}T12:00:00Z`)
  const data: Row[] = rows.map((row) => {
    const oldest = row.oldest_due ? isoDate(row.oldest_due) : null
    return {
      _unitId: row.unit_id,
      unit: row.unit,
      responsible: row.responsible,
      phone: row.phone,
      email: row.email,
      months: int(row.months),
      days: oldest ? Math.round((day(today) - day(oldest)) / 86_400_000) : null,
      overdue: money(row.overdue),
      total: money(row.total),
      lastPayment: row.last_paid_at ? localDate(row.last_paid_at, zone) : null,
      lastAmount: row.last_amount === null ? null : money(row.last_amount),
    }
  })
  const totals = totalsOf(columns, data, ['months', 'days'])
  const withoutPayment = data.filter((row) => !row.lastPayment).length
  return {
    period: `Saldos al ${today.split('-').reverse().join('/')}`,
    summary: [
      {
        label: 'Unidades en mora',
        value: data.length,
        type: 'number',
        tone: data.length ? 'warning' : 'good',
      },
      { label: 'Saldo vencido', value: totals.overdue, type: 'money' },
      {
        label: 'Promedio de meses en mora',
        value: data.length ? Math.round((sumNumber(data, 'months') / data.length) * 10) / 10 : null,
        type: 'number',
      },
      { label: 'Sin ningún pago registrado', value: withoutPayment, type: 'number' },
    ],
    columns,
    rows: data,
    totals,
    rowLink: statementLink,
    notes: [
      'Contiene datos personales (Ley 1581 de 2012): úsalo solo para la gestión de cobro.',
      'No lo publiques en carteleras ni en espacios comunes: exponer a los deudores no está permitido.',
    ],
  }
}

export const chargesByConcept: ReportRunner = async ({ tenant, filters }) => {
  const { from, to } = filters as { from: string; to: string }
  const building = filters.buildingId ? 'AND u.building_id = ?' : ''
  const extra = filters.buildingId ? [filters.buildingId] : []
  const rows = await select(
    `WITH base AS (
       SELECT c.* FROM charges c JOIN units u ON u.id = c.unit_id
        WHERE c.tenant_id = ? AND c.period BETWEEN ?::date AND ?::date ${building}
     ),
     adjustments AS (
       SELECT a.charge_id,
              SUM(a.amount) FILTER (WHERE a.type = 'early_payment_discount') AS discounts,
              SUM(a.amount) FILTER (WHERE a.type = 'credit_note') AS credit_notes
         FROM charge_adjustments a JOIN base ON base.id = a.charge_id
        GROUP BY a.charge_id
     ),
     paid AS (
       SELECT pa.charge_id, SUM(pa.amount) AS paid
         FROM payment_allocations pa JOIN base ON base.id = pa.charge_id
        GROUP BY pa.charge_id
     )
     SELECT k.name, k.type,
            COUNT(*) FILTER (WHERE base.status <> 'cancelled') AS charges,
            COALESCE(SUM(base.amount) FILTER (WHERE base.status <> 'cancelled'), 0) AS billed,
            COALESCE(SUM(a.discounts) FILTER (WHERE base.status <> 'cancelled'), 0) AS discounts,
            COALESCE(SUM(a.credit_notes) FILTER (WHERE base.status <> 'cancelled'), 0) AS credit_notes,
            COALESCE(SUM(base.amount) FILTER (WHERE base.status = 'cancelled'), 0) AS cancelled,
            COALESCE(SUM(p.paid), 0) AS paid,
            COALESCE(SUM(base.balance) FILTER (WHERE base.status <> 'cancelled'), 0) AS balance
       FROM base
       JOIN charge_concepts k ON k.id = base.charge_concept_id
       LEFT JOIN adjustments a ON a.charge_id = base.id
       LEFT JOIN paid p ON p.charge_id = base.id
      GROUP BY k.id
      ORDER BY billed DESC, k.name`,
    [tenant.id, from, to, ...extra]
  )
  const columns: ReportColumn[] = [
    col('concept', 'Concepto'),
    col('charges', 'Cobros', 'number'),
    col('billed', 'Facturado', 'money'),
    col('discounts', 'Descuentos', 'money'),
    col('creditNotes', 'Notas crédito', 'money'),
    col('paid', 'Pagado', 'money'),
    col('balance', 'Saldo', 'money'),
    col('cancelled', 'Anulado', 'money'),
    col('share', 'Participación', 'percent'),
  ]
  const billedTotal = rows.reduce((sum, row) => sum + cents(row.billed), 0)
  const data: Row[] = rows.map((row) => ({
    concept: row.name,
    charges: int(row.charges),
    billed: money(row.billed),
    discounts: money(row.discounts),
    creditNotes: money(row.credit_notes),
    paid: money(row.paid),
    balance: money(row.balance),
    cancelled: money(row.cancelled),
    share: percent(cents(row.billed), billedTotal),
  }))
  const totals = totalsOf(columns, data)
  totals.share = data.length ? 100 : null
  return {
    period: monthRangeText(from, to),
    summary: [
      { label: 'Facturado', value: totals.billed, type: 'money' },
      { label: 'Pagado', value: totals.paid, type: 'money' },
      { label: 'Saldo', value: totals.balance, type: 'money' },
      { label: 'Anulado', value: totals.cancelled, type: 'money' },
    ],
    columns,
    rows: data,
    totals,
  }
}

export const creditBalances: ReportRunner = async ({ tenant, zone, filters }) => {
  const building = filters.buildingId ? 'AND u.building_id = ?' : ''
  const rows = await select(
    `SELECT u.id AS unit_id, ${UNIT_LABEL} AS unit, ${RESPONSIBLE} AS responsible,
            COUNT(*) AS receipts, SUM(p.unapplied_amount) AS credit,
            MAX(${localDay('p.paid_at')}) AS last_day
       FROM payments p JOIN units u ON u.id = p.unit_id LEFT JOIN buildings b ON b.id = u.building_id
      WHERE p.tenant_id = ? AND p.status = 'confirmed' AND p.unapplied_amount > 0 ${building}
      GROUP BY u.id, b.name
      ORDER BY credit DESC`,
    [zone, tenant.id, ...(filters.buildingId ? [filters.buildingId] : [])]
  )
  const columns: ReportColumn[] = [
    col('unit', 'Unidad'),
    col('responsible', 'Responsable'),
    col('receipts', 'Recibos con saldo', 'number'),
    col('credit', 'Saldo a favor', 'money'),
    col('lastDay', 'Último recibo', 'date'),
  ]
  const data: Row[] = rows.map((row) => ({
    _unitId: row.unit_id,
    unit: row.unit,
    responsible: row.responsible,
    receipts: int(row.receipts),
    credit: money(row.credit),
    lastDay: isoDate(row.last_day),
  }))
  const totals = totalsOf(columns, data)
  return {
    summary: [
      { label: 'Unidades con saldo a favor', value: data.length, type: 'number' },
      {
        label: 'Total de anticipos',
        value: totals.credit,
        type: 'money',
        hint: 'Pasivo: se aplica a los próximos cobros',
      },
    ],
    columns,
    rows: data,
    totals,
    rowLink: statementLink,
  }
}

/** Banks and cash: movements of the ledger account of each cash account */
export const cashFlow: ReportRunner = async ({ tenant, filters }) => {
  const { from, to } = filters as { from: string; to: string }
  const account = filters.cashAccountId ? 'AND c.id = ?' : ''
  const accountBinding = filters.cashAccountId ? [filters.cashAccountId] : []
  const accounts = await select(
    `SELECT c.id, c.name, c.ledger_account_id,
            COALESCE(SUM(l.debit - l.credit) FILTER (WHERE e.date < ?::date), 0) AS opening,
            COALESCE(SUM(l.debit) FILTER (WHERE e.date BETWEEN ?::date AND ?::date), 0) AS inflows,
            COALESCE(SUM(l.credit) FILTER (WHERE e.date BETWEEN ?::date AND ?::date), 0) AS outflows,
            COALESCE(SUM(l.debit - l.credit) FILTER (WHERE e.date <= ?::date), 0) AS closing
       FROM cash_accounts c
       LEFT JOIN journal_lines l ON l.account_id = c.ledger_account_id
       LEFT JOIN journal_entries e ON e.id = l.entry_id
      WHERE c.tenant_id = ? ${account}
      GROUP BY c.id
      ORDER BY c.is_active DESC, c.type, c.name`,
    [from, from, to, from, to, to, tenant.id, ...accountBinding]
  )
  const sum = (key: string) => accounts.reduce((total, row) => total + cents(row[key]), 0)
  const summary = [
    { label: 'Saldo inicial', value: fromCents(sum('opening')), type: 'money' as const },
    {
      label: 'Entradas',
      value: fromCents(sum('inflows')),
      type: 'money' as const,
      tone: 'good' as const,
    },
    { label: 'Salidas', value: fromCents(sum('outflows')), type: 'money' as const },
    { label: 'Saldo final', value: fromCents(sum('closing')), type: 'money' as const },
  ]
  const groupBy = String(filters.groupBy ?? 'account')

  if (groupBy === 'account') {
    const columns: ReportColumn[] = [
      col('account', 'Cuenta'),
      col('opening', 'Saldo inicial', 'money'),
      col('inflows', 'Entradas', 'money'),
      col('outflows', 'Salidas', 'money'),
      col('closing', 'Saldo final', 'money'),
    ]
    const data: Row[] = accounts.map((row) => ({
      account: row.name,
      opening: money(row.opening),
      inflows: money(row.inflows),
      outflows: money(row.outflows),
      closing: money(row.closing),
    }))
    return {
      period: rangeText(from, to),
      summary,
      columns,
      rows: data,
      totals: totalsOf(columns, data),
    }
  }

  const ledgerIds = accounts.map((row) => row.ledger_account_id)
  if (ledgerIds.length === 0) {
    return { period: rangeText(from, to), summary, columns: [col('account', 'Cuenta')], rows: [] }
  }

  if (groupBy === 'month') {
    const rows = await select(
      `SELECT date_trunc('month', e.date)::date AS month, SUM(l.debit) AS inflows, SUM(l.credit) AS outflows
         FROM journal_lines l JOIN journal_entries e ON e.id = l.entry_id
        WHERE l.tenant_id = ? AND l.account_id IN (${ledgerIds.map(() => '?').join(', ')}) AND e.date BETWEEN ?::date AND ?::date
        GROUP BY 1 ORDER BY 1`,
      [tenant.id, ...ledgerIds, from, to]
    )
    let balance = sum('opening')
    const columns: ReportColumn[] = [
      col('month', 'Mes', 'month'),
      col('inflows', 'Entradas', 'money'),
      col('outflows', 'Salidas', 'money'),
      col('net', 'Neto', 'money'),
      col('closing', 'Saldo al cierre', 'money'),
    ]
    const data: Row[] = rows.map((row) => {
      const net = cents(row.inflows) - cents(row.outflows)
      balance += net
      return {
        month: isoDate(row.month),
        inflows: money(row.inflows),
        outflows: money(row.outflows),
        net: fromCents(net),
        closing: fromCents(balance),
      }
    })
    const totals = totalsOf(columns, data, ['closing'])
    totals.month = 'Total'
    totals.closing = fromCents(balance)
    return { period: rangeText(from, to), summary, columns, rows: data, totals }
  }

  // Detail: every movement with the running balance of its account
  const lines = await select(
    `SELECT c.name AS account, c.ledger_account_id, e.date, e.number, e.type, e.id AS entry_id,
            COALESCE(l.description, e.description) AS description,
            COALESCE(${UNIT_LABEL}, v.name) AS third_party, l.debit, l.credit
       FROM journal_lines l
       JOIN journal_entries e ON e.id = l.entry_id
       JOIN cash_accounts c ON c.ledger_account_id = l.account_id
       LEFT JOIN units u ON u.id = l.unit_id
       LEFT JOIN buildings b ON b.id = u.building_id
       LEFT JOIN vendors v ON v.id = l.vendor_id
      WHERE l.tenant_id = ? AND l.account_id IN (${ledgerIds.map(() => '?').join(', ')}) AND e.date BETWEEN ?::date AND ?::date
      ORDER BY c.name, e.date, e.number, l.id
      LIMIT 5001`,
    [tenant.id, ...ledgerIds, from, to]
  )
  const balances = new Map(
    accounts.map((row) => [row.ledger_account_id as string, cents(row.opening)])
  )
  const columns: ReportColumn[] = [
    col('date', 'Fecha', 'date'),
    col('account', 'Cuenta'),
    col('voucher', 'Comprobante'),
    col('description', 'Descripción'),
    col('thirdParty', 'Tercero'),
    col('inflow', 'Entrada', 'money'),
    col('outflow', 'Salida', 'money'),
    col('balance', 'Saldo', 'money'),
  ]
  const data: Row[] = lines.map((line) => {
    const balance =
      (balances.get(line.ledger_account_id) ?? 0) + cents(line.debit) - cents(line.credit)
    balances.set(line.ledger_account_id, balance)
    return {
      date: isoDate(line.date),
      account: line.account,
      voucher: `${JOURNAL_ENTRY_TYPE_LABELS[line.type as JournalEntryType] ?? line.type} ${line.number}`,
      description: line.description,
      thirdParty: line.third_party,
      inflow: money(line.debit),
      outflow: money(line.credit),
      balance: fromCents(balance),
    }
  })
  const totals = totalsOf(columns, data, ['balance'])
  totals.date = null
  totals.account = 'Total'
  return {
    period: rangeText(from, to),
    summary,
    columns,
    rows: data,
    totals,
    notes: accounts.length > 1 ? ['El saldo de cada fila es el de su cuenta.'] : [],
  }
}

/** Vendor bills (causación) of the range */
export const expenses: ReportRunner = async ({ tenant, filters }) => {
  const { from, to } = filters as { from: string; to: string }
  const where = [
    `bl.tenant_id = ?`,
    `bl.status <> 'cancelled'`,
    `bl.issued_on BETWEEN ?::date AND ?::date`,
  ]
  const bindings: unknown[] = [tenant.id, from, to]
  if (filters.vendorId) {
    where.push('bl.vendor_id = ?')
    bindings.push(filters.vendorId)
  }
  if (filters.accountId) {
    where.push('EXISTS (SELECT 1 FROM bill_lines x WHERE x.bill_id = bl.id AND x.account_id = ?)')
    bindings.push(filters.accountId)
  }
  const base = `FROM bills bl JOIN vendors v ON v.id = bl.vendor_id WHERE ${where.join(' AND ')}`
  const [sums] = await select(
    `SELECT COUNT(*) AS count, COALESCE(SUM(bl.total), 0) AS total, COALESCE(SUM(bl.net_amount), 0) AS net,
            COALESCE(SUM(bl.balance), 0) AS balance ${base}`,
    bindings
  )
  const summary = [
    { label: 'Facturas', value: int(sums.count), type: 'number' as const },
    {
      label: 'Total causado',
      value: money(sums.total),
      type: 'money' as const,
      hint: 'Subtotal más IVA',
    },
    {
      label: 'Pagado',
      value: fromCents(cents(sums.net) - cents(sums.balance)),
      type: 'money' as const,
    },
    {
      label: 'Por pagar',
      value: money(sums.balance),
      type: 'money' as const,
      tone: cents(sums.balance) > 0 ? ('warning' as const) : ('neutral' as const),
    },
  ]
  const notes = filters.accountId
    ? [
        'Con una cuenta de gasto elegida se muestran las facturas que la usan, por su valor completo (salvo en “Por cuenta de gasto”).',
      ]
    : []
  const groupBy = String(filters.groupBy ?? 'vendor')

  if (groupBy === 'account') {
    const lineWhere = filters.accountId ? 'AND l.account_id = ?' : ''
    const rows = await select(
      `SELECT a.code, a.name, COUNT(DISTINCT bl.id) AS bills, SUM(l.amount) AS amount
         FROM bill_lines l JOIN bills bl ON bl.id = l.bill_id JOIN vendors v ON v.id = bl.vendor_id
         JOIN ledger_accounts a ON a.id = l.account_id
        WHERE ${where.join(' AND ')} ${lineWhere}
        GROUP BY a.id ORDER BY amount DESC`,
      [...bindings, ...(filters.accountId ? [filters.accountId] : [])]
    )
    const total = rows.reduce((sum, row) => sum + cents(row.amount), 0)
    const columns: ReportColumn[] = [
      col('code', 'Código'),
      col('account', 'Cuenta de gasto'),
      col('bills', 'Facturas', 'number'),
      col('amount', 'Valor antes de IVA', 'money'),
      col('share', 'Participación', 'percent'),
    ]
    const data: Row[] = rows.map((row) => ({
      code: row.code,
      account: row.name,
      bills: int(row.bills),
      amount: money(row.amount),
      share: percent(cents(row.amount), total),
    }))
    const totals = totalsOf(columns, data, ['bills'])
    totals.share = data.length ? 100 : null
    return { period: rangeText(from, to), summary, columns, rows: data, totals }
  }

  if (groupBy === 'detail') {
    const rows = await select(
      `SELECT bl.issued_on, bl.due_on, bl.number, v.name AS vendor, bl.description, bl.subtotal, bl.tax_amount,
              bl.withholding_income_tax + bl.withholding_vat + bl.withholding_ica AS withholdings,
              bl.total, bl.net_amount, bl.balance, bl.status
         ${base} ORDER BY bl.issued_on, bl.number LIMIT 5001`,
      bindings
    )
    const columns: ReportColumn[] = [
      col('date', 'Fecha', 'date'),
      col('number', 'Factura'),
      col('vendor', 'Proveedor'),
      col('description', 'Descripción'),
      col('subtotal', 'Subtotal', 'money'),
      col('tax', 'IVA', 'money'),
      col('withholdings', 'Retenciones', 'money'),
      col('net', 'Neto a pagar', 'money'),
      col('balance', 'Saldo', 'money'),
      col('dueOn', 'Vence', 'date'),
      col('status', 'Estado'),
    ]
    const data: Row[] = rows.map((row) => ({
      date: isoDate(row.issued_on),
      number: row.number,
      vendor: row.vendor,
      description: row.description,
      subtotal: money(row.subtotal),
      tax: money(row.tax_amount),
      withholdings: money(row.withholdings),
      net: money(row.net_amount),
      balance: money(row.balance),
      dueOn: row.due_on ? isoDate(row.due_on) : null,
      status: BILL_STATUS_LABELS[row.status as BillStatus] ?? row.status,
    }))
    const totals = totalsOf(columns, data)
    totals.date = null
    totals.number = 'Total'
    return { period: rangeText(from, to), summary, columns, rows: data, totals, notes }
  }

  const byMonth = groupBy === 'month'
  const rows = await select(
    `SELECT ${byMonth ? `date_trunc('month', bl.issued_on)::date AS key` : 'v.name AS key, v.document_number'},
            COUNT(*) AS bills, SUM(bl.subtotal) AS subtotal, SUM(bl.tax_amount) AS tax,
            SUM(bl.withholding_income_tax + bl.withholding_vat + bl.withholding_ica) AS withholdings,
            SUM(bl.total) AS total, SUM(bl.net_amount) AS net, SUM(bl.balance) AS balance
       ${base}
      GROUP BY ${byMonth ? '1' : 'v.id'}
      ORDER BY ${byMonth ? '1' : 'total DESC'}`,
    bindings
  )
  const columns: ReportColumn[] = [
    byMonth ? col('group', 'Mes', 'month') : col('group', 'Proveedor'),
    ...(byMonth ? [] : [col('document', 'NIT / documento')]),
    col('bills', 'Facturas', 'number'),
    col('subtotal', 'Subtotal', 'money'),
    col('tax', 'IVA', 'money'),
    col('total', 'Total', 'money'),
    col('withholdings', 'Retenciones', 'money'),
    col('net', 'Neto', 'money'),
    col('paid', 'Pagado', 'money'),
    col('balance', 'Saldo', 'money'),
  ]
  const data: Row[] = rows.map((row) => ({
    group: byMonth ? isoDate(row.key) : row.key,
    ...(byMonth ? {} : { document: row.document_number }),
    bills: int(row.bills),
    subtotal: money(row.subtotal),
    tax: money(row.tax),
    total: money(row.total),
    withholdings: money(row.withholdings),
    net: money(row.net),
    paid: fromCents(cents(row.net) - cents(row.balance)),
    balance: money(row.balance),
  }))
  const totals = totalsOf(columns, data)
  totals.group = 'Total'
  return { period: rangeText(from, to), summary, columns, rows: data, totals, notes }
}

export const vendorPayments: ReportRunner = async ({ tenant, filters }) => {
  const { from, to } = filters as { from: string; to: string }
  const where = ['vp.tenant_id = ?', 'vp.paid_on BETWEEN ?::date AND ?::date']
  const bindings: unknown[] = [tenant.id, from, to]
  if (filters.vendorId) {
    where.push('vp.vendor_id = ?')
    bindings.push(filters.vendorId)
  }
  if (filters.cashAccountId) {
    where.push('vp.cash_account_id = ?')
    bindings.push(filters.cashAccountId)
  }
  const rows = await select(
    `SELECT vp.paid_on, vp.number, v.name AS vendor, v.document_number, c.name AS cash_account, vp.method,
            vp.reference, vp.amount, vp.status,
            (SELECT string_agg(bl.number, ', ' ORDER BY bl.number) FROM vendor_payment_allocations a
               JOIN bills bl ON bl.id = a.bill_id WHERE a.vendor_payment_id = vp.id) AS bills
       FROM vendor_payments vp
       JOIN vendors v ON v.id = vp.vendor_id
       LEFT JOIN cash_accounts c ON c.id = vp.cash_account_id
      WHERE ${where.join(' AND ')}
      ORDER BY vp.paid_on, vp.number
      LIMIT 5001`,
    bindings
  )
  const columns: ReportColumn[] = [
    col('date', 'Fecha', 'date'),
    col('number', 'Egreso', 'number'),
    col('vendor', 'Proveedor'),
    col('document', 'NIT / documento'),
    col('bills', 'Facturas'),
    col('cashAccount', 'Cuenta'),
    col('method', 'Medio'),
    col('reference', 'Referencia'),
    col('amount', 'Valor', 'money'),
    col('status', 'Estado'),
  ]
  const data: Row[] = rows.map((row) => ({
    _reversed: row.status === 'reversed' ? 1 : 0,
    date: isoDate(row.paid_on),
    number: int(row.number),
    vendor: row.vendor,
    document: row.document_number,
    bills: row.bills,
    cashAccount: row.cash_account,
    method: PAYMENT_METHOD_LABELS[row.method as PaymentMethod] ?? row.method,
    reference: row.reference,
    amount: money(row.amount),
    status: VENDOR_PAYMENT_STATUS_LABELS[row.status as VendorPaymentStatus] ?? row.status,
  }))
  const valid = data.filter((row) => !row._reversed)
  const totals = totalsOf(columns, valid, ['number'])
  return {
    period: rangeText(from, to),
    summary: [
      { label: 'Egresos', value: valid.length, type: 'number' },
      { label: 'Pagado', value: sumMoney(valid, 'amount'), type: 'money' },
      {
        label: 'Reversados',
        value: data.length - valid.length,
        type: 'number',
        tone: data.length > valid.length ? 'warning' : 'neutral',
      },
    ],
    columns,
    rows: data,
    totals,
    notes: ['Los totales no incluyen los egresos reversados.'],
  }
}

export const withholdings: ReportRunner = async ({ tenant, filters }) => {
  const { from, to } = filters as { from: string; to: string }
  const vendor = filters.vendorId ? 'AND bl.vendor_id = ?' : ''
  const byMonth = filters.groupBy === 'month'
  const rows = await select(
    `SELECT ${byMonth ? `date_trunc('month', bl.issued_on)::date AS key` : 'v.name AS key, v.document_type, v.document_number'},
            COUNT(*) AS bills, SUM(bl.subtotal) AS base, SUM(bl.tax_amount) AS tax,
            SUM(bl.withholding_income_tax) AS income_tax, SUM(bl.withholding_vat) AS vat,
            SUM(bl.withholding_ica) AS ica
       FROM bills bl JOIN vendors v ON v.id = bl.vendor_id
      WHERE bl.tenant_id = ? AND bl.status <> 'cancelled' AND bl.issued_on BETWEEN ?::date AND ?::date ${vendor}
        AND (bl.withholding_income_tax > 0 OR bl.withholding_vat > 0 OR bl.withholding_ica > 0)
      GROUP BY ${byMonth ? '1' : 'v.id'}
      ORDER BY ${byMonth ? '1' : 'v.name'}`,
    [tenant.id, from, to, ...(filters.vendorId ? [filters.vendorId] : [])]
  )
  const columns: ReportColumn[] = [
    byMonth ? col('group', 'Mes', 'month') : col('group', 'Proveedor'),
    ...(byMonth ? [] : [col('document', 'NIT / documento')]),
    col('bills', 'Facturas', 'number'),
    col('base', 'Base (subtotal)', 'money'),
    col('tax', 'IVA facturado', 'money'),
    col('incomeTax', 'Retención en la fuente', 'money'),
    col('vat', 'Retención de IVA', 'money'),
    col('ica', 'Retención de ICA', 'money'),
    col('total', 'Total retenido', 'money'),
  ]
  const data: Row[] = rows.map((row) => ({
    group: byMonth ? isoDate(row.key) : row.key,
    ...(byMonth
      ? {}
      : { document: [row.document_type, row.document_number].filter(Boolean).join(' ') || null }),
    bills: int(row.bills),
    base: money(row.base),
    tax: money(row.tax),
    incomeTax: money(row.income_tax),
    vat: money(row.vat),
    ica: money(row.ica),
    total: fromCents(cents(row.income_tax) + cents(row.vat) + cents(row.ica)),
  }))
  const totals = totalsOf(columns, data)
  totals.group = 'Total'
  return {
    period: rangeText(from, to),
    summary: [
      { label: 'Retención en la fuente', value: totals.incomeTax, type: 'money' },
      { label: 'Retención de IVA', value: totals.vat, type: 'money' },
      { label: 'Retención de ICA', value: totals.ica, type: 'money' },
      { label: 'Total retenido', value: totals.total, type: 'money' },
    ],
    columns,
    rows: data,
    totals,
    notes: [
      'Se cuentan por la fecha de la factura (causación). Las facturas anuladas no se incluyen.',
    ],
  }
}

/** Everything that corrects or undoes a money movement */
export const adjustments: ReportRunner = async ({ tenant, zone, filters }) => {
  const { from, to } = filters as { from: string; to: string }
  const t = tenant.id
  const day = (column: string) => `(${column} AT TIME ZONE '${zone.replace(/'/g, '')}')::date`
  const parts: Array<{ kind: AdjustmentKind; sql: string; bindings: unknown[] }> = [
    {
      kind: 'credit_note',
      sql: `SELECT 'credit_note' AS kind, ${day('a.created_at')} AS day, a.created_at AS at,
                   'Cobro ' || to_char(c.period, 'YYYY-MM') AS document, ${UNIT_LABEL} AS third_party,
                   a.amount, a.reason, a.created_by_id AS user_id
              FROM charge_adjustments a JOIN charges c ON c.id = a.charge_id
              JOIN units u ON u.id = c.unit_id LEFT JOIN buildings b ON b.id = u.building_id
             WHERE a.tenant_id = ? AND a.type = 'credit_note'`,
      bindings: [t],
    },
    {
      kind: 'cancellation',
      sql: `SELECT 'cancellation', ${day('a.created_at')}, a.created_at,
                   'Cobro ' || to_char(c.period, 'YYYY-MM'), ${UNIT_LABEL}, a.amount, a.reason, a.created_by_id
              FROM charge_adjustments a JOIN charges c ON c.id = a.charge_id
              JOIN units u ON u.id = c.unit_id LEFT JOIN buildings b ON b.id = u.building_id
             WHERE a.tenant_id = ? AND a.type = 'cancellation'`,
      bindings: [t],
    },
    {
      kind: 'payment_rejected',
      sql: `SELECT 'payment_rejected', ${day('p.reviewed_at')}, p.reviewed_at,
                   'Pago reportado' || COALESCE(' · ' || p.reference, ''), ${UNIT_LABEL}, p.amount,
                   p.rejection_reason, p.confirmed_by_id
              FROM payments p JOIN units u ON u.id = p.unit_id LEFT JOIN buildings b ON b.id = u.building_id
             WHERE p.tenant_id = ? AND p.status = 'rejected' AND p.reviewed_at IS NOT NULL`,
      bindings: [t],
    },
    {
      kind: 'payment_reversed',
      sql: `SELECT 'payment_reversed', ${day('p.reversed_at')}, p.reversed_at,
                   'Recibo ' || p.number, ${UNIT_LABEL}, p.amount, p.reversal_reason, p.reversed_by_id
              FROM payments p JOIN units u ON u.id = p.unit_id LEFT JOIN buildings b ON b.id = u.building_id
             WHERE p.tenant_id = ? AND p.reversed_at IS NOT NULL`,
      bindings: [t],
    },
    {
      kind: 'bill_cancelled',
      sql: `SELECT 'bill_cancelled', ${day('bl.cancelled_at')}, bl.cancelled_at, 'Factura ' || bl.number,
                   v.name, bl.net_amount, bl.cancellation_reason, bl.cancelled_by_id
              FROM bills bl JOIN vendors v ON v.id = bl.vendor_id
             WHERE bl.tenant_id = ? AND bl.cancelled_at IS NOT NULL`,
      bindings: [t],
    },
    {
      kind: 'vendor_payment_reversed',
      sql: `SELECT 'vendor_payment_reversed', ${day('vp.reversed_at')}, vp.reversed_at, 'Egreso ' || vp.number,
                   v.name, vp.amount, vp.reversal_reason, vp.reversed_by_id
              FROM vendor_payments vp JOIN vendors v ON v.id = vp.vendor_id
             WHERE vp.tenant_id = ? AND vp.reversed_at IS NOT NULL`,
      bindings: [t],
    },
    {
      kind: 'entry_reversed',
      sql: `SELECT 'entry_reversed', e.date, e.created_at, 'Comprobante ' || o.number, NULL,
                   e.total, e.description, e.created_by_id
              FROM journal_entries e JOIN journal_entries o ON o.id = e.reverses_entry_id
             WHERE e.tenant_id = ? AND e.type = 'reversal'`,
      bindings: [t],
    },
    {
      kind: 'parking_exempt',
      sql: `SELECT 'parking_exempt', ${day('s.exited_at')}, s.exited_at,
                   'Parqueadero de visitantes' || COALESCE(' · ' || s.plate, ''), ${UNIT_LABEL},
                   s.amount, s.exempt_reason, s.exited_by_id
              FROM parking_stays s JOIN units u ON u.id = s.unit_id LEFT JOIN buildings b ON b.id = u.building_id
             WHERE s.tenant_id = ? AND s.settlement = 'exempt' AND s.exited_at IS NOT NULL`,
      bindings: [t],
    },
  ]
  const chosen = filters.kind ? parts.filter((part) => part.kind === filters.kind) : parts
  const userFilter = filters.userId ? 'AND x.user_id = ?' : ''
  const rows = await select(
    `SELECT x.*, usr.full_name AS user_name FROM (
       ${chosen.map((part) => part.sql).join('\n UNION ALL \n')}
     ) x
     LEFT JOIN users usr ON usr.id = x.user_id
     WHERE x.day BETWEEN ?::date AND ?::date ${userFilter}
     ORDER BY x.at DESC
     LIMIT 5001`,
    [
      ...chosen.flatMap((part) => part.bindings),
      from,
      to,
      ...(filters.userId ? [filters.userId] : []),
    ]
  )
  const columns: ReportColumn[] = [
    col('date', 'Fecha', 'date'),
    col('kind', 'Tipo'),
    col('document', 'Documento'),
    col('thirdParty', 'Unidad o proveedor'),
    col('amount', 'Valor', 'money'),
    col('reason', 'Motivo'),
    col('user', 'Hecho por'),
  ]
  const data: Row[] = rows.map((row) => ({
    date: isoDate(row.day),
    kind: ADJUSTMENT_KIND_LABELS[row.kind as AdjustmentKind] ?? row.kind,
    document: row.document,
    thirdParty: row.third_party,
    amount: money(row.amount),
    reason: row.reason,
    user: row.user_name ?? 'Sistema',
  }))
  const byKind = new Map<string, number>()
  for (const row of data) byKind.set(row.kind as string, (byKind.get(row.kind as string) ?? 0) + 1)
  const totals = totalsOf(columns, data)
  totals.date = null
  totals.kind = 'Total'
  return {
    period: rangeText(from, to),
    summary: [
      { label: 'Movimientos', value: data.length, type: 'number' },
      { label: 'Valor', value: totals.amount, type: 'money' },
      ...[...byKind.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([label, count]) => ({ label, value: count, type: 'number' as const })),
    ],
    columns,
    rows: data,
    totals,
    notes: [
      'Los rechazos de pagos reportados no mueven la contabilidad: se listan para el control.',
    ],
  }
}
