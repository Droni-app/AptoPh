/**
 * Parqueaderos del conjunto (no de visitantes): inventario de cupos propios y
 * comunales, asignación de los comunales a unidades, tarifas mensuales que se
 * cobran con la cuota y consulta en portería. Ver docs/parking.md.
 */
import type { EnrollmentRole } from "./index.js";
import type { DocumentType, VehicleType } from "./domain.js";

/** Consultan los cupos; la vigilancia no ve tarifas */
export const PARKING_READ_ROLES: readonly EnrollmentRole[] = [
  "administrator",
  "council_member",
  "security_guard",
];
/** Configuran, crean cupos y asignan */
export const PARKING_MANAGE_ROLES: readonly EnrollmentRole[] = ["administrator"];

/** Propios (escriturados a una unidad), comunales (se asignan) o ambos */
export const PARKING_MODES = ["private", "communal", "mixed"] as const;
export type ParkingMode = (typeof PARKING_MODES)[number];
export const PARKING_MODE_LABELS: Record<ParkingMode, string> = {
  private: "Propios",
  communal: "Comunales",
  mixed: "Mixtos",
};

export const PARKING_OWNERSHIPS = ["private", "communal"] as const;
export type ParkingOwnership = (typeof PARKING_OWNERSHIPS)[number];
export const PARKING_OWNERSHIP_LABELS: Record<ParkingOwnership, string> = {
  private: "Propio",
  communal: "Comunal",
};

/**
 * `scheduled`: ganado en un sorteo, empieza con el periodo.
 * `offered`: ofrecido desde la lista de espera, esperando que la unidad acepte.
 * `ended`: terminó el periodo. `cancelled`: se quitó durante el periodo.
 * `rejected`: no llegó a usarse (la unidad no lo aceptó o no cumplía).
 */
export const PARKING_ASSIGNMENT_STATUSES = [
  "scheduled",
  "offered",
  "active",
  "ended",
  "cancelled",
  "rejected",
] as const;
export type ParkingAssignmentStatus = (typeof PARKING_ASSIGNMENT_STATUSES)[number];
export const PARKING_ASSIGNMENT_STATUS_LABELS: Record<ParkingAssignmentStatus, string> = {
  scheduled: "Programado",
  offered: "Ofrecido",
  active: "Vigente",
  ended: "Terminado",
  cancelled: "Cancelado",
  rejected: "Rechazado",
};

export const PARKING_END_REASONS = [
  "debt",
  "unused",
  "no_vehicle",
  "expired_documents",
  "resident_resigned",
  "rules_violation",
  "ownership_change",
  "offer_declined",
  "offer_expired",
  "other",
] as const;
export type ParkingEndReason = (typeof PARKING_END_REASONS)[number];
export const PARKING_END_REASON_LABELS: Record<ParkingEndReason, string> = {
  debt: "Mora en la administración",
  unused: "No usa el cupo",
  no_vehicle: "Sin vehículo registrado",
  expired_documents: "SOAT o tecnomecánica vencidos",
  resident_resigned: "Renuncia de la unidad",
  rules_violation: "Incumple el reglamento",
  ownership_change: "Venta o cambio de residente",
  offer_declined: "No aceptó el cupo ofrecido",
  offer_expired: "No respondió a tiempo",
  other: "Otro",
};

/** Vehículo del residente o de un tercero (familiar, empresa, leasing…) */
export const VEHICLE_OWNER_TYPES = ["resident", "third_party"] as const;
export type VehicleOwnerType = (typeof VEHICLE_OWNER_TYPES)[number];
export const VEHICLE_OWNER_RELATIONSHIPS = [
  "family",
  "employer",
  "leasing",
  "friend",
  "other",
] as const;
export type VehicleOwnerRelationship = (typeof VEHICLE_OWNER_RELATIONSHIPS)[number];
export const VEHICLE_OWNER_RELATIONSHIP_LABELS: Record<VehicleOwnerRelationship, string> = {
  family: "Familiar",
  employer: "Empresa donde trabaja",
  leasing: "Leasing o financiera",
  friend: "Amigo o conocido",
  other: "Otro",
};

/** Vehículos que portan SOAT y revisión técnico-mecánica */
export const DOCUMENTED_VEHICLE_TYPES: readonly VehicleType[] = ["car", "motorcycle"];

export type ParkingRate = {
  /** Pesos al mes por un cupo comunal asignado */
  communal: number;
  /** Pesos al mes por un cupo propio (p. ej. mantenimiento); 0 = no se cobra */
  private: number;
};

export type ParkingSettings = {
  mode: ParkingMode;
  /** Cupos (propios + comunales) que puede tener una unidad */
  maxSpotsPerUnit: number;
  rates: Record<VehicleType, ParkingRate>;
  /** Duración de cada sorteo de cupos comunales */
  lotteryMonths: number;
  /** Días que tiene una unidad para aceptar un cupo ofrecido (fase 2) */
  offerDays: number;
  requirements: {
    /** Sin saldo vencido (con tolerancia en días) */
    noDebt: boolean;
    debtToleranceDays: number;
    /** Un vehículo registrado del tipo del cupo */
    vehicle: boolean;
    /** SOAT y tecnomecánica vigentes */
    documents: boolean;
    /** En el sorteo van primero las unidades sin cupo propio (fase 2) */
    priorityWithoutPrivate: boolean;
  };
  /** Permite registrar vehículos a nombre de terceros, con los datos del propietario */
  allowThirdPartyVehicles: boolean;
};

const rate = (communal: number): ParkingRate => ({ communal, private: 0 });

export const DEFAULT_PARKING_SETTINGS: ParkingSettings = {
  mode: "private",
  maxSpotsPerUnit: 1,
  rates: { car: rate(0), motorcycle: rate(0), bicycle: rate(0), other: rate(0) },
  lotteryMonths: 12,
  offerDays: 3,
  requirements: {
    noDebt: true,
    debtToleranceDays: 0,
    vehicle: true,
    documents: false,
    priorityWithoutPrivate: true,
  },
  allowThirdPartyVehicles: false,
};

/** Settings stored in the tenant, completed with the defaults */
export function parkingSettings(stored: unknown): ParkingSettings {
  const value = (stored ?? {}) as Partial<ParkingSettings>;
  const d = DEFAULT_PARKING_SETTINGS;
  return {
    ...d,
    ...value,
    rates: Object.fromEntries(
      (Object.keys(d.rates) as VehicleType[]).map((type) => [
        type,
        { ...d.rates[type], ...value.rates?.[type] },
      ]),
    ) as ParkingSettings["rates"],
    requirements: { ...d.requirements, ...value.requirements },
  };
}

/**
 * Days of `period` (YYYY-MM-01) covered by [from, to] (YYYY-MM-DD, inclusive;
 * `to` null = open-ended) and the days the month has.
 */
export function daysInPeriod(period: string, from: string, to: string | null) {
  const [year, month] = period.split("-").map(Number) as [number, number];
  const monthDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const first = period.slice(0, 7) + "-01";
  const last = `${period.slice(0, 7)}-${String(monthDays).padStart(2, "0")}`;
  const start = from > first ? from : first;
  const end = to === null || to > last ? last : to;
  if (end < start) return { days: 0, monthDays };
  const ms = Date.parse(end + "T00:00:00Z") - Date.parse(start + "T00:00:00Z");
  return { days: Math.round(ms / 86_400_000) + 1, monthDays };
}

/** Monthly rate (cents) for the days of `period` covered, rounded to whole pesos */
export function proratedCents(rateCents: number, period: string, from: string, to: string | null) {
  const { days, monthDays } = daysInPeriod(period, from, to);
  if (days === 0) return 0;
  if (days === monthDays) return rateCents;
  return Math.round((rateCents * days) / monthDays / 100) * 100;
}

/** Motivos que la administración elige al cancelar o rechazar (los de oferta los pone el sistema) */
export const PARKING_MANUAL_END_REASONS = PARKING_END_REASONS.filter(
  (reason) => reason !== "offer_declined" && reason !== "offer_expired",
);

// Sorteo (docs/parking.md §Sorteo)

/**
 * `open`: recibe postulaciones. `drawn`: ya se sorteó; la lista de espera
 * sigue viva durante el periodo. `finished`: terminó el periodo.
 * `cancelled`: se anuló antes de sortear.
 */
export const PARKING_LOTTERY_STATUSES = ["open", "drawn", "finished", "cancelled"] as const;
export type ParkingLotteryStatus = (typeof PARKING_LOTTERY_STATUSES)[number];
export const PARKING_LOTTERY_STATUS_LABELS: Record<ParkingLotteryStatus, string> = {
  open: "Postulaciones abiertas",
  drawn: "Sorteado",
  finished: "Terminado",
  cancelled: "Anulado",
};

/**
 * `pending`: postulada, antes del sorteo. `ineligible`: no cumplía al sortear.
 * `won`: ganó un cupo. `waiting`: en lista de espera. `offered`: se le ofreció
 * un cupo liberado. `accepted`: aceptó un cupo ofrecido. `declined` /
 * `expired`: no lo aceptó o no respondió. `withdrawn`: se retiró.
 */
export const PARKING_APPLICATION_STATUSES = [
  "pending",
  "ineligible",
  "won",
  "waiting",
  "offered",
  "accepted",
  "declined",
  "expired",
  "withdrawn",
] as const;
export type ParkingApplicationStatus = (typeof PARKING_APPLICATION_STATUSES)[number];
export const PARKING_APPLICATION_STATUS_LABELS: Record<ParkingApplicationStatus, string> = {
  pending: "Postulada",
  ineligible: "No cumple",
  won: "Ganó cupo",
  waiting: "En lista de espera",
  offered: "Cupo ofrecido",
  accepted: "Aceptó cupo",
  declined: "No aceptó",
  expired: "No respondió",
  withdrawn: "Retirada",
};

/**
 * Orden del sorteo: SHA-256 de `semilla:idPostulación`, ascendente, dentro de
 * cada grupo de prioridad. Cualquiera puede repetirlo con la semilla publicada.
 */
export const PARKING_DRAW_METHOD =
  "Grupo de prioridad y luego SHA-256(semilla + ':' + id de la postulación), de menor a mayor";

// API shapes

export type ParkingUnitRef = {
  id: string;
  code: string;
  building: { id: string; name: string } | null;
};

export type ParkingVehicleRef = {
  id: string;
  plate: string;
  type: VehicleType;
  brand: string | null;
  color: string | null;
};

export type ParkingAssignment = {
  id: string;
  spot: { id: string; code: string; vehicleType: VehicleType; location: string | null };
  unit: ParkingUnitRef;
  vehicle: ParkingVehicleRef | null;
  status: ParkingAssignmentStatus;
  startsOn: string;
  /** Planned last day (end of the period); null = no end */
  endsOn: string | null;
  /** Actual last day when it was cancelled, rejected or ended */
  endedOn: string | null;
  /** Pesos per month; null for the guards */
  monthlyRate: number | null;
  endReason: ParkingEndReason | null;
  endNote: string | null;
  notes: string | null;
  createdBy: { id: string; fullName: string } | null;
  endedBy: { id: string; fullName: string } | null;
  createdAt: string;
};

export type ParkingSpot = {
  id: string;
  code: string;
  vehicleType: VehicleType;
  ownership: ParkingOwnership;
  isCovered: boolean;
  location: string | null;
  notes: string | null;
  isActive: boolean;
  /** Owner of a private spot */
  ownerUnit: ParkingUnitRef | null;
  /** The parking unit of the structure (deed, coefficient) it comes from */
  propertyUnitId: string | null;
  /** Current holder of a communal spot */
  assignment: ParkingAssignment | null;
  /** Vehicles of the unit that uses it (owner or holder) */
  vehicles: ParkingVehicleRef[];
};

export type ParkingSpotsSummary = {
  mode: ParkingMode;
  byType: Array<{
    type: VehicleType;
    private: number;
    communal: number;
    assigned: number;
    free: number;
  }>;
  inactive: number;
  /** Units holding a communal spot while owing overdue charges */
  withDebt: number;
};

/** What the admin sees about a unit before assigning it a spot */
export type ParkingEligibility = {
  unit: ParkingUnitRef;
  /** Spots it has now: private + communal */
  spots: number;
  maxSpots: number;
  privateSpots: number;
  overdue: string;
  vehicles: Array<
    ParkingVehicleRef & {
      soatExpiresOn: string | null;
      inspectionExpiresOn: string | null;
      documentsOk: boolean;
    }
  >;
  /** Blocks the assignment */
  errors: string[];
  /** Requirements not met: the admin can still assign */
  warnings: string[];
};

/** Guard lookup: a plate or a spot code */
export type ParkingSpotLookup = {
  spots: ParkingSpot[];
  vehicle: (ParkingVehicleRef & { unit: ParkingUnitRef; ownerName: string | null }) | null;
};

export type ParkingSpotInput = {
  code: string;
  vehicleType: VehicleType;
  ownership: ParkingOwnership;
  isCovered?: boolean;
  location?: string | null;
  notes?: string | null;
  ownerUnitId?: string | null;
  isActive?: boolean;
};

/** Creates `prefix` + from..to, e.g. P-001 … P-080 */
export type ParkingSpotBatchInput = Omit<ParkingSpotInput, "code" | "ownerUnitId"> & {
  prefix: string;
  from: number;
  to: number;
  /** Zero-padding of the number: 3 → 001 */
  digits?: number;
};

export type ParkingLottery = {
  id: string;
  number: number;
  title: string;
  status: ParkingLotteryStatus;
  /** Last moment to apply */
  closesAt: string;
  periodStartsOn: string;
  periodEndsOn: string;
  notes: string | null;
  /** Published after the draw, to verify it */
  seed: string | null;
  drawnAt: string | null;
  drawnBy: { id: string; fullName: string } | null;
  createdAt: string;
  counts: Record<ParkingApplicationStatus, number>;
  /** Communal spots of each type it raffles */
  spots: Array<{ type: VehicleType; count: number }>;
  /** Opening emails sent to the residents */
  notifiedCount: number;
};

export type ParkingApplication = {
  id: string;
  lotteryId: string;
  unit: ParkingUnitRef;
  vehicle: ParkingVehicleRef | null;
  vehicleType: VehicleType;
  status: ParkingApplicationStatus;
  /** 0: without a private spot (goes first when that priority is on) */
  priorityGroup: number;
  /** Order in the draw, per vehicle type (1 = first) */
  drawPosition: number | null;
  /** Position in the waiting list now (only `waiting`) */
  queuePosition: number | null;
  drawHash: string | null;
  ineligibleReason: string | null;
  /** Spot won or offered */
  spot: { id: string; code: string; location: string | null } | null;
  assignmentId: string | null;
  offerExpiresAt: string | null;
  appliedBy: { id: string; fullName: string } | null;
  late: boolean;
  createdAt: string;
};

export type ParkingLotteryInput = {
  title: string;
  closesAt: string;
  periodStartsOn: string;
  periodEndsOn?: string | null;
  notes?: string | null;
  /** Email the residents that applications are open (uses the bulk quota) */
  notify?: boolean;
};

export type ParkingApplyInput = {
  unitId: string;
  vehicleType: VehicleType;
  vehicleId?: string | null;
};

/** What the resident sees in the portal */
export type ResidentParkingOverview = {
  lottery: (Omit<ParkingLottery, "seed" | "drawnBy" | "notifiedCount" | "counts"> & {
    seed: string | null;
  }) | null;
  applications: ParkingApplication[];
  /** Units of the resident with what they can apply for */
  units: Array<{
    unit: ParkingUnitRef;
    eligibility: Array<{ vehicleType: VehicleType; errors: string[]; warnings: string[] }>;
    vehicles: ParkingVehicleRef[];
  }>;
  requirements: ParkingSettings["requirements"];
  offerDays: number;
};

export type ParkingAssignInput = {
  spotId: string;
  unitId: string;
  vehicleId?: string | null;
  startsOn: string;
  endsOn?: string | null;
  notes?: string | null;
};

export type ParkingEndInput = {
  status: "cancelled" | "rejected";
  reason: ParkingEndReason;
  note: string;
  /** Last day it is used (cancelled only); default today */
  endedOn?: string;
};

export type VehicleOwnerFields = {
  ownerType: VehicleOwnerType;
  ownerName: string | null;
  ownerDocumentType: DocumentType | null;
  ownerDocumentNumber: string | null;
  ownerRelationship: VehicleOwnerRelationship | null;
  ownerPhone: string | null;
  soatExpiresOn: string | null;
  inspectionExpiresOn: string | null;
};
