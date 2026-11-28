/**
 * Reportes del backoffice (docs/reports.md): el catálogo, sus filtros y el
 * contrato de los resultados. La API arma cada reporte como una tabla con
 * resumen y totales; el backoffice la muestra, la imprime y la exporta.
 */
import type { EnrollmentRole } from './index.js'
import {
  CHARGE_ADJUSTMENT_TYPE_LABELS,
  ENROLLMENT_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  ROLE_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  TICKET_TYPE_LABELS,
  UNIT_STATUS_LABELS,
  UNIT_TYPE_LABELS,
  VEHICLE_TYPE_LABELS,
} from './labels.js'

const ADMIN: EnrollmentRole = 'administrator'
const COUNCIL: EnrollmentRole = 'council_member'
const ACCOUNTANT: EnrollmentRole = 'accountant'
const REVIEWER: EnrollmentRole = 'fiscal_reviewer'

/** Pueden entrar a Reportes (cada reporte tiene además sus propios roles) */
export const REPORT_ROLES: readonly EnrollmentRole[] = [ADMIN, ACCOUNTANT, COUNCIL, REVIEWER]
/** Reportes de dinero */
const FINANCE: readonly EnrollmentRole[] = [ADMIN, ACCOUNTANT, COUNCIL, REVIEWER]
/** Operación y comunidad: el contador no los necesita */
const OPERATIONS: readonly EnrollmentRole[] = [ADMIN, COUNCIL, REVIEWER]

/** Filas máximas de un reporte (en pantalla y en el archivo) */
export const REPORT_MAX_ROWS = 5000

export const REPORT_CATEGORIES = [
  'collection',
  'treasury',
  'expenses',
  'control',
  'operations',
  'community',
  'census',
] as const
export type ReportCategory = (typeof REPORT_CATEGORIES)[number]

export const REPORT_CATEGORY_LABELS: Record<ReportCategory, string> = {
  collection: 'Recaudo y cartera',
  treasury: 'Bancos y caja',
  expenses: 'Gastos y proveedores',
  control: 'Control interno',
  operations: 'Operación',
  community: 'Comunidad',
  census: 'Censo y parqueaderos',
}

export const REPORT_CATEGORY_ICONS: Record<ReportCategory, string> = {
  collection: 'mdi-cash-check',
  treasury: 'mdi-bank-outline',
  expenses: 'mdi-receipt-text-outline',
  control: 'mdi-shield-search',
  operations: 'mdi-tools',
  community: 'mdi-account-voice',
  census: 'mdi-home-city-outline',
}

/** Listas que la API llena con los datos del conjunto (`GET /reports/options`) */
export const REPORT_OPTION_SOURCES = [
  'buildings',
  'cashAccounts',
  'vendors',
  'concepts',
  'amenities',
  'members',
  'expenseAccounts',
] as const
export type ReportOptionSource = (typeof REPORT_OPTION_SOURCES)[number]

export type ReportOption = { value: string; label: string }
export type ReportOptions = Record<ReportOptionSource, ReportOption[]>

/**
 * Valores por defecto de las fechas, en la zona del conjunto:
 * `today`, `monthStart` (día 1 del mes), `yearStart` (1 de enero),
 * `month` (mes actual), `yearStartMonth` (enero) y `monthsAgo:N` (mes actual − N).
 */
export type ReportDefault = 'today' | 'monthStart' | 'yearStart' | 'month' | 'yearStartMonth' | `monthsAgo:${number}`

export type ReportFilter =
  | { key: string; label: string; type: 'date'; default?: ReportDefault; required?: boolean }
  | { key: string; label: string; type: 'month'; default?: ReportDefault; required?: boolean }
  | { key: string; label: string; type: 'number'; placeholder?: string; min?: number }
  | {
      key: string
      label: string
      type: 'select'
      /** Opciones fijas… */
      options?: ReportOption[]
      /** …o una lista del conjunto */
      source?: ReportOptionSource
      /** Sin valor: "Todas" / "Todos" (o el texto dado) */
      emptyLabel?: string
      /** Valor por defecto (los selects obligatorios, como la agrupación) */
      default?: string
    }

export interface ReportDefinition {
  key: string
  title: string
  description: string
  category: ReportCategory
  roles: readonly EnrollmentRole[]
  filters: ReportFilter[]
  /** Para quién sirve: aparece en la tarjeta del catálogo */
  audience: string
  /** Contiene datos personales (Ley 1581): se registra quién lo exporta */
  personalData?: boolean
}

/** Informes que ya existen en otras pantallas: el catálogo los enlaza */
export interface ReportLink {
  title: string
  description: string
  category: ReportCategory
  roles: readonly EnrollmentRole[]
  route: string
  query?: Record<string, string>
  audience: string
}

const options = (labels: Record<string, string>): ReportOption[] =>
  Object.entries(labels).map(([value, label]) => ({ value, label }))

const groupBy = (choices: Record<string, string>, initial: string): ReportFilter => ({
  key: 'groupBy',
  label: 'Ver',
  type: 'select',
  options: options(choices),
  default: initial,
})

const from = (initial: ReportDefault = 'monthStart'): ReportFilter => ({
  key: 'from',
  label: 'Desde',
  type: 'date',
  default: initial,
  required: true,
})
const to: ReportFilter = { key: 'to', label: 'Hasta', type: 'date', default: 'today', required: true }
const fromMonth = (initial: ReportDefault = 'yearStartMonth'): ReportFilter => ({
  key: 'from',
  label: 'Desde (mes)',
  type: 'month',
  default: initial,
  required: true,
})
const toMonth: ReportFilter = {
  key: 'to',
  label: 'Hasta (mes)',
  type: 'month',
  default: 'month',
  required: true,
}
const building: ReportFilter = {
  key: 'buildingId',
  label: 'Torre',
  type: 'select',
  source: 'buildings',
  emptyLabel: 'Todas',
}
const unitType: ReportFilter = {
  key: 'unitType',
  label: 'Tipo de unidad',
  type: 'select',
  options: options(UNIT_TYPE_LABELS),
  emptyLabel: 'Todos',
}
const cashAccount: ReportFilter = {
  key: 'cashAccountId',
  label: 'Cuenta',
  type: 'select',
  source: 'cashAccounts',
  emptyLabel: 'Todas',
}
const vendor: ReportFilter = {
  key: 'vendorId',
  label: 'Proveedor',
  type: 'select',
  source: 'vendors',
  emptyLabel: 'Todos',
}
const minAmount: ReportFilter = {
  key: 'minAmount',
  label: 'Saldo mínimo',
  type: 'number',
  placeholder: '$ 0',
  min: 0,
}

/** Movimientos que corrigen o deshacen otros (reporte de anulaciones) */
export const ADJUSTMENT_KINDS = [
  'credit_note',
  'cancellation',
  'payment_rejected',
  'payment_reversed',
  'bill_cancelled',
  'vendor_payment_reversed',
  'entry_reversed',
  'parking_exempt',
] as const
export type AdjustmentKind = (typeof ADJUSTMENT_KINDS)[number]

export const ADJUSTMENT_KIND_LABELS: Record<AdjustmentKind, string> = {
  credit_note: CHARGE_ADJUSTMENT_TYPE_LABELS.credit_note,
  cancellation: 'Cobro anulado',
  payment_rejected: 'Pago rechazado',
  payment_reversed: 'Recibo reversado',
  bill_cancelled: 'Factura de proveedor anulada',
  vendor_payment_reversed: 'Egreso reversado',
  entry_reversed: 'Comprobante reversado',
  parking_exempt: 'Parqueadero de visitantes exonerado',
}

export const REPORTS: readonly ReportDefinition[] = [
  // Recaudo y cartera
  {
    key: 'collections',
    title: 'Recaudo',
    description: 'Pagos confirmados en el periodo, por recibo, día, mes, cuenta, medio de pago o torre.',
    category: 'collection',
    roles: FINANCE,
    audience: 'Administración, contador y consejo',
    filters: [
      from(),
      to,
      cashAccount,
      { key: 'method', label: 'Medio de pago', type: 'select', options: options(PAYMENT_METHOD_LABELS), emptyLabel: 'Todos' },
      building,
      groupBy(
        {
          detail: 'Detalle de recibos',
          day: 'Por día',
          month: 'Por mes',
          cash_account: 'Por cuenta',
          method: 'Por medio de pago',
          building: 'Por torre',
        },
        'detail',
      ),
    ],
  },
  {
    key: 'billing_collection',
    title: 'Facturado contra recaudado',
    description: 'Por mes: lo que se cobró, lo que se pagó de esos cobros, los descuentos y el porcentaje de recaudo.',
    category: 'collection',
    roles: FINANCE,
    audience: 'Consejo, revisor fiscal y asamblea',
    filters: [
      fromMonth(),
      toMonth,
      { key: 'conceptId', label: 'Concepto', type: 'select', source: 'concepts', emptyLabel: 'Todos' },
      building,
    ],
  },
  {
    key: 'receivables_aging',
    title: 'Cartera por edades',
    description: 'Saldo de cada unidad por días de vencimiento (al día, 1-30, 31-60, 61-90 y más de 90), con el último pago.',
    category: 'collection',
    roles: FINANCE,
    audience: 'Administración, contador y revisor fiscal',
    filters: [
      building,
      unitType,
      {
        key: 'overdue',
        label: 'Cartera',
        type: 'select',
        options: options({
          all: 'Toda la cartera',
          overdue: 'Solo vencida',
          d30: 'Vencida más de 30 días',
          d60: 'Vencida más de 60 días',
          d90: 'Vencida más de 90 días',
        }),
        default: 'all',
      },
      minAmount,
    ],
  },
  {
    key: 'delinquents',
    title: 'Unidades en mora',
    description: 'Unidades con saldo vencido, cuántos meses deben, su responsable de pago y el último pago. Base para el cobro prejurídico.',
    category: 'collection',
    roles: FINANCE,
    audience: 'Administración y consejo',
    personalData: true,
    filters: [
      building,
      {
        key: 'minMonths',
        label: 'Meses en mora',
        type: 'select',
        options: options({ '1': '1 o más', '2': '2 o más', '3': '3 o más', '6': '6 o más', '12': '12 o más' }),
        default: '1',
      },
      minAmount,
    ],
  },
  {
    key: 'charges_by_concept',
    title: 'Facturación por concepto',
    description: 'Cuotas, intereses, multas y demás conceptos del periodo: cobrado, descuentos, notas crédito, anulado y saldo.',
    category: 'collection',
    roles: FINANCE,
    audience: 'Contador y revisor fiscal',
    filters: [fromMonth(), toMonth, building],
  },
  {
    key: 'credit_balances',
    title: 'Saldos a favor',
    description: 'Anticipos de las unidades: pagos confirmados que aún no se han aplicado a cobros.',
    category: 'collection',
    roles: FINANCE,
    audience: 'Contador y revisor fiscal',
    filters: [building],
  },
  // Bancos y caja
  {
    key: 'cash_flow',
    title: 'Movimiento de bancos y caja',
    description: 'Saldo inicial, entradas, salidas y saldo final de cada cuenta. El detalle sirve para la conciliación bancaria.',
    category: 'treasury',
    roles: FINANCE,
    audience: 'Contador y revisor fiscal',
    filters: [
      from(),
      to,
      cashAccount,
      groupBy({ account: 'Por cuenta', month: 'Por mes', detail: 'Detalle de movimientos' }, 'account'),
    ],
  },
  // Gastos y proveedores
  {
    key: 'expenses',
    title: 'Gastos',
    description: 'Facturas de proveedores causadas en el periodo, por proveedor, cuenta de gasto o mes.',
    category: 'expenses',
    roles: FINANCE,
    audience: 'Consejo, contador y revisor fiscal',
    filters: [
      from('yearStart'),
      to,
      vendor,
      { key: 'accountId', label: 'Cuenta de gasto', type: 'select', source: 'expenseAccounts', emptyLabel: 'Todas' },
      groupBy({ vendor: 'Por proveedor', account: 'Por cuenta de gasto', month: 'Por mes', detail: 'Detalle de facturas' }, 'vendor'),
    ],
  },
  {
    key: 'vendor_payments',
    title: 'Comprobantes de egreso',
    description: 'Pagos a proveedores del periodo con su cuenta de salida y las facturas que cubren.',
    category: 'expenses',
    roles: FINANCE,
    audience: 'Contador y revisor fiscal',
    filters: [from(), to, vendor, cashAccount],
  },
  {
    key: 'withholdings',
    title: 'Retenciones practicadas',
    description: 'Retención en la fuente, de IVA y de ICA por proveedor o por mes: base para declarar y expedir certificados.',
    category: 'expenses',
    roles: FINANCE,
    audience: 'Contador',
    filters: [from('yearStart'), to, vendor, groupBy({ vendor: 'Por proveedor', month: 'Por mes' }, 'vendor')],
  },
  // Control interno
  {
    key: 'adjustments',
    title: 'Anulaciones, notas crédito y reversiones',
    description: 'Todo lo que corrige o deshace un movimiento de dinero, con quién lo hizo y el motivo.',
    category: 'control',
    roles: FINANCE,
    audience: 'Revisor fiscal y consejo',
    filters: [
      from('yearStart'),
      to,
      { key: 'kind', label: 'Tipo', type: 'select', options: options(ADJUSTMENT_KIND_LABELS), emptyLabel: 'Todos' },
      { key: 'userId', label: 'Hecho por', type: 'select', source: 'members', emptyLabel: 'Cualquiera' },
    ],
  },
  {
    key: 'members_access',
    title: 'Accesos al backoffice',
    description: 'Quién tiene acceso, con qué rol y vigencia, quién lo invitó y cuándo entró por última vez.',
    category: 'control',
    roles: OPERATIONS,
    audience: 'Revisor fiscal y consejo',
    personalData: true,
    filters: [
      {
        key: 'role',
        label: 'Rol',
        type: 'select',
        options: options(Object.fromEntries(Object.entries(ROLE_LABELS).filter(([role]) => role !== 'resident'))),
        emptyLabel: 'Todos',
      },
      { key: 'status', label: 'Estado', type: 'select', options: options(ENROLLMENT_STATUS_LABELS), emptyLabel: 'Todos' },
    ],
  },
  // Operación
  {
    key: 'tickets',
    title: 'PQRS',
    description: 'Solicitudes por estado, tipo, prioridad, responsable o mes, con el tiempo de respuesta y las vencidas.',
    category: 'operations',
    roles: OPERATIONS,
    audience: 'Administración y consejo',
    filters: [
      from('yearStart'),
      to,
      { key: 'type', label: 'Tipo', type: 'select', options: options(TICKET_TYPE_LABELS), emptyLabel: 'Todos' },
      { key: 'status', label: 'Estado', type: 'select', options: options(TICKET_STATUS_LABELS), emptyLabel: 'Todos' },
      { key: 'priority', label: 'Prioridad', type: 'select', options: options(TICKET_PRIORITY_LABELS), emptyLabel: 'Todas' },
      building,
      groupBy(
        {
          status: 'Por estado',
          type: 'Por tipo',
          priority: 'Por prioridad',
          assignee: 'Por responsable',
          month: 'Por mes',
          building: 'Por torre',
          detail: 'Detalle de solicitudes',
        },
        'type',
      ),
    ],
  },
  {
    key: 'amenities',
    title: 'Uso de zonas comunes',
    description: 'Reservas, horas reservadas, ingresos, depósitos y cancelaciones por zona, mes o unidad.',
    category: 'operations',
    roles: OPERATIONS,
    audience: 'Administración y consejo',
    filters: [
      from('yearStart'),
      to,
      { key: 'amenityId', label: 'Zona', type: 'select', source: 'amenities', emptyLabel: 'Todas' },
      groupBy({ amenity: 'Por zona', month: 'Por mes', unit: 'Por unidad', detail: 'Detalle de reservas' }, 'amenity'),
    ],
  },
  {
    key: 'gatehouse',
    title: 'Portería: visitas y paquetes',
    description: 'Visitantes por tipo, paquetes recibidos y entregados, pendientes y tiempo promedio de entrega.',
    category: 'operations',
    roles: OPERATIONS,
    audience: 'Administración y consejo',
    filters: [from(), to, groupBy({ day: 'Por día', month: 'Por mes', building: 'Por torre' }, 'day')],
  },
  {
    key: 'visitor_parking',
    title: 'Parqueadero de visitantes',
    description: 'Ingresos, tiempo de permanencia, lo recaudado en portería o cargado a las unidades y las exoneraciones.',
    category: 'operations',
    roles: FINANCE,
    audience: 'Administración, contador y consejo',
    filters: [
      from(),
      to,
      groupBy({ day: 'Por día', month: 'Por mes', settlement: 'Por forma de pago', unit: 'Por unidad visitada' }, 'day'),
    ],
  },
  // Comunidad
  {
    key: 'announcements',
    title: 'Lectura de comunicados',
    description: 'Comunicados publicados con su audiencia, cuántas personas los leyeron y los correos enviados.',
    category: 'community',
    roles: OPERATIONS,
    audience: 'Administración y consejo',
    filters: [from('yearStart'), to],
  },
  {
    key: 'surveys',
    title: 'Participación en encuestas',
    description: 'Unidades y coeficiente que respondieron cada encuesta frente a la participación mínima.',
    category: 'community',
    roles: OPERATIONS,
    audience: 'Consejo y revisor fiscal',
    filters: [from('yearStart'), to],
  },
  {
    key: 'document_access',
    title: 'Consulta de documentos',
    description: 'Quién abrió o descargó los documentos del conjunto (actas, estados financieros, contratos).',
    category: 'community',
    roles: OPERATIONS,
    audience: 'Administración y revisor fiscal',
    personalData: true,
    filters: [
      from(),
      to,
      groupBy({ document: 'Por documento', user: 'Por persona', detail: 'Detalle de consultas' }, 'document'),
    ],
  },
  // Censo
  {
    key: 'census',
    title: 'Censo de unidades',
    description: 'Unidades con coeficiente, área, propietarios, arrendatarios, vehículos y mascotas. Señala los datos que faltan.',
    category: 'census',
    roles: OPERATIONS,
    audience: 'Administración y consejo',
    personalData: true,
    filters: [
      building,
      unitType,
      { key: 'status', label: 'Estado', type: 'select', options: options(UNIT_STATUS_LABELS), emptyLabel: 'Todos' },
      {
        key: 'issue',
        label: 'Datos',
        type: 'select',
        options: options({
          no_owner: 'Sin propietario registrado',
          no_contact: 'Sin teléfono ni correo de contacto',
          no_account: 'Ningún residente con cuenta en el portal',
          no_coefficient: 'Sin coeficiente',
        }),
        emptyLabel: 'Todas las unidades',
      },
    ],
  },
  {
    key: 'vehicles',
    title: 'Vehículos y documentos',
    description: 'Vehículos registrados por unidad con el vencimiento del SOAT y de la revisión técnico-mecánica.',
    category: 'census',
    roles: OPERATIONS,
    audience: 'Administración y seguridad',
    personalData: true,
    filters: [
      building,
      { key: 'type', label: 'Tipo', type: 'select', options: options(VEHICLE_TYPE_LABELS), emptyLabel: 'Todos' },
      {
        key: 'documents',
        label: 'Documentos',
        type: 'select',
        options: options({
          all: 'Todos los vehículos',
          expired: 'Con SOAT o revisión vencidos',
          expiring: 'Vencen en los próximos 30 días',
          missing: 'Sin fechas registradas',
        }),
        default: 'all',
      },
    ],
  },
  {
    key: 'parking',
    title: 'Ocupación de parqueaderos',
    description: 'Parqueaderos propios y comunales, a quién están asignados, desde cuándo y la tarifa mensual.',
    category: 'census',
    roles: OPERATIONS,
    audience: 'Administración y consejo',
    filters: [
      { key: 'vehicleType', label: 'Tipo', type: 'select', options: options(VEHICLE_TYPE_LABELS), emptyLabel: 'Todos' },
      {
        key: 'ownership',
        label: 'Propiedad',
        type: 'select',
        options: options({ private: 'Propios', communal: 'Comunales' }),
        emptyLabel: 'Todos',
      },
      {
        key: 'state',
        label: 'Estado',
        type: 'select',
        options: options({ assigned: 'Asignados', free: 'Libres', inactive: 'Fuera de servicio' }),
        emptyLabel: 'Todos',
      },
    ],
  },
]

/** Informes de otras pantallas que el catálogo también muestra */
export const REPORT_LINKS: readonly ReportLink[] = [
  {
    title: 'Estados financieros',
    description: 'Estado de resultados, balance general, balance de prueba y libro auxiliar.',
    category: 'treasury',
    roles: FINANCE,
    route: 'finance-reports',
    audience: 'Contador, revisor fiscal y asamblea',
  },
  {
    title: 'Ejecución presupuestal',
    description: 'Presupuesto aprobado contra lo causado, por cuenta y con el porcentaje de ejecución.',
    category: 'expenses',
    roles: FINANCE,
    route: 'finance-budgets',
    audience: 'Consejo y asamblea',
  },
  {
    title: 'Bitácora de auditoría',
    description: 'Cambios en dinero, censo, permisos y configuración: quién, cuándo, desde dónde y qué cambió.',
    category: 'control',
    roles: [ADMIN, ACCOUNTANT, COUNCIL, REVIEWER],
    route: 'audit',
    audience: 'Revisor fiscal y consejo',
  },
]

export const reportByKey = (key: string) => REPORTS.find((report) => report.key === key)

export const canReadReport = (report: { roles: readonly EnrollmentRole[] }, roles: readonly EnrollmentRole[]) =>
  report.roles.some((role) => roles.includes(role))

// Resultados

export type ReportCell = string | number | null

/**
 * `money`: "1234.50" · `number`: entero o decimal · `percent`: 0-100 ·
 * `date`: "2026-11-27" · `datetime`: ISO con zona · `month`: "2026-11-01"
 */
export type ReportColumnType = 'text' | 'money' | 'number' | 'percent' | 'date' | 'datetime' | 'month' | 'hours'

export interface ReportColumn {
  key: string
  label: string
  type: ReportColumnType
}

export interface ReportMetric {
  label: string
  value: ReportCell
  type: ReportColumnType
  hint?: string
  tone?: 'neutral' | 'good' | 'warning' | 'danger'
}

export interface ReportResult {
  key: string
  title: string
  /** "Del 1 nov 2026 al 27 nov 2026" */
  period: string | null
  generatedAt: string
  /** Filtros aplicados, ya en texto */
  filters: Array<{ label: string; value: string }>
  summary: ReportMetric[]
  columns: ReportColumn[]
  rows: Array<Record<string, ReportCell>>
  totals: Record<string, ReportCell> | null
  truncated: boolean
  notes: string[]
  /** Cada fila abre esta ruta del backoffice (`params`: nombre del parámetro → columna) */
  rowLink?: { route: string; params: Record<string, string> }
}

export const REPORT_EXPORT_FORMATS = ['xlsx', 'csv'] as const
export type ReportExportFormat = (typeof REPORT_EXPORT_FORMATS)[number]
