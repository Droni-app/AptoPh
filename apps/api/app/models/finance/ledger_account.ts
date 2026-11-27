import { LedgerAccountSchema } from '#database/schema'
import type { AccountClass } from '@aptoph/shared'

/** Account of the chart of accounts (PUC) of a conjunto */
export default class LedgerAccount extends LedgerAccountSchema {
  declare class: AccountClass
  declare nature: 'debit' | 'credit'
}
