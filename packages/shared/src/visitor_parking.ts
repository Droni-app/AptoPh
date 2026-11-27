/**
 * Parqueadero de visitantes: ingreso y salida de vehículos en portería, cupos,
 * tarifas por hora con horas de gracia diarias por placa e IVA. Ver
 * docs/visitor-parking.md.
 */
import type { EnrollmentRole } from "./index.js";
import type { PaymentMethod, VehicleType } from "./domain.js";

/** Ven el módulo y registran ingresos y salidas */
export const VISITOR_PARKING_ROLES: readonly EnrollmentRole[] = [
  "administrator",
  "security_guard",
];
/** Configuran cupos, tarifas y cobro */
export const VISITOR_PARKING_ADMIN_ROLES: readonly EnrollmentRole[] = [
  "administrator",
];

export const VEHICLE_TYPE_ICONS: Record<VehicleType, string> = {
  car: "mdi-car",
  motorcycle: "mdi-motorbike",
  bicycle: "mdi-bicycle",
  other: "mdi-truck-outline",
};

/** Tipos que siempre llevan placa */
export const PLATE_REQUIRED_TYPES: readonly VehicleType[] = [
  "car",
  "motorcycle",
];

/** Cómo se autorizó un ingreso */
export const PARKING_AUTHORIZATIONS = [
  // Visita autorizada antes por el residente desde el portal (código de acceso)
  "pre_authorized",
  // El vigilante llamó al residente
  "call",
  // Anunciado por citófono
  "intercom",
  // El residente estaba en portería
  "in_person",
  "other",
] as const;
export type ParkingAuthorization = (typeof PARKING_AUTHORIZATIONS)[number];

export const PARKING_AUTHORIZATION_LABELS: Record<
  ParkingAuthorization,
  string
> = {
  pre_authorized: "Autorizado desde el portal",
  call: "Llamada al residente",
  intercom: "Citófono",
  in_person: "El residente en portería",
  other: "Otro",
};

/** Quién paga lo que se cobra al salir */
export const PARKING_PAYMENT_MODES = [
  // El visitante paga en portería
  "gate",
  // Se carga a la cuenta de la unidad visitada (cartera)
  "unit",
  // El vigilante elige en cada salida
  "ask",
] as const;
export type ParkingPaymentMode = (typeof PARKING_PAYMENT_MODES)[number];

export const PARKING_PAYMENT_MODE_LABELS: Record<ParkingPaymentMode, string> = {
  gate: "El visitante paga en portería",
  unit: "Se carga a la cuenta de la unidad",
  ask: "El vigilante elige en cada salida",
};

/** Cómo terminó una estadía, en cuanto al cobro */
export const PARKING_SETTLEMENTS = ["free", "gate", "unit", "exempt"] as const;
export type ParkingSettlement = (typeof PARKING_SETTLEMENTS)[number];

export const PARKING_SETTLEMENT_LABELS: Record<ParkingSettlement, string> = {
  free: "Sin costo",
  gate: "Pagado en portería",
  unit: "Cargado a la unidad",
  exempt: "Exento",
};

/** Medios de pago que se reciben en portería */
export const PARKING_GATE_METHODS = [
  "cash",
  "bank_transfer",
  "card",
  "other",
] as const satisfies readonly PaymentMethod[];
export type ParkingGateMethod = (typeof PARKING_GATE_METHODS)[number];

export const PARKING_STAY_STATUSES = ["inside", "exited"] as const;
export type ParkingStayStatus = (typeof PARKING_STAY_STATUSES)[number];

/** Fracciones mínimas de cobro, en minutos */
export const PARKING_FRACTIONS = [1, 15, 30, 60] as const;

export interface VehicleTypeSettings {
  /** Cupos para visitantes */
  capacity: number;
  /** Pesos por hora, con IVA incluido si se cobra */
  hourlyRate: number;
  /** Máximo a cobrar por día calendario; null = sin tope */
  dailyCap: number | null;
}

export interface VisitorParkingSettings {
  enabled: boolean;
  vehicles: Record<VehicleType, VehicleTypeSettings>;
  /** Horas gratis por placa y por día calendario (hora del conjunto) */
  graceHours: number;
  /** Fracción mínima de cobro en minutos (PARKING_FRACTIONS) */
  fractionMinutes: number;
  vat: {
    enabled: boolean;
    /** Porcentaje; la tarifa ya lo incluye */
    rate: number;
  };
  paymentMode: ParkingPaymentMode;
  /** Caja de Finanzas donde entra lo que se paga en portería */
  cashAccountId: string | null;
  /** Estadía máxima en horas; pasado ese tiempo se marca como excedida. null = sin máximo */
  maxStayHours: number | null;
}

export const DEFAULT_VISITOR_PARKING_SETTINGS: VisitorParkingSettings = {
  enabled: false,
  vehicles: {
    car: { capacity: 0, hourlyRate: 0, dailyCap: null },
    motorcycle: { capacity: 0, hourlyRate: 0, dailyCap: null },
    bicycle: { capacity: 0, hourlyRate: 0, dailyCap: null },
    other: { capacity: 0, hourlyRate: 0, dailyCap: null },
  },
  graceHours: 0,
  fractionMinutes: 60,
  vat: { enabled: false, rate: 19 },
  paymentMode: "gate",
  cashAccountId: null,
  maxStayHours: null,
};

/** Configuración guardada en el conjunto, completada con los valores por defecto */
export function visitorParkingSettings(
  stored: unknown,
): VisitorParkingSettings {
  const value = (stored ?? {}) as Partial<VisitorParkingSettings>;
  const defaults = DEFAULT_VISITOR_PARKING_SETTINGS;
  const vehicles = { ...defaults.vehicles };
  for (const type of Object.keys(vehicles) as VehicleType[]) {
    vehicles[type] = {
      ...defaults.vehicles[type],
      ...(value.vehicles?.[type] ?? {}),
    };
  }
  return {
    ...defaults,
    ...value,
    vehicles,
    vat: { ...defaults.vat, ...(value.vat ?? {}) },
  };
}

/** Tarifa con la que entró un vehículo: un cambio de tarifa no afecta a los que ya están adentro */
export interface ParkingTariff {
  hourlyRate: number;
  dailyCap: number | null;
  graceMinutes: number;
  fractionMinutes: number;
  /** 0 si no se cobra IVA */
  vatRate: number;
}

/** Un día calendario de una estadía */
export interface ParkingDay {
  /** YYYY-MM-DD en la zona del conjunto */
  date: string;
  minutes: number;
  /** Minutos gratis usados ese día */
  graceMinutes: number;
  /** Minutos cobrados, ya redondeados a la fracción */
  billedMinutes: number;
  /** Pesos */
  amount: number;
}

export interface ParkingQuote {
  days: ParkingDay[];
  minutes: number;
  graceMinutes: number;
  billedMinutes: number;
  /** Pesos, con IVA */
  total: number;
  base: number;
  vat: number;
}

/**
 * Lo que cuesta una estadía. Los minutos de cada día se cuentan en la zona del
 * conjunto; a cada día se le descuentan las horas de gracia que la placa no
 * haya usado ese día (`graceUsed`), el resto se redondea hacia arriba a la
 * fracción, se cobra a la tarifa por hora y se limita al tope diario.
 *
 * `segments`: los minutos de la estadía en cada día, en orden.
 */
export function quoteParking(
  tariff: ParkingTariff,
  segments: Array<{ date: string; minutes: number }>,
  graceUsed: Record<string, number> = {},
): ParkingQuote {
  const fraction = Math.max(1, tariff.fractionMinutes);
  const days = segments.map(({ date, minutes }): ParkingDay => {
    const available = Math.max(0, tariff.graceMinutes - (graceUsed[date] ?? 0));
    const grace = Math.min(minutes, available);
    const billable = minutes - grace;
    const billedMinutes = Math.ceil(billable / fraction) * fraction;
    let amount = Math.round((billedMinutes / 60) * tariff.hourlyRate);
    if (tariff.dailyCap !== null) amount = Math.min(amount, tariff.dailyCap);
    return { date, minutes, graceMinutes: grace, billedMinutes, amount };
  });
  const total = days.reduce((sum, day) => sum + day.amount, 0);
  const base =
    tariff.vatRate > 0 ? Math.round(total / (1 + tariff.vatRate / 100)) : total;
  return {
    days,
    minutes: days.reduce((sum, day) => sum + day.minutes, 0),
    graceMinutes: days.reduce((sum, day) => sum + day.graceMinutes, 0),
    billedMinutes: days.reduce((sum, day) => sum + day.billedMinutes, 0),
    total,
    base,
    vat: total - base,
  };
}

/** "ABC 12D" → "ABC12D" */
export function normalizePlate(plate: string | null | undefined) {
  const value = (plate ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return value || null;
}

/** "2 h 05 min" */
export function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")} min`;
}

export interface ParkingPerson {
  id: string;
  fullName: string;
}

/** Estadía en el backoffice */
export interface ParkingStay {
  id: string;
  /** Consecutivo del comprobante; se asigna al salir */
  number: number | null;
  status: ParkingStayStatus;
  vehicleType: VehicleType;
  plate: string | null;
  vehicleDescription: string | null;
  visitorName: string;
  visitorDocument: string | null;
  unit: {
    id: string;
    code: string;
    building: { id: string; name: string } | null;
  };
  visitId: string | null;
  authorization: ParkingAuthorization;
  authorizedByName: string | null;
  authorizationNotes: string | null;
  overCapacity: boolean;
  enteredAt: string;
  enteredBy: ParkingPerson | null;
  exitedAt: string | null;
  exitedBy: ParkingPerson | null;
  tariff: ParkingTariff;
  /** Adentro: lo que costaría salir ahora. Afuera: lo cobrado */
  quote: ParkingQuote;
  /** Pasó la estadía máxima de la configuración */
  isOverstay: boolean;
  settlement: ParkingSettlement | null;
  paymentMethod: PaymentMethod | null;
  exemptReason: string | null;
  receiptEmail: string | null;
  receiptSentAt: string | null;
}

export interface ParkingSummary {
  enabled: boolean;
  byType: Array<{ type: VehicleType; capacity: number; inside: number }>;
  inside: number;
  overstays: number;
  today: {
    entries: number;
    exits: number;
    /** Pesos cobrados hoy (portería + unidades) */
    billed: number;
    /** Pesos recibidos hoy en portería */
    collectedAtGate: number;
  };
}

/** Lo que el vigilante encuentra al digitar una placa o un código */
export interface ParkingLookup {
  /** Visitas autorizadas desde el portal que esperan para hoy */
  visits: Array<{
    id: string;
    visitorName: string;
    visitorDocument: string | null;
    vehiclePlate: string | null;
    accessCode: string | null;
    expectedAt: string | null;
    unit: ParkingStay["unit"];
    authorizedBy: string | null;
  }>;
  /** La placa ya está adentro */
  inside: ParkingStay | null;
  /** La placa es de un residente */
  residentVehicle: { plate: string; unit: ParkingStay["unit"] } | null;
  /** El código de acceso existe pero no sirve hoy: ya se usó, venció o es para otro día */
  codeIssue: {
    reason: "used" | "expired" | "upcoming";
    visitorName: string;
    expectedAt: string | null;
    checkedInAt: string | null;
    unit: ParkingStay["unit"];
  } | null;
}

export interface ParkingEntryInput {
  vehicleType: VehicleType;
  plate?: string | null;
  vehicleDescription?: string | null;
  unitId: string;
  visitorName: string;
  visitorDocument?: string | null;
  visitId?: string | null;
  authorization: ParkingAuthorization;
  authorizedByName?: string | null;
  authorizationNotes?: string | null;
}

export interface ParkingExitInput {
  /** Solo cuando la configuración es «ask»; si no, se usa la del conjunto */
  paymentMode?: "gate" | "unit";
  paymentMethod?: ParkingGateMethod;
  exempt?: boolean;
  exemptReason?: string | null;
  receiptEmail?: string | null;
}
