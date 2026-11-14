/**
 * Spanish labels for enum values, shared by the web apps
 */
import type { EnrollmentRole } from './index.js'
import type { EnrollmentStatus, OccupantRelationship, UnitStatus, UnitType } from './domain.js'

export const ROLE_LABELS: Record<EnrollmentRole, string> = {
  administrator: 'Administración',
  council_member: 'Consejo de administración',
  accountant: 'Contabilidad',
  fiscal_reviewer: 'Revisoría fiscal',
  staff: 'Personal operativo',
  security_guard: 'Vigilancia',
  resident: 'Residente',
}

export const ENROLLMENT_STATUS_LABELS: Record<EnrollmentStatus, string> = {
  invited: 'Invitado',
  active: 'Activo',
  suspended: 'Suspendido',
  revoked: 'Revocado',
}

export const UNIT_TYPE_LABELS: Record<UnitType, string> = {
  apartment: 'Apartamento',
  house: 'Casa',
  commercial: 'Local comercial',
  parking: 'Parqueadero',
  storage: 'Depósito',
}

export const UNIT_STATUS_LABELS: Record<UnitStatus, string> = {
  occupied: 'Ocupada',
  vacant: 'Desocupada',
  under_construction: 'En construcción',
}

export const OCCUPANT_RELATIONSHIP_LABELS: Record<OccupantRelationship, string> = {
  owner: 'Propietario',
  renter: 'Arrendatario',
  family_member: 'Familiar',
  domestic_worker: 'Empleado doméstico',
  other: 'Otro',
}
