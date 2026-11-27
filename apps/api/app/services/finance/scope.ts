import type Tenant from '#models/tenants/tenant'
import type { FinanceSettings } from '@aptoph/shared'
import { AccountBook } from '#services/finance/accounts'
import { Ledger } from '#services/finance/ledger'
import { ensureFinanceSetup } from '#services/finance/setup'
import { type Trx, lockFinance, settingsOf, todayFor, transaction } from '#services/finance/support'

/**
 * Everything a finance write needs, bound to one transaction that holds the
 * conjunto's finance lock.
 */
export class FinanceScope {
  readonly settings: FinanceSettings
  readonly ledger: Ledger
  readonly today: string

  private constructor(
    readonly trx: Trx,
    readonly tenant: Tenant,
    readonly accounts: AccountBook,
    readonly userId: string | null
  ) {
    this.settings = settingsOf(tenant)
    this.ledger = new Ledger(trx, tenant, accounts)
    this.today = todayFor(tenant)
  }

  static async open(trx: Trx, tenant: Tenant, userId: string | null) {
    await ensureFinanceSetup(tenant, trx)
    await lockFinance(trx, tenant.id)
    return new FinanceScope(trx, tenant, await AccountBook.load(trx, tenant.id), userId)
  }
}

/** Runs `callback` in a transaction with the finance scope of the conjunto */
export function withFinance<T>(
  tenant: Tenant,
  userId: string | null,
  callback: (scope: FinanceScope) => Promise<T>
) {
  return transaction(async (trx) => callback(await FinanceScope.open(trx, tenant, userId)))
}
