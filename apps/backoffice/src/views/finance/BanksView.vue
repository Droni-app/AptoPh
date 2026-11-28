<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { UiBadge, UiButton } from '@aptoph/ui'
import {
  BANK_ACCOUNT_KIND_LABELS,
  CASH_ACCOUNT_TYPE_LABELS,
  type CashAccount,
} from '@aptoph/shared'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import CashAccountFormModal from '@/components/finance/CashAccountFormModal.vue'
import TransferModal from '@/components/finance/TransferModal.vue'
import { useFinanceCatalog } from '@/composables/useFinanceCatalog'
import { formatMoney } from '@/lib/format'
import { useTenantStore } from '@/stores/tenant'

const tenant = useTenantStore()
const catalog = useFinanceCatalog()
const formOpen = ref(false)
const editing = ref<CashAccount | null>(null)
const transferOpen = ref(false)

onMounted(() => catalog.refresh())

const total = computed(() =>
  catalog.cashAccounts.value
    .filter((a) => a.isActive)
    .reduce((sum, a) => sum + Number(a.balance ?? 0), 0),
)
</script>

<template>
  <PageHeader title="Bancos y caja" :subtitle="`Disponible: ${formatMoney(total)}`">
    <template #actions>
      <RouterLink :to="{ name: 'finance-reconciliation' }"
        ><UiButton variant="outline">
          <span class="mr-1"><i class="mdi mdi-bank-check" aria-hidden="true" /></span>Conciliación
          bancaria
        </UiButton></RouterLink
      >
      <template v-if="tenant.canManageFinance">
        <UiButton
          variant="outline"
          :disabled="catalog.activeCashAccounts.value.length < 2"
          @click="transferOpen = true"
        >
          <span class="mr-1"><i class="mdi mdi-swap-horizontal" aria-hidden="true" /></span
          >Trasladar
        </UiButton>
        <UiButton color="primary" @click="((editing = null), (formOpen = true))">
          <span class="mr-1"><i class="mdi mdi-plus" aria-hidden="true" /></span>Nueva cuenta
        </UiButton>
      </template>
    </template>
  </PageHeader>

  <div v-if="catalog.cashAccounts.value.length" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <article
      v-for="account in catalog.cashAccounts.value"
      :key="account.id"
      class="flex flex-col gap-3 rounded-2xl bg-white p-5 ring-1 ring-brand-900/5 dark:bg-neutral-900 dark:ring-white/10"
      :class="account.isActive ? '' : 'opacity-60'"
    >
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-center gap-3">
          <span
            class="grid size-10 place-items-center rounded-xl bg-mint-50 text-xl text-mint-700 dark:bg-mint-400/15 dark:text-mint-300"
          >
            <i
              :class="account.type === 'bank' ? 'mdi mdi-bank-outline' : 'mdi mdi-cash'"
              aria-hidden="true"
            />
          </span>
          <div>
            <h3 class="font-semibold">{{ account.name }}</h3>
            <p class="text-xs text-neutral-500">
              {{
                account.type === 'bank'
                  ? [
                      account.bankName,
                      account.accountKind ? BANK_ACCOUNT_KIND_LABELS[account.accountKind] : null,
                      account.accountNumber,
                    ]
                      .filter(Boolean)
                      .join(' · ')
                  : CASH_ACCOUNT_TYPE_LABELS.cash
              }}
            </p>
          </div>
        </div>
        <UiBadge v-if="!account.isActive" label="Inactiva" size="sm" variant="soft" />
      </div>
      <p class="text-2xl font-bold text-brand-700 tabular-nums dark:text-white">
        {{ formatMoney(account.balance) }}
      </p>
      <div class="flex items-center justify-between gap-2 text-sm">
        <RouterLink
          v-if="account.ledgerAccount"
          :to="{
            name: 'finance-reports',
            query: { tab: 'ledger', cuenta: account.ledgerAccount.id },
          }"
          class="font-semibold text-mint-700 underline-offset-2 hover:underline dark:text-mint-300"
        >
          Ver movimientos · {{ account.ledgerAccount.code }}
        </RouterLink>
        <UiButton
          v-if="tenant.canManageFinance"
          size="sm"
          variant="ghost"
          @click="((editing = account), (formOpen = true))"
          >Editar</UiButton
        >
      </div>
    </article>
  </div>
  <EmptyState
    v-else
    title="Aún no hay cuentas"
    description="Crea la cuenta bancaria donde los residentes consignan y la caja menor. Cada una tiene su auxiliar contable."
  />

  <CashAccountFormModal v-model="formOpen" :account="editing" />
  <TransferModal v-model="transferOpen" />
</template>
