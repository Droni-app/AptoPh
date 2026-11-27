import type LedgerAccount from '#models/finance/ledger_account'
import LedgerAccountModel from '#models/finance/ledger_account'
import type { Trx } from '#services/finance/support'

/**
 * The chart of accounts of a conjunto, indexed by id and by system key.
 */
export class AccountBook {
  private constructor(
    private byKey: Map<string, LedgerAccount>,
    private byId: Map<string, LedgerAccount>
  ) {}

  static async load(trx: Trx, tenantId: string) {
    const accounts = await LedgerAccountModel.query({ client: trx }).where('tenant_id', tenantId)
    return new AccountBook(
      new Map(accounts.filter((a) => a.systemKey).map((a) => [a.systemKey!, a])),
      new Map(accounts.map((a) => [a.id, a]))
    )
  }

  /** The account the system uses for `key` ("receivable.ordinary_fee"…) */
  key(key: string): LedgerAccount {
    const account = this.byKey.get(key)
    if (!account) throw new Error(`Missing system account ${key}`)
    return account
  }

  id(id: string): LedgerAccount | undefined {
    return this.byId.get(id)
  }

  /** Makes an account created in this transaction available for postings */
  register(account: LedgerAccount) {
    this.byId.set(account.id, account)
    if (account.systemKey) this.byKey.set(account.systemKey, account)
  }

  all() {
    return [...this.byId.values()]
  }
}
