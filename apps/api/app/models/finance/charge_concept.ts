import { ChargeConceptSchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import type { ChargeConceptType } from '@aptoph/shared'
import Charge from '#models/finance/charge'
import LedgerAccount from '#models/finance/ledger_account'

export default class ChargeConcept extends ChargeConceptSchema {
  declare type: ChargeConceptType

  @hasMany(() => Charge)
  declare charges: HasMany<typeof Charge>

  @belongsTo(() => LedgerAccount, { foreignKey: 'receivableAccountId' })
  declare receivableAccount: BelongsTo<typeof LedgerAccount>

  @belongsTo(() => LedgerAccount, { foreignKey: 'incomeAccountId' })
  declare incomeAccount: BelongsTo<typeof LedgerAccount>
}
