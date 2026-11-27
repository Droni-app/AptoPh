<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { UiButton, UiTable, useToast, type TableColumn } from '@aptoph/ui'
import type { Budget } from '@aptoph/shared'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import StatusBadge from '@/components/finance/StatusBadge.vue'
import { financeApi } from '@/api/finance'
import { errorMessage } from '@/lib/errors'
import { formatDate, formatMoney } from '@/lib/format'
import { useTenantStore } from '@/stores/tenant'

const router = useRouter()
const tenant = useTenantStore()
const toast = useToast()
const budgets = ref<Budget[]>([])
const loading = ref(true)
const creating = ref(false)

const columns: TableColumn[] = [
  { name: 'year', label: 'Año' },
  { name: 'name', label: 'Presupuesto' },
  { name: 'income', label: 'Ingresos', classes: 'text-right' },
  { name: 'expense', label: 'Gastos', classes: 'text-right' },
  { name: 'reserveFundRate', label: 'Fondo de imprevistos', classes: 'text-right' },
  { name: 'status', label: 'Estado' },
]

onMounted(async () => {
  try {
    budgets.value = (await financeApi.budgets()).data
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    loading.value = false
  }
})

/** New budget for next year, copying the items of the latest one */
async function create() {
  creating.value = true
  try {
    const latest = budgets.value[0]
    const year = latest ? latest.year + 1 : new Date().getFullYear()
    const source = latest ? (await financeApi.budget(latest.id)).data : null
    const { data } = await financeApi.createBudget({
      year,
      name: `Presupuesto ${year}`,
      reserveFundRate: Number(source?.reserveFundRate ?? 1),
      items: (source?.items ?? []).map((item) => ({
        accountId: item.accountId,
        description: item.description,
        annualAmount: Number(item.annualAmount),
      })),
    })
    await router.push({ name: 'finance-budget', params: { id: data.id } })
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <PageHeader
    title="Presupuesto"
    subtitle="Presupuesto anual aprobado por la asamblea y su ejecución"
  >
    <template v-if="tenant.canManageFinance" #actions>
      <UiButton color="primary" :loading="creating" @click="create">
        <span class="mr-1"><i class="mdi mdi-plus" aria-hidden="true" /></span>Nuevo presupuesto
      </UiButton>
    </template>
  </PageHeader>
  <UiTable :columns="columns" :rows="budgets" :loading="loading">
    <template #year="row">
      <RouterLink
        :to="{ name: 'finance-budget', params: { id: row.id } }"
        class="font-semibold hover:underline"
        >{{ row.year }}</RouterLink
      >
    </template>
    <template #name="row">
      {{ row.name }}
      <span v-if="row.approvedOn" class="block text-xs text-neutral-500"
        >Aprobado el {{ formatDate(row.approvedOn)
        }}{{ row.approvalReference ? ` · ${row.approvalReference}` : '' }}</span
      >
    </template>
    <template #income="row"
      ><span class="tabular-nums">{{ formatMoney(row.totals?.income) }}</span></template
    >
    <template #expense="row"
      ><span class="tabular-nums">{{ formatMoney(row.totals?.expense) }}</span></template
    >
    <template #reserveFundRate="{ reserveFundRate }">{{ Number(reserveFundRate) }} %</template>
    <template #status="row"><StatusBadge kind="budget" :status="row.status" /></template>
    <template #empty>
      <EmptyState
        title="Sin presupuestos"
        description="Crea el presupuesto del año: con él se calculan las cuotas y se controla la ejecución del gasto."
      />
    </template>
  </UiTable>
</template>
