/**
 * Spanish labels for enum values, shared by the web apps
 */
import type { EnrollmentRole } from './index.js'
import type {
  AccountClass,
  BankAccountKind,
  BillStatus,
  BillingPeriodStatus,
  BookingStatus,
  BudgetStatus,
  CashAccountType,
  ChargeAdjustmentType,
  ChargeConceptType,
  ChargeSource,
  ChargeStatus,
  FeeMethod,
  JournalEntryType,
  PaymentApplicationOrder,
  PaymentMethod,
  PaymentStatus,
  RoundingMode,
  VendorPaymentStatus,
  DocumentType,
  ParcelStatus,
  TicketPriority,
  TicketStatus,
  TicketType,
  VisitType,
  EnrollmentStatus,
  OccupantRelationship,
  PetSpecies,
  PropertyType,
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

/** What each role can do, shown when inviting someone */
export const ROLE_DESCRIPTIONS: Record<EnrollmentRole, string> = {
  administrator: 'Gestiona todo el conjunto: censo, personas, cartera y configuración.',
  council_member: 'Consulta la información del conjunto en el panel de administración.',
  accountant: 'Consulta la información del conjunto en el panel de administración.',
  fiscal_reviewer: 'Consulta la información del conjunto en el panel de administración.',
  staff: 'Consulta la información del conjunto en el panel de administración.',
  security_guard: 'Consulta la información del conjunto en el panel de administración.',
  resident: 'Usa el portal de residentes: estado de cuenta, reservas, visitas y PQRS.',
}

export const ENROLLMENT_STATUS_LABELS: Record<EnrollmentStatus, string> = {
  invited: 'Invitado',
  active: 'Activo',
  suspended: 'Suspendido',
  revoked: 'Retirado',
}

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  residential: 'Residencial',
  commercial: 'Comercial',
  mixed: 'Mixto',
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

export const CHARGE_CONCEPT_TYPE_LABELS: Record<ChargeConceptType, string> = {
  ordinary_fee: 'Cuota ordinaria de administración',
  extraordinary_fee: 'Cuota extraordinaria',
  interest: 'Intereses de mora',
  fine: 'Multa o sanción',
  parking: 'Parqueadero',
  visitor_parking: 'Parqueadero de visitantes',
  amenity_booking: 'Reserva de zona común',
  service: 'Servicio',
  opening_balance: 'Saldo inicial',
  other: 'Otro cobro',
}

export const CHARGE_SOURCE_LABELS: Record<ChargeSource, string> = {
  recurring: 'Facturación mensual',
  interest: 'Intereses de mora',
  manual: 'Cobro manual',
  parking: 'Parqueadero',
  visitor_parking: 'Parqueadero de visitantes',
  amenity_booking: 'Reserva de zona común',
}

export const CHARGE_ADJUSTMENT_TYPE_LABELS: Record<ChargeAdjustmentType, string> = {
  early_payment_discount: 'Descuento por pronto pago',
  credit_note: 'Nota crédito',
  cancellation: 'Anulación',
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  bank_transfer: 'Transferencia',
  card: 'Tarjeta',
  pse: 'PSE',
  consignment: 'Consignación',
  check: 'Cheque',
  other: 'Otro',
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending_review: 'Por confirmar',
  confirmed: 'Confirmado',
  rejected: 'Rechazado',
  reversed: 'Reversado',
}

export const PAYMENT_APPLICATION_ORDER_LABELS: Record<PaymentApplicationOrder, string> = {
  interest_first: 'Primero intereses, luego lo más antiguo',
  oldest_first: 'Lo más antiguo primero',
}

export const FEE_METHOD_LABELS: Record<FeeMethod, string> = {
  coefficient: 'Por coeficiente de copropiedad',
  module: 'Por módulos de contribución',
  area: 'Por área privada (m²)',
  equal: 'Partes iguales',
  fixed_by_type: 'Valor fijo por tipo de unidad',
}

export const FEE_METHOD_DESCRIPTIONS: Record<FeeMethod, string> = {
  coefficient:
    'Lo usual en propiedad horizontal: cada unidad paga según su coeficiente del reglamento.',
  module:
    'Para conjuntos mixtos o comerciales: cada sector (residencial, comercial, parqueaderos…) tiene su presupuesto y sus coeficientes.',
  area: 'Cada unidad paga según sus metros cuadrados privados.',
  equal: 'Todas las unidades pagan lo mismo.',
  fixed_by_type: 'Un valor fijo para cada tipo de unidad: apartamento, local, parqueadero…',
}

export const ROUNDING_MODE_LABELS: Record<RoundingMode, string> = {
  nearest: 'Al más cercano',
  up: 'Hacia arriba',
}

export const BILLING_PERIOD_STATUS_LABELS: Record<BillingPeriodStatus, string> = {
  open: 'Abierto',
  closed: 'Cerrado',
}

export const ACCOUNT_CLASS_LABELS: Record<AccountClass, string> = {
  asset: 'Activo',
  liability: 'Pasivo',
  equity: 'Patrimonio',
  income: 'Ingresos',
  expense: 'Gastos',
}

export const JOURNAL_ENTRY_TYPE_LABELS: Record<JournalEntryType, string> = {
  billing: 'Facturación',
  charge: 'Cobro',
  charge_adjustment: 'Nota a cartera',
  payment: 'Recibo de caja',
  credit_application: 'Aplicación de anticipo',
  payment_reversal: 'Reversión de pago',
  bill: 'Cuenta por pagar',
  vendor_payment: 'Comprobante de egreso',
  transfer: 'Traslado',
  reserve_fund: 'Fondo de imprevistos',
  opening: 'Saldo inicial',
  manual: 'Nota de contabilidad',
  reversal: 'Reversión',
  visitor_parking: 'Parqueadero de visitantes',
  amenity_booking: 'Reserva de zona común',
  amenity_deposit: 'Depósito de zona común',
}

export const CASH_ACCOUNT_TYPE_LABELS: Record<CashAccountType, string> = {
  bank: 'Cuenta bancaria',
  cash: 'Caja',
}

export const BANK_ACCOUNT_KIND_LABELS: Record<BankAccountKind, string> = {
  savings: 'Ahorros',
  checking: 'Corriente',
}

export const BILL_STATUS_LABELS: Record<BillStatus, string> = {
  pending: 'Por pagar',
  partially_paid: 'Abonada',
  paid: 'Pagada',
  cancelled: 'Anulada',
}

export const VENDOR_PAYMENT_STATUS_LABELS: Record<VendorPaymentStatus, string> = {
  confirmed: 'Pagado',
  reversed: 'Reversado',
}

export const BUDGET_STATUS_LABELS: Record<BudgetStatus, string> = {
  draft: 'Borrador',
  approved: 'Aprobado',
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
