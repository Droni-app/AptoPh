import { BillingChargeSchema } from '#database/schema'
import { column } from '@adonisjs/lucid/orm'
import type { BillingCycle, BillingChargeKind, BillingChargeStatus, PlanId } from '@aptoph/shared'

/**
 * A charge of AptoPH to a conjunto (plan or email packs) with its unique Wompi
 * reference. Its effect is applied once (`applied_at`). docs/billing.md
 */
export default class BillingCharge extends BillingChargeSchema {
  declare kind: BillingChargeKind
  declare status: BillingChargeStatus
  declare environment: 'sandbox' | 'production'
  declare plan: PlanId | null
  declare billingCycle: BillingCycle | null

  /** bigint comes from PostgreSQL as text */
  @column({ consume: (value) => Number(value) })
  declare amountCents: number

  get amount() {
    return Math.round(this.amountCents / 100)
  }
}
