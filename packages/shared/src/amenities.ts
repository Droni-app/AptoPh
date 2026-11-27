import type { EnrollmentRole } from "./index.js";
import type { BookingStatus, PaymentMethod } from "./domain.js";
import type { UnitRef } from "./api.js";

/**
 * Zonas comunes y sus reservas (docs/amenities.md).
 */

/** Quién administra las zonas y aprueba las reservas */
export const AMENITY_MANAGE_ROLES: readonly EnrollmentRole[] = ["administrator"];
/** Quién ve el calendario en el backoffice (portería sabe quién tiene el salón hoy) */
export const AMENITY_READ_ROLES: readonly EnrollmentRole[] = [
  "administrator",
  "staff",
  "security_guard",
  "council_member",
];

/** Cómo se agenda la zona */
export const BOOKING_MODES = ["hours", "days", "shifts"] as const;
export type BookingMode = (typeof BOOKING_MODES)[number];
export const BOOKING_MODE_LABELS: Record<BookingMode, string> = {
  hours: "Por horas",
  days: "Por días",
  shifts: "Por turnos",
};
/** La unidad de la tarifa de cada modalidad */
export const BOOKING_MODE_UNITS: Record<BookingMode, [string, string]> = {
  hours: ["hora", "horas"],
  days: ["día", "días"],
  shifts: ["turno", "turnos"],
};

/** Cómo se paga la tarifa de una unidad */
export const AMENITY_PAYMENT_MODES = ["prepaid", "statement"] as const;
export type AmenityPaymentMode = (typeof AMENITY_PAYMENT_MODES)[number];
export const AMENITY_PAYMENT_MODE_LABELS: Record<AmenityPaymentMode, string> = {
  prepaid: "Pago anticipado con soporte",
  statement: "Cargo a la cuenta de la unidad",
};
export const AMENITY_PAYMENT_MODE_DESCRIPTIONS: Record<AmenityPaymentMode, string> = {
  prepaid:
    "El residente paga antes y adjunta el soporte. Al aprobar se registra el cobro y el recibo de caja.",
  statement: "Al aprobar se suma un cargo al estado de cuenta y se paga con la siguiente cuota.",
};

/** A nombre de quién es la reserva */
export const BOOKING_TYPES = ["resident", "guest", "external", "block"] as const;
export type BookingType = (typeof BOOKING_TYPES)[number];
export const BOOKING_TYPE_LABELS: Record<BookingType, string> = {
  resident: "Residente",
  guest: "Invitado de un residente",
  external: "Tercero externo",
  block: "Bloqueo",
};

/** El depósito de garantía después del evento */
export const DEPOSIT_STATUSES = ["held", "returned", "retained"] as const;
export type DepositStatus = (typeof DEPOSIT_STATUSES)[number];
export const DEPOSIT_STATUS_LABELS: Record<DepositStatus, string> = {
  held: "Depósito recibido",
  returned: "Depósito devuelto",
  retained: "Depósito descontado",
};

export const WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;
export type Weekday = (typeof WEEKDAYS)[number];
export const WEEKDAY_LABELS: Record<Weekday, string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miércoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sábado",
  sunday: "Domingo",
};

export type AmenityShift = {
  id: string;
  name: string;
  /** "HH:mm" local; endsAt "24:00" = medianoche */
  startsAt: string;
  endsAt: string;
};

/** Reglas de uso (amenities.rules). Todas opcionales salvo lo que la modalidad exige */
export type AmenityRules = {
  /** "HH:mm" local al conjunto (modalidad por horas) */
  opensAt?: string;
  closesAt?: string;
  closedOn?: Weekday[];
  /** Por horas: bloques de 30 o 60 minutos */
  slotMinutes?: 30 | 60;
  minHours?: number;
  maxHours?: number;
  /** Por días: máximo de días seguidos */
  maxDays?: number;
  /** Por turnos */
  shifts?: AmenityShift[];
  /** Anticipación mínima en horas y máxima en días */
  minNoticeHours?: number;
  maxDaysAhead?: number;
  /** Limpieza entre una reserva y la siguiente */
  bufferMinutes?: number;
  /** Por unidad: reservas futuras activas, y reservas en un mes */
  maxActivePerUnit?: number;
  maxPerMonthPerUnit?: number;
  /** El residente cancela sin intervención hasta N horas antes */
  cancelHours?: number;
};

export const DEFAULT_MAX_DAYS_AHEAD = 90;

export type Amenity = {
  id: string;
  name: string;
  description: string | null;
  capacity: number | null;
  bookingMode: BookingMode;
  /** Tarifa por hora, día o turno para unidades; null = sin costo */
  bookingFee: string | null;
  /** Tarifa para terceros externos */
  externalFee: string | null;
  depositAmount: string | null;
  paymentMode: AmenityPaymentMode;
  requiresApproval: boolean;
  allowDelinquent: boolean;
  allowGuests: boolean;
  allowExternal: boolean;
  terms: string | null;
  color: string | null;
  rules: AmenityRules;
  isActive: boolean;
};

/** Lo que el backoffice envía: las tarifas en pesos como número */
export type AmenityInput = Omit<Amenity, "id" | "bookingFee" | "externalFee" | "depositAmount"> & {
  bookingFee: number | null;
  externalFee: number | null;
  depositAmount: number | null;
};

export type BookingHolder = {
  name: string;
  document: string | null;
  phone: string | null;
  email: string | null;
};

/** El horario pedido según la modalidad */
export type BookingSlotInput =
  | { startsAt: string; endsAt: string }
  | { date: string; days: number }
  | { date: string; shiftIds: string[] };

export type BookingCreateInput = {
  amenityId: string;
  bookingType: BookingType;
  unitId?: string | null;
  holder?: BookingHolder | null;
  guestsCount?: number | null;
  notes?: string | null;
  paymentReference?: string | null;
  acceptTerms?: boolean;
} & Partial<{ startsAt: string; endsAt: string; date: string; days: number; shiftIds: string[] }>;

/** Lo que cuesta una reserva: lo que el soporte de pago debe cubrir */
export type BookingQuote = {
  quantity: number;
  unitFee: string;
  fee: string;
  deposit: string;
  /** Cuánto se paga antes (con soporte): tarifa anticipada y depósito */
  payNow: string;
  /** Cuánto llega al estado de cuenta al aprobar */
  toStatement: string;
};

export type BookingSlot = {
  startsAt: string;
  endsAt: string;
  /** Hasta cuándo queda bloqueada (fin + limpieza) */
  blockedUntil: string;
};

/** Ocupación pública de una zona: sin datos de quién reservó */
export type AmenityAvailability = {
  amenityId: string;
  from: string;
  to: string;
  busy: Array<BookingSlot & { status: BookingStatus; isBlock: boolean }>;
};

export type Booking = {
  id: string;
  number: number;
  amenity: { id: string; name: string; bookingMode: BookingMode; color: string | null };
  bookingType: BookingType;
  unit: UnitRef | null;
  holder: BookingHolder | null;
  requestedBy: { id: string; fullName: string } | null;
  startsAt: string;
  endsAt: string;
  blockedUntil: string;
  guestsCount: number | null;
  notes: string | null;
  status: BookingStatus;
  feeAmount: string;
  depositAmount: string;
  paymentMode: AmenityPaymentMode | null;
  paymentReference: string | null;
  attachmentCount: number;
  reviewNote: string | null;
  reviewedAt: string | null;
  reviewedBy: { id: string; fullName: string } | null;
  cancellationReason: string | null;
  cancelledAt: string | null;
  chargeId: string | null;
  paymentId: string | null;
  depositStatus: DepositStatus | null;
  depositRetained: string | null;
  depositNote: string | null;
  createdAt: string;
  isMine: boolean;
  canCancel: boolean;
};

/** Aprobar: si hay dinero recibido (pago anticipado o depósito) se dice a qué cuenta entró */
export type BookingApproveInput = {
  cashAccountId?: string | null;
  method?: PaymentMethod;
  paidOn?: string;
  note?: string | null;
};

export type BookingDepositInput = {
  outcome: "returned" | "retained";
  /** Descontado (por daños); el resto se devuelve */
  retainedAmount?: number;
  cashAccountId: string;
  note?: string | null;
};
