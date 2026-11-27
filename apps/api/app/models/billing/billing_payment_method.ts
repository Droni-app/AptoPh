import { BillingPaymentMethodSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { PaymentMethodType } from '@aptoph/shared'
import User from '#models/auth/user'

/**
 * A conjunto's saved payment method: a Wompi payment source. Only its id and
 * display data are stored, never card data. docs/billing.md
 */
export default class BillingPaymentMethod extends BillingPaymentMethodSchema {
  declare type: PaymentMethodType
  declare environment: 'sandbox' | 'production'
  declare status: 'active' | 'removed'

  @belongsTo(() => User, { foreignKey: 'createdById' })
  declare createdBy: BelongsTo<typeof User>
}
