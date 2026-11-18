import { VendorPaymentAllocationSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Bill from '#models/bill'
import VendorPayment from '#models/vendor_payment'

export default class VendorPaymentAllocation extends VendorPaymentAllocationSchema {
  @belongsTo(() => Bill)
  declare bill: BelongsTo<typeof Bill>

  @belongsTo(() => VendorPayment)
  declare vendorPayment: BelongsTo<typeof VendorPayment>
}
