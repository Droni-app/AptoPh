/**
 * Bitácora de auditoría (docs/audit.md): qué se registra, cómo se agrupa y
 * quién la consulta.
 */
import type { EnrollmentRole } from './index.js'

/** Consultan toda la bitácora */
export const AUDIT_FULL_ROLES: readonly EnrollmentRole[] = [
  'administrator',
  'fiscal_reviewer',
  'council_member',
]
/** Consultan la bitácora: el contador solo ve el módulo de finanzas */
export const AUDIT_READ_ROLES: readonly EnrollmentRole[] = [...AUDIT_FULL_ROLES, 'accountant']

export const AUDIT_MODULES = [
  'finance',
  'census',
  'access',
  'settings',
  'communication',
  'operations',
  'reports',
] as const
export type AuditModule = (typeof AUDIT_MODULES)[number]

export const AUDIT_MODULE_LABELS: Record<AuditModule, string> = {
  finance: 'Finanzas',
  census: 'Censo',
  access: 'Accesos y permisos',
  settings: 'Configuración',
  communication: 'Comunicación',
  operations: 'Operación',
  reports: 'Reportes',
}

/** Tipo de registro (`auditable_type`, el nombre de la tabla) → módulo y nombre */
export const AUDITABLE_TYPES = {
  payments: { module: 'finance', label: 'Recibo de caja' },
  charges: { module: 'finance', label: 'Cobro' },
  charge_adjustments: { module: 'finance', label: 'Ajuste de cobro' },
  billing_periods: { module: 'finance', label: 'Facturación del mes' },
  recurring_charges: { module: 'finance', label: 'Tarifa de una unidad' },
  fee_schedules: { module: 'finance', label: 'Cálculo de cuotas' },
  charge_concepts: { module: 'finance', label: 'Concepto de cobro' },
  ledger_accounts: { module: 'finance', label: 'Cuenta contable' },
  journal_entries: { module: 'finance', label: 'Comprobante contable' },
  cash_accounts: { module: 'finance', label: 'Banco o caja' },
  vendors: { module: 'finance', label: 'Proveedor' },
  bills: { module: 'finance', label: 'Factura de proveedor' },
  vendor_payments: { module: 'finance', label: 'Comprobante de egreso' },
  budgets: { module: 'finance', label: 'Presupuesto' },
  contribution_modules: { module: 'finance', label: 'Módulo de contribución' },
  parking_stays: { module: 'finance', label: 'Parqueadero de visitantes' },
  buildings: { module: 'census', label: 'Torre' },
  units: { module: 'census', label: 'Unidad' },
  unit_occupants: { module: 'census', label: 'Persona de una unidad' },
  vehicles: { module: 'census', label: 'Vehículo' },
  pets: { module: 'census', label: 'Mascota' },
  parking_spots: { module: 'census', label: 'Parqueadero' },
  parking_assignments: { module: 'census', label: 'Asignación de parqueadero' },
  parking_lotteries: { module: 'census', label: 'Sorteo de parqueaderos' },
  enrollments: { module: 'access', label: 'Acceso de una persona' },
  tenants: { module: 'settings', label: 'Datos del conjunto' },
  amenities: { module: 'settings', label: 'Zona común' },
  announcements: { module: 'communication', label: 'Comunicado' },
  documents: { module: 'communication', label: 'Documento' },
  surveys: { module: 'communication', label: 'Encuesta' },
  amenity_bookings: { module: 'operations', label: 'Reserva' },
  tickets: { module: 'operations', label: 'PQRS' },
  reports: { module: 'reports', label: 'Reporte' },
} as const satisfies Record<string, { module: AuditModule; label: string }>

export type AuditableType = keyof typeof AUDITABLE_TYPES

export const auditTypesOf = (module: AuditModule) =>
  (Object.keys(AUDITABLE_TYPES) as AuditableType[]).filter(
    (type) => AUDITABLE_TYPES[type].module === module,
  )

export const AUDIT_ACTIONS = ['created', 'updated', 'deleted', 'restored', 'exported'] as const
export type AuditAction = (typeof AUDIT_ACTIONS)[number]

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  created: 'Creó',
  updated: 'Modificó',
  deleted: 'Eliminó',
  restored: 'Restauró',
  exported: 'Exportó',
}

/** Nombres de los campos más comunes en los cambios; los demás se muestran tal cual */
export const AUDIT_FIELD_LABELS: Record<string, string> = {
  // Exported reports
  report: 'Reporte',
  format: 'Formato',
  rows: 'Filas',
  filters: 'Filtros',
  personalData: 'Datos personales',
  amount: 'Valor',
  balance: 'Saldo',
  status: 'Estado',
  name: 'Nombre',
  code: 'Código',
  title: 'Título',
  description: 'Descripción',
  notes: 'Notas',
  reason: 'Motivo',
  type: 'Tipo',
  role: 'Rol',
  method: 'Medio de pago',
  reference: 'Referencia',
  number: 'Número',
  paidAt: 'Fecha de pago',
  paidOn: 'Fecha de pago',
  dueOn: 'Vencimiento',
  period: 'Periodo',
  issuedOn: 'Fecha de la factura',
  unitId: 'Unidad',
  vendorId: 'Proveedor',
  cashAccountId: 'Cuenta',
  buildingId: 'Torre',
  ownershipCoefficient: 'Coeficiente',
  privateArea: 'Área privada',
  floor: 'Piso',
  fullName: 'Nombre',
  email: 'Correo',
  phone: 'Teléfono',
  documentType: 'Tipo de documento',
  documentNumber: 'Documento',
  relationship: 'Relación',
  isPrimaryContact: 'Contacto principal',
  isBillingResponsible: 'Responsable de pago',
  startsOn: 'Desde',
  endsOn: 'Hasta',
  plate: 'Placa',
  settings: 'Configuración',
  rejectionReason: 'Motivo del rechazo',
  reversalReason: 'Motivo de la reversión',
  cancellationReason: 'Motivo de la anulación',
  cancelledAt: 'Anulado el',
  reversedAt: 'Reversado el',
  reviewedAt: 'Revisado el',
  publishedAt: 'Publicado el',
  archivedAt: 'Archivado el',
  deletedAt: 'Eliminado el',
  closedAt: 'Cerrado el',
  isActive: 'Activo',
  monthlyTotal: 'Total mensual',
  monthlyRate: 'Tarifa mensual',
  annualAmount: 'Valor anual',
  total: 'Total',
  subtotal: 'Subtotal',
  settlement: 'Forma de pago',
  exemptReason: 'Motivo de la exoneración',
  assignedToId: 'Responsable',
  priority: 'Prioridad',
  visibility: 'Visibilidad',
  audience: 'Audiencia',
  bookingFee: 'Tarifa',
  depositAmount: 'Depósito',
  depositStatus: 'Estado del depósito',
  depositRetained: 'Depósito retenido',
  interestRate: 'Tasa de mora',
  discountRate: 'Descuento por pronto pago',
  legalName: 'Razón social',
  taxId: 'NIT',
}

export type AuditChanges = {
  /** Cómo se lee el registro: "Recibo 123", "Unidad 302" */
  label?: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  /** Datos de una acción que no es un cambio (p. ej. los filtros de un reporte exportado) */
  details?: Record<string, unknown>
}

export interface AuditLogEntry {
  id: string
  action: AuditAction
  type: string
  typeLabel: string
  module: AuditModule | null
  recordId: string | null
  label: string | null
  user: { id: string; fullName: string; email: string } | null
  ipAddress: string | null
  createdAt: string
  /** Campos que cambiaron (sin los valores, para la lista) */
  fields: string[]
}

export interface AuditLogDetail extends AuditLogEntry {
  changes: AuditChanges | null
}
