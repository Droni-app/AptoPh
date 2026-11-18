import { computed, ref } from 'vue'
import type { CashAccount, ChargeConcept, LedgerAccount } from '@aptoph/shared'
import { financeApi } from '@/api/finance'
import { useTenantStore } from '@/stores/tenant'

/**
 * Chart of accounts, concepts and bank accounts of the active conjunto, shared
 * by the finance forms. Loaded once per conjunto; `refresh` after changes.
 */
const state = {
  tenantId: ref<string | null>(null),
  accounts: ref<LedgerAccount[]>([]),
  concepts: ref<ChargeConcept[]>([]),
  cashAccounts: ref<CashAccount[]>([]),
  loading: null as Promise<void> | null,
}

export function useFinanceCatalog() {
  const tenant = useTenantStore()

  async function load(force = false) {
    if (!force && state.tenantId.value === tenant.currentId && !state.loading) return
    if (!force && state.loading) return state.loading
    state.loading = (async () => {
      const [accounts, concepts, cash] = await Promise.all([
        financeApi.accounts(),
        financeApi.concepts(),
        financeApi.cashAccounts(),
      ])
      state.accounts.value = accounts.data
      state.concepts.value = concepts.data
      state.cashAccounts.value = cash.data
      state.tenantId.value = tenant.currentId
    })().finally(() => {
      state.loading = null
    })
    return state.loading
  }

  const postable = computed(() =>
    state.accounts.value.filter((account) => account.isPostable && account.isActive),
  )

  return {
    accounts: state.accounts,
    concepts: state.concepts,
    cashAccounts: state.cashAccounts,
    postable,
    activeConcepts: computed(() => state.concepts.value.filter((concept) => concept.isActive)),
    activeCashAccounts: computed(() =>
      state.cashAccounts.value.filter((account) => account.isActive),
    ),
    load,
    refresh: () => load(true),
  }
}
