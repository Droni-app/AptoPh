/**
 * Planes, precios y suscripciones. Única fuente de las tarifas: la API calcula los
 * cobros, el backoffice muestra el plan y la landing publica la tabla de precios
 * con estos mismos valores.
 *
 * Precios en COP por unidad privada al mes, antes de IVA.
 */

const values = <const T extends readonly string[]>(...items: T) => items

export const PLAN_IDS = values('completo', 'empresarial')
export const BILLING_CYCLES = values('monthly', 'annual')
export const SUBSCRIPTION_STATUSES = values('trialing', 'active', 'past_due', 'cancelled')

export type PlanId = (typeof PLAN_IDS)[number]
export type BillingCycle = (typeof BILLING_CYCLES)[number]
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number]

/** Días de prueba gratis con todas las funciones, sin tarjeta */
export const TRIAL_DAYS = 30
/** El plan anual se paga como 10 meses: 2 meses gratis (~17 % de descuento) */
export const ANNUAL_BILLED_MONTHS = 10
/** Mínimo mensual, para que los conjuntos muy pequeños sigan siendo rentables */
export const MINIMUM_MONTHLY = 50_000

export interface PriceTier {
  /** Tamaño máximo del conjunto (unidades) para este precio. `null`: sin límite */
  upTo: number | null
  pricePerUnit: number
}

/**
 * El tamaño del conjunto define el precio de todas sus unidades.
 * Ordenados de menor a mayor.
 */
export const PRICE_TIERS: readonly PriceTier[] = [
  { upTo: 200, pricePerUnit: 300 },
  { upTo: 500, pricePerUnit: 400 },
  { upTo: null, pricePerUnit: 500 },
]

export interface Plan {
  id: PlanId
  name: string
  tagline: string
  /** Se cobra con la tabla de precios por unidad (los demás, a la medida) */
  selfServe: boolean
  highlighted: boolean
  /** Primera línea de la lista de funciones, p. ej. "Todo lo de Completo, más:" */
  includesFrom?: string
  features: string[]
}

export const PLANS: readonly Plan[] = [
  {
    id: 'completo',
    name: 'Completo',
    tagline: 'Toda la administración del conjunto en una sola plataforma.',
    selfServe: true,
    highlighted: true,
    features: [
      'Censo de torres, unidades, residentes, vehículos y mascotas',
      'Cuotas de administración y cartera',
      'Pagos con soporte y aplicación a cargos',
      'Zonas comunes y reservas',
      'Portería, visitantes y paquetes',
      'Comunicados, PQRS y documentos',
      'Accesos para consejo, contador y revisor fiscal',
      'App web y móvil para residentes',
      'Migración de datos sin costo',
      'Soporte por chat y correo',
    ],
  },
  {
    id: 'empresarial',
    name: 'Empresarial',
    tagline: 'Para administradoras que manejan varias copropiedades.',
    selfServe: false,
    highlighted: false,
    includesFrom: 'Todo lo de Completo, más:',
    features: [
      'Varias copropiedades en una sola cuenta',
      'Tarifa por volumen a la medida',
      'Capacitación y acompañamiento en la puesta en marcha',
      'Soporte prioritario con gerente de cuenta',
      'Acceso anticipado a asambleas virtuales',
    ],
  },
]

export function findPlan(id: PlanId): Plan {
  return PLANS.find((plan) => plan.id === id)!
}

/** Tramo de precio que corresponde a un conjunto de este tamaño */
export function tierFor(units: number): PriceTier {
  return PRICE_TIERS.find((tier) => tier.upTo === null || units <= tier.upTo)!
}

export interface PriceQuote {
  /** Precio por unidad al mes (en el plan anual: el equivalente mensual con el descuento) */
  pricePerUnit: number
  /** Valor mensual equivalente del conjunto */
  monthly: number
  /** Valor que se cobra en cada periodo (mes o año) */
  total: number
  /** Ahorro anual frente a pagar mes a mes */
  annualSavings: number
}

/**
 * Cotización de la tabla de precios: todas las unidades al precio del tramo que
 * corresponde al tamaño del conjunto, nunca menos que el mínimo mensual.
 */
export function quote(units: number, cycle: BillingCycle): PriceQuote {
  const count = Math.max(0, Math.floor(units))
  const { pricePerUnit } = tierFor(count)
  const monthly = Math.max(MINIMUM_MONTHLY, count * pricePerUnit)

  if (cycle === 'monthly') return { pricePerUnit, monthly, total: monthly, annualSavings: 0 }

  const total = monthly * ANNUAL_BILLED_MONTHS
  return {
    pricePerUnit: Math.round((pricePerUnit * ANNUAL_BILLED_MONTHS) / 12),
    monthly: Math.round(total / 12),
    total,
    annualSavings: monthly * 12 - total,
  }
}

/** "Hasta 200 unidades", "De 201 a 500 unidades", "Más de 500 unidades" */
export function tierLabel(tier: PriceTier) {
  const index = PRICE_TIERS.indexOf(tier)
  const previous = index > 0 ? PRICE_TIERS[index - 1]!.upTo! : 0
  if (tier.upTo === null) return `Más de ${previous.toLocaleString('es-CO')} unidades`
  if (previous === 0) return `Hasta ${tier.upTo.toLocaleString('es-CO')} unidades`
  return `De ${(previous + 1).toLocaleString('es-CO')} a ${tier.upTo.toLocaleString('es-CO')} unidades`
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
  empresarial: 'Empresarial',
}

export const BILLING_CYCLE_LABELS: Record<BillingCycle, string> = {
  monthly: 'Mensual',
  annual: 'Anual',
}

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  trialing: 'Periodo de prueba',
  active: 'Activa',
  past_due: 'Pago pendiente',
  cancelled: 'Cancelada',
}
