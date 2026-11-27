import { VendorPaymentSchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import type { PaymentMethod, VendorPaymentStatus } from '@aptoph/shared'
import Vendor from '#models/finance/vendor'
import CashAccount from '#models/finance/cash_account'
import VendorPaymentAllocation from '#models/finance/vendor_payment_allocation'

/** Comprobante de egreso */
export default class VendorPayment extends VendorPaymentSchema {
  declare method: PaymentMethod
  declare status: VendorPaymentStatus

  @belongsTo(() => Vendor)
  declare vendor: BelongsTo<typeof Vendor>

  @belongsTo(() => CashAccount)
  declare cashAccount: BelongsTo<typeof CashAccount>

  @hasMany(() => VendorPaymentAllocation)
  declare allocations: HasMany<typeof VendorPaymentAllocation>
}
