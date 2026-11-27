import { BillSchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import type { BillStatus } from '@aptoph/shared'
import Vendor from '#models/finance/vendor'
import BillLine from '#models/finance/bill_line'
import VendorPaymentAllocation from '#models/finance/vendor_payment_allocation'

/** Cuenta por pagar: a vendor's invoice or cuenta de cobro */
export default class Bill extends BillSchema {
  declare status: BillStatus

  @belongsTo(() => Vendor)
  declare vendor: BelongsTo<typeof Vendor>

  @hasMany(() => BillLine)
  declare lines: HasMany<typeof BillLine>

  @hasMany(() => VendorPaymentAllocation)
  declare allocations: HasMany<typeof VendorPaymentAllocation>
}
