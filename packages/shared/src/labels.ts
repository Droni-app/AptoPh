/**
 * Spanish labels for enum values, shared by the web apps
 */
import type { EnrollmentRole } from './index.js'
import type {
  BookingStatus,
  ChargeStatus,
  DocumentType,
  ParcelStatus,
  TicketPriority,
  TicketStatus,
  TicketType,
  VisitType,
  EnrollmentStatus,
  OccupantRelationship,
  PetSpecies,
  UnitStatus,
  UnitType,
  VehicleType,
} from './domain.js'

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

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  car: 'Carro',
  motorcycle: 'Moto',
  bicycle: 'Bicicleta',
  other: 'Otro',
}

export const PET_SPECIES_LABELS: Record<PetSpecies, string> = {
  dog: 'Perro',
  cat: 'Gato',
  other: 'Otra',
}

export const CHARGE_STATUS_LABELS: Record<ChargeStatus, string> = {
  pending: 'Pendiente',
  partially_paid: 'Abonado',
  paid: 'Pagado',
  cancelled: 'Anulado',
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  CC: 'Cédula de ciudadanía',
  CE: 'Cédula de extranjería',
  NIT: 'NIT',
  PP: 'Pasaporte',
  TI: 'Tarjeta de identidad',
}

export const VISIT_TYPE_LABELS: Record<VisitType, string> = {
  guest: 'Invitado',
  delivery: 'Domicilio',
  service_provider: 'Servicio técnico',
  other: 'Otro',
}

export const PARCEL_STATUS_LABELS: Record<ParcelStatus, string> = {
  pending: 'Por recoger',
  delivered: 'Entregado',
  returned: 'Devuelto',
}

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending: 'Por aprobar',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  cancelled: 'Cancelada',
}

export const TICKET_TYPE_LABELS: Record<TicketType, string> = {
  petition: 'Petición',
  complaint: 'Queja',
  claim: 'Reclamo',
  suggestion: 'Sugerencia',
  maintenance: 'Mantenimiento',
}

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  urgent: 'Urgente',
}

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Abierta',
  in_progress: 'En trámite',
  resolved: 'Resuelta',
  closed: 'Cerrada',
}
