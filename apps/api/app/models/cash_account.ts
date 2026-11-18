import { CashAccountSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { BankAccountKind, CashAccountType } from '@aptoph/shared'
import LedgerAccount from '#models/ledger_account'

/** Cuenta bancaria o caja, backed by its own ledger subaccount */
export default class CashAccount extends CashAccountSchema {
  declare type: CashAccountType
  declare accountKind: BankAccountKind | null

  @belongsTo(() => LedgerAccount, { foreignKey: 'ledgerAccountId' })
  declare ledgerAccount: BelongsTo<typeof LedgerAccount>
}
