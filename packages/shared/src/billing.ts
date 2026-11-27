/**
 * Plan, precio y suscripciones. Única fuente de la tarifa: la API calcula los
 * cobros, el backoffice muestra el plan y la landing publica el precio con estos
 * mismos valores.
 *
 * Un solo plan, pago mensual, precio en COP por unidad privada al mes (AptoPH no
 * cobra IVA).
 */

const values = <const T extends readonly string[]>(...items: T) => items

export const PLAN_IDS = values('completo')
export const BILLING_CYCLES = values('monthly')
export const SUBSCRIPTION_STATUSES = values('trialing', 'active', 'past_due', 'cancelled')

export type PlanId = (typeof PLAN_IDS)[number]
export type BillingCycle = (typeof BILLING_CYCLES)[number]
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number]

/** Días de prueba gratis con todas las funciones, sin tarjeta */
export const TRIAL_DAYS = 30
/** Tarifa única por unidad al mes, sin importar el tamaño del conjunto */
export const PRICE_PER_UNIT = 500
/** Mínimo mensual, para que los conjuntos pequeños sigan siendo rentables */
export const MINIMUM_MONTHLY = 50_000
/** Hasta este tamaño se paga el mínimo (100 unidades × 500 = 50.000) */
export const MINIMUM_COVERS_UNITS = MINIMUM_MONTHLY / PRICE_PER_UNIT

export interface Plan {
  id: PlanId
  name: string
  tagline: string
  features: string[]
}

export const PLAN: Plan = {
  id: 'completo',
  name: 'Completo',
  tagline: 'Toda la administración del conjunto en una sola plataforma.',
  features: [
    'Censo de torres, unidades, residentes, vehículos y mascotas',
    'Cuotas de administración y cartera',
    'Pagos con soporte y aplicación a cargos',
    'Zonas comunes y reservas',
    'Portería, visitantes y paquetes',
    'Comunicados, PQRS y documentos',
    '3.000 correos masivos al mes incluidos',
    'Accesos para consejo, contador y revisor fiscal',
    'App web y móvil para residentes',
    'Migración de datos sin costo',
    'Soporte por chat y correo',
  ],
}

export interface PriceQuote {
  /** Precio por unidad al mes */
  pricePerUnit: number
  /** Valor mensual del conjunto */
  monthly: number
  /** Valor que se cobra en cada periodo (un mes) */
  total: number
  /** Se cobra el mínimo mensual porque unidades × precio no lo alcanza */
  minimumApplied: boolean
}

/** Cotización: unidades × tarifa única, nunca menos que el mínimo mensual */
export function quote(units: number): PriceQuote {
  const count = Math.max(0, Math.floor(units))
  const byUnits = count * PRICE_PER_UNIT
  const monthly = Math.max(MINIMUM_MONTHLY, byUnits)
  return {
    pricePerUnit: PRICE_PER_UNIT,
    monthly,
    total: monthly,
    minimumApplied: byUnits < MINIMUM_MONTHLY,
  }
}

const copFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

/** $ 250.000 */
export function formatCop(value: number) {
  return copFormatter.format(value)
}

export const PLAN_LABELS: Record<PlanId, string> = {
  completo: 'Completo',
}

export const BILLING_CYCLE_LABELS: Record<BillingCycle, string> = {
  monthly: 'Mensual',
}

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  trialing: 'Periodo de prueba',
  active: 'Activa',
  past_due: 'Pago pendiente',
  cancelled: 'Cancelada',
}
