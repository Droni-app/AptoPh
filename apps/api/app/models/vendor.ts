import { VendorSchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import type { BankAccountKind, DocumentType } from '@aptoph/shared'
import LedgerAccount from '#models/ledger_account'
import Bill from '#models/bill'

/** Proveedor o acreedor: third party of the payables */
export default class Vendor extends VendorSchema {
  declare documentType: DocumentType | null
  declare bankAccountKind: BankAccountKind | null

  @belongsTo(() => LedgerAccount, { foreignKey: 'defaultAccountId' })
  declare defaultAccount: BelongsTo<typeof LedgerAccount>

  @hasMany(() => Bill)
  declare bills: HasMany<typeof Bill>
}
