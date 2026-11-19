/**
 * Cobros de AptoPH a los conjuntos con Wompi (docs/billing.md): plan y paquetes
 * de correos, con un medio de pago guardado (tokenizado) y renovación automática.
 */

export const PAYMENT_METHOD_TYPES = ['CARD', 'NEQUI', 'BANCOLOMBIA_TRANSFER', 'DAVIPLATA'] as const
export type PaymentMethodType = (typeof PAYMENT_METHOD_TYPES)[number]

export const PAYMENT_METHOD_TYPE_LABELS: Record<PaymentMethodType, string> = {
  CARD: 'Tarjeta',
  NEQUI: 'Nequi',
  BANCOLOMBIA_TRANSFER: 'Bancolombia',
  DAVIPLATA: 'DaviPlata',
}

export const BILLING_CHARGE_KINDS = ['subscription', 'email_packs'] as const
export type BillingChargeKind = (typeof BILLING_CHARGE_KINDS)[number]

/** `expired`: pago en Wompi (checkout) que nunca se completó */
export const BILLING_CHARGE_STATUSES = ['pending', 'approved', 'declined', 'voided', 'error', 'expired'] as const
export type BillingChargeStatus = (typeof BILLING_CHARGE_STATUSES)[number]

export const BILLING_CHARGE_STATUS_LABELS: Record<BillingChargeStatus, string> = {
  pending: 'En proceso',
  approved: 'Aprobado',
  declined: 'Rechazado',
  voided: 'Anulado',
  error: 'Con error',
  expired: 'Sin completar',
}

/** El primer intento de renovación se hace este tiempo antes de que termine el periodo */
export const RENEWAL_CHARGE_HOURS_BEFORE = 24
/** Aviso por correo con el valor de la renovación, días antes de que termine el periodo */
export const RENEWAL_NOTICE_DAYS = 3
/** Reintentos tras un cobro rechazado: días después del fin del periodo */
export const RENEWAL_RETRY_DAYS = [1, 3, 5] as const
/** Días después del fin del periodo en que se puede seguir editando sin pagar */
export const PAST_DUE_GRACE_DAYS = 7

export interface PaymentMethodSummary {
  id: string
  type: PaymentMethodType
  /** "VISA ·· 4242", "Nequi ·· 1111" */
  label: string
  brand: string | null
  lastFour: string | null
  /** Tarjeta: mm/aa */
  expiresOn: string | null
  createdAt: string
  createdBy: string | null
}

export interface BillingCharge {
  id: string
  kind: BillingChargeKind
  description: string
  /** COP */
  amount: number
  status: BillingChargeStatus
  /** Motivo del rechazo o del error, cuando Wompi lo da */
  statusMessage: string | null
  reference: string
  paymentMethod: string | null
  /** El cobro lo hizo la renovación automática (no una persona) */
  automatic: boolean
  createdAt: string
  finalizedAt: string | null
}

export interface BillingOverview {
  paymentMethod: PaymentMethodSummary | null
  autoRenew: boolean
  /** Próximo cobro automático y su valor estimado (unidades de hoy) */
  nextChargeAt: string | null
  nextChargeAmount: number | null
  /** Intentos de renovación rechazados en este periodo */
  failedAttempts: number
  /** Hasta cuándo se puede seguir editando con el pago pendiente */
  graceEndsAt: string | null
  charges: BillingCharge[]
}

/** Lo necesario para registrar un medio de pago en el navegador */
export interface BillingConfig {
  environment: 'sandbox' | 'production'
  publicKey: string
  apiUrl: string
  /** Contratos que la persona debe aceptar (Wompi), con sus tokens de un solo uso */
  acceptance: {
    policyUrl: string
    personalDataUrl: string
    acceptanceToken: string
    personalAuthToken: string
  }
}

export interface PaymentMethodInput {
  type: PaymentMethodType
  /** Token de Wompi: tarjeta (tok_…), Nequi, DaviPlata o Bancolombia */
  token: string
  acceptanceToken: string
  personalAuthToken: string
  /** Tarjeta: vencimiento, solo para mostrarlo */
  expMonth?: number
  expYear?: number
}

/** Estado de un token de Nequi, DaviPlata o Bancolombia mientras la persona lo aprueba */
export interface PaymentTokenStatus {
  id: string
  status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'AVAILABLE' | 'ERROR'
  /** Bancolombia: página del banco donde la persona autoriza */
  authorizationUrl?: string | null
  /** DaviPlata: identifica el proceso para enviar y validar el código (OTP) */
  handle?: string
}

/** Resultado de pedir un cobro: el cobro, o un enlace de pago de Wompi si no hay medio guardado */
export interface ChargeRequestResult {
  charge: BillingCharge
  checkoutUrl: string | null
}

export const BILLING_CHARGE_KIND_LABELS: Record<BillingChargeKind, string> = {
  subscription: 'Plan',
  email_packs: 'Correos adicionales',
}
