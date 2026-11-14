/**
 * Tipos y constantes compartidos entre la API y las apps web.
 * La app móvil (Flutter) no consume este paquete: replica los contratos en Dart.
 */

/** Roles dentro de una copropiedad (conjunto). */
export const CommunityRole = {
  Administrator: 'administrator',
  CouncilMember: 'council_member',
  Accountant: 'accountant',
  FiscalReviewer: 'fiscal_reviewer',
  Security: 'security',
  Owner: 'owner',
  Tenant: 'tenant',
} as const

export type CommunityRole = (typeof CommunityRole)[keyof typeof CommunityRole]

/** Roles con acceso al backoffice (web-admin). */
export const BACKOFFICE_ROLES: readonly CommunityRole[] = [
  CommunityRole.Administrator,
  CommunityRole.CouncilMember,
  CommunityRole.Accountant,
  CommunityRole.FiscalReviewer,
  CommunityRole.Security,
]

/** Roles de residentes (web-residents y app móvil). */
export const RESIDENT_ROLES: readonly CommunityRole[] = [CommunityRole.Owner, CommunityRole.Tenant]
