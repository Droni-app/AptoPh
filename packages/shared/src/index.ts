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

export const ENROLLMENT_ROLES = Object.values(EnrollmentRole)

export * from './domain.js'
export * from './labels.js'
export type * from './api.js'
