import type { BillingCharge as BillingChargeData, PaymentMethodSummary } from '@aptoph/shared'
import type BillingCharge from '#models/billing_charge'
import type BillingPaymentMethod from '#models/billing_payment_method'

export function serializePaymentMethod(method: BillingPaymentMethod): PaymentMethodSummary {
  const createdBy = method.$preloaded.createdBy as unknown as { fullName: string } | undefined
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    id: method.id,
    type: method.type,
    label: method.label,
    brand: method.brand,
    lastFour: method.lastFour,
    expiresOn:
      method.expMonth && method.expYear !== null
        ? `${pad(method.expMonth)}/${pad(method.expYear)}`
        : null,
    createdAt: method.createdAt.toISO()!,
    createdBy: createdBy?.fullName ?? null,
  }
}

export function serializeCharge(charge: BillingCharge): BillingChargeData {
  return {
    id: charge.id,
    kind: charge.kind,
    description: charge.description,
    amount: charge.amount,
    status: charge.status,
    statusMessage: charge.statusMessage,
    reference: charge.reference,
    paymentMethod: charge.paymentMethodLabel ?? (charge.checkout ? 'Wompi' : null),
    automatic: charge.automatic,
    createdAt: charge.createdAt.toISO()!,
    finalizedAt: charge.finalizedAt?.toISO() ?? null,
  }
}
