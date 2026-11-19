/**
 * Tipos y constantes compartidos entre la API y las apps web.
 * La app móvil (Flutter) no consume este paquete: replica los contratos en Dart.
 */

/** Rol de un usuario dentro de un tenant (tabla `enrollments`). Ver docs/database-model.md */
export const EnrollmentRole = {
  Administrator: 'administrator',
  CouncilMember: 'council_member',
  Accountant: 'accountant',
  FiscalReviewer: 'fiscal_reviewer',
  Staff: 'staff',
  SecurityGuard: 'security_guard',
  Resident: 'resident',
} as const

export type EnrollmentRole = (typeof EnrollmentRole)[keyof typeof EnrollmentRole]

/** Roles con acceso al backoffice (backoffice). */
export const BACKOFFICE_ROLES: readonly EnrollmentRole[] = [
  EnrollmentRole.Administrator,
  EnrollmentRole.CouncilMember,
  EnrollmentRole.Accountant,
  EnrollmentRole.FiscalReviewer,
  EnrollmentRole.Staff,
  EnrollmentRole.SecurityGuard,
]

/** Pueden ver finanzas y contabilidad */
export const FINANCE_READ_ROLES: readonly EnrollmentRole[] = [
  EnrollmentRole.Administrator,
  EnrollmentRole.Accountant,
  EnrollmentRole.CouncilMember,
  EnrollmentRole.FiscalReviewer,
]

/** Pueden facturar, registrar pagos, gastos y comprobantes */
export const FINANCE_WRITE_ROLES: readonly EnrollmentRole[] = [
  EnrollmentRole.Administrator,
  EnrollmentRole.Accountant,
]

export const ENROLLMENT_ROLES = Object.values(EnrollmentRole)

export * from './domain.js'
export * from './labels.js'
export * from './billing.js'
export * from './money.js'
export * from './finance.js'
export * from './files.js'
export * from './announcements.js'
export * from './email_quota.js'
export * from './payments.js'
export type * from './api.js'
export type * from './finance-api.js'
