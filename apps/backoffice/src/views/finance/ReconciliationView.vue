<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { UiButton, UiTable, useToast, type TableColumn } from '@aptoph/ui'
import type { BankStatement } from '@aptoph/shared'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import ImportStatementModal from '@/components/finance/ImportStatementModal.vue'
import { financeApi } from '@/api/finance'
import { errorMessage } from '@/lib/errors'
import { formatDate, formatDateTime } from '@/lib/format'
import { useTenantStore } from '@/stores/tenant'

/** Imported bank statements and how far each one is reconciled */
const route = useRoute()
const tenant = useTenantStore()
const toast = useToast()

const statements = ref<BankStatement[] | null>(null)
const importOpen = ref(route.query.importar === '1')
const cashAccountId = (route.query.cuenta as string | undefined) || undefined

const columns: TableColumn[] = [
  { name: 'fileName', label: 'Extracto' },
  { name: 'period', label: 'Periodo' },
  { name: 'progress', label: 'Conciliado' },
  { name: 'createdAt', label: 'Importado' },
]

async function load() {
  try {
    statements.value = (await financeApi.bankStatements(cashAccountId)).data
  } catch (e) {
    toast.error(errorMessage(e))
  }
}
onMounted(load)

const done = (s: BankStatement) => s.reconciled + s.ignored
const percent = (s: BankStatement) => (s.linesCount ? Math.round((done(s) / s.linesCount) * 100) : 0)
</script>

<template>
  <div>
    <PageHeader
      title="Conciliación bancaria"
      subtitle="Importa el extracto del banco y cruza cada consignación con su recibo de caja, el pago que reportó el residente o la unidad de la referencia."
    >
      <template #before>
        <RouterLink
          :to="{ name: 'finance-banks' }"
          class="mb-1 inline-block text-sm text-neutral-500 hover:underline"
        >
          <span aria-hidden="true"><i class="mdi mdi-arrow-left" /></span> Bancos
        </RouterLink>
      </template>
      <template v-if="tenant.canManageFinance" #actions>
        <UiButton color="primary" @click="importOpen = true">
          <span class="mr-1"><i class="mdi mdi-upload" aria-hidden="true" /></span>Importar
          extracto
        </UiButton>
      </template>
    </PageHeader>

    <UiTable
      v-if="statements === null || statements.length"
      :columns="columns"
      :rows="statements ?? []"
      :loading="statements === null"
    >
      <template #fileName="row">
        <RouterLink
          :to="{ name: 'finance-reconciliation-statement', params: { id: row.id } }"
          class="font-medium text-brand-700 hover:underline dark:text-brand-200"
          >{{ row.fileName }}</RouterLink
        >
        <span class="block text-xs text-neutral-500">{{ row.cashAccount?.name }}</span>
      </template>
      <template #period="row">
        <span class="whitespace-nowrap"
          >{{ formatDate(row.startsOn) }} – {{ formatDate(row.endsOn) }}</span
        >
      </template>
      <template #progress="row">
        <div class="flex min-w-40 items-center gap-2">
          <div class="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-white/10">
            <div
              class="h-full rounded-full bg-mint-500"
              :style="{ width: `${percent(row as BankStatement)}%` }"
            />
          </div>
          <span class="text-xs whitespace-nowrap text-neutral-600 tabular-nums dark:text-neutral-300"
            >{{ done(row as BankStatement) }}/{{ row.linesCount }}</span
          >
        </div>
      </template>
      <template #createdAt="row">
        <span class="whitespace-nowrap">{{ formatDateTime(row.createdAt) }}</span>
        <span class="block text-xs text-neutral-500">{{ row.importedBy }}</span>
      </template>
    </UiTable>
    <EmptyState
      v-else
      title="Aún no has importado extractos"
      description="Descarga el extracto de la sucursal virtual del banco (CSV o Excel) e impórtalo. AptoPH propone con qué recibo, reporte o unidad va cada consignación."
    />

    <ImportStatementModal v-model="importOpen" :cash-account-id="cashAccountId" />
  </div>
</template>
