<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { UiAlert, UiButton, UiCard, UiSkeleton } from '@aptoph/ui'
import type { CashAccount, FinanceSummary } from '@aptoph/shared'
import PageHeader from '@/components/PageHeader.vue'
import StatTile from '@/components/finance/StatTile.vue'
import { financeApi } from '@/api/finance'
import { errorMessage } from '@/lib/errors'
import { formatMoney, formatPeriod, formatShortPeriod } from '@/lib/format'
import { useTenantStore } from '@/stores/tenant'

const tenant = useTenantStore()
const summary = ref<FinanceSummary | null>(null)
const cashAccounts = ref<CashAccount[]>([])
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    const [result, cash] = await Promise.all([financeApi.summary(), financeApi.cashAccounts()])
    summary.value = result.data
    cashAccounts.value = cash.data.filter((account) => account.isActive)
  } catch (e) {
    error.value = errorMessage(e)
  }
})

const collectionRate = computed(() => {
  if (!summary.value || Number(summary.value.billed) === 0) return null
  return Math.round((Number(summary.value.collected) / Number(summary.value.billed)) * 100)
})

/** Bars of the last six months, scaled to the largest value */
const trend = computed(() => {
  const rows = summary.value?.trend ?? []
  const max = Math.max(
    1,
    ...rows.flatMap((row) => [Number(row.billed), Number(row.collected), Number(row.expenses)]),
  )
  return rows.map((row) => ({
    ...row,
    label: formatShortPeriod(row.month),
    bars: [
      {
        key: 'billed',
        value: row.billed,
        height: (Number(row.billed) / max) * 100,
        class: 'bg-brand-300 dark:bg-brand-400/60',
      },
      {
        key: 'collected',
        value: row.collected,
        height: (Number(row.collected) / max) * 100,
        class: 'bg-mint-500',
      },
      {
        key: 'expenses',
        value: row.expenses,
        height: (Number(row.expenses) / max) * 100,
        class: 'bg-coral-400',
      },
    ],
  }))
})
</script>

<template>
  <PageHeader
    title="Finanzas"
    :subtitle="
      summary ? `Resumen de ${formatPeriod(summary.month).toLowerCase()}` : 'Resumen del mes'
    "
  >
    <template v-if="tenant.canManageFinance" #actions>
      <RouterLink :to="{ name: 'finance-payments', query: { nuevo: '1' } }">
        <UiButton color="primary">
          <span class="mr-1"><i class="mdi mdi-cash-plus" aria-hidden="true" /></span>Registrar pago
        </UiButton>
      </RouterLink>
      <RouterLink :to="{ name: 'finance-billing' }">
        <UiButton variant="outline">Facturar el mes</UiButton>
      </RouterLink>
    </template>
  </PageHeader>

  <UiAlert v-if="error" color="danger" variant="soft" class="mb-6">{{ error }}</UiAlert>

  <div v-if="!summary && !error" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <UiSkeleton v-for="i in 8" :key="i" class="h-20 rounded-2xl" />
  </div>

  <template v-else-if="summary">
    <UiAlert v-if="summary.pendingReview.count > 0" color="warning" variant="soft" class="mb-6">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <span>
          Hay <strong>{{ summary.pendingReview.count }}</strong>
          {{ summary.pendingReview.count === 1 ? 'pago reportado' : 'pagos reportados' }} por
          residentes ({{ formatMoney(summary.pendingReview.amount) }}) esperando revisión.
        </span>
        <RouterLink
          :to="{ name: 'finance-payments', query: { estado: 'pending_review' } }"
          class="font-semibold underline underline-offset-2"
          >Revisar</RouterLink
        >
      </div>
    </UiAlert>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatTile
        label="Facturado este mes"
        :value="formatMoney(summary.billed)"
        icon="mdi mdi-file-document-outline"
        tone="brand"
        :to="{ name: 'finance-billing' }"
      />
      <StatTile
        label="Recaudado este mes"
        :value="formatMoney(summary.collected)"
        :hint="`${summary.paymentsCount} pagos${collectionRate !== null ? ` · ${collectionRate} % de lo facturado` : ''}`"
        icon="mdi mdi-cash-check"
        :to="{ name: 'finance-payments' }"
      />
      <StatTile
        label="Cartera vencida"
        :value="formatMoney(summary.receivables.overdue)"
        :hint="`${summary.receivables.unitsInArrears} unidades en mora · total ${formatMoney(summary.receivables.total)}`"
        icon="mdi mdi-alert-circle-outline"
        tone="coral"
        :to="{ name: 'finance-receivables' }"
      />
      <StatTile
        label="Saldos a favor"
        :value="formatMoney(summary.receivables.credit)"
        hint="Anticipos de las unidades"
        icon="mdi mdi-piggy-bank-outline"
        tone="brand"
        :to="{ name: 'finance-receivables' }"
      />
      <StatTile
        label="Bancos y caja"
        :value="formatMoney(summary.cash.total)"
        :hint="`${cashAccounts.length} cuentas activas`"
        icon="mdi mdi-bank-outline"
        :to="{ name: 'finance-banks' }"
      />
      <StatTile
        label="Gastos del mes"
        :value="formatMoney(summary.expenses)"
        icon="mdi mdi-receipt-text-outline"
        tone="amber"
        :to="{ name: 'finance-expenses' }"
      />
      <StatTile
        label="Cuentas por pagar"
        :value="formatMoney(summary.payables.total)"
        :hint="
          Number(summary.payables.overdue) > 0
            ? `${formatMoney(summary.payables.overdue)} vencidas`
            : `${summary.payables.dueSoon} vencen esta semana`
        "
        icon="mdi mdi-calendar-clock"
        tone="amber"
        :to="{ name: 'finance-expenses', query: { tab: 'bills' } }"
      />
      <StatTile
        label="Por revisar"
        :value="String(summary.pendingReview.count)"
        :hint="formatMoney(summary.pendingReview.amount)"
        icon="mdi mdi-inbox-arrow-down-outline"
        tone="coral"
        :to="{ name: 'finance-payments', query: { estado: 'pending_review' } }"
      />
    </div>

    <div class="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
      <UiCard title="Últimos seis meses">
        <div class="mb-3 flex flex-wrap gap-4 text-xs text-neutral-500 dark:text-neutral-400">
          <span class="flex items-center gap-1.5"
            ><span class="size-2.5 rounded-sm bg-brand-300 dark:bg-brand-400/60" />Facturado</span
          >
          <span class="flex items-center gap-1.5"
            ><span class="size-2.5 rounded-sm bg-mint-500" />Recaudado</span
          >
          <span class="flex items-center gap-1.5"
            ><span class="size-2.5 rounded-sm bg-coral-400" />Gastos</span
          >
        </div>
        <div
          class="flex h-48 items-end gap-3"
          role="img"
          aria-label="Facturado, recaudado y gastos por mes"
        >
          <div v-for="month in trend" :key="month.month" class="flex h-full flex-1 flex-col">
            <div class="flex flex-1 items-end justify-center gap-0.5">
              <span
                v-for="bar in month.bars"
                :key="bar.key"
                class="w-1/4 max-w-4 rounded-t"
                :class="bar.class"
                :style="{ height: `${Math.max(bar.height, Number(bar.value) > 0 ? 2 : 0)}%` }"
                :title="formatMoney(bar.value)"
              />
            </div>
            <span
              class="mt-2 text-center text-xs text-neutral-500 capitalize dark:text-neutral-400"
              >{{ month.label }}</span
            >
          </div>
        </div>
      </UiCard>

      <UiCard title="Saldos en bancos y caja">
        <ul class="divide-y divide-neutral-100 text-sm dark:divide-white/10">
          <li
            v-for="account in cashAccounts"
            :key="account.id"
            class="flex items-center justify-between gap-3 py-2.5"
          >
            <span class="min-w-0">
              <span class="block truncate font-medium">{{ account.name }}</span>
              <span class="block text-xs text-neutral-500">{{ account.ledgerAccount?.code }}</span>
            </span>
            <span class="font-semibold tabular-nums">{{ formatMoney(account.balance) }}</span>
          </li>
          <li v-if="cashAccounts.length === 0" class="py-3 text-neutral-500">
            Aún no hay cuentas.
            <RouterLink
              :to="{ name: 'finance-banks' }"
              class="font-semibold text-mint-700 underline dark:text-mint-300"
              >Crea la primera</RouterLink
            >
          </li>
        </ul>
      </UiCard>
    </div>
  </template>
</template>
