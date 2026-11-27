<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  UiAlert,
  UiButton,
  UiCheckbox,
  UiInput,
  UiTable,
  type TableColumn,
} from '@aptoph/ui'
import { UNIT_TYPE_LABELS, type ReceivablesAging } from '@aptoph/shared'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import StatTile from '@/components/finance/StatTile.vue'
import { financeApi } from '@/api/finance'
import { errorMessage } from '@/lib/errors'
import { csvAmount, downloadCsv, formatAmount, formatDate, formatMoney } from '@/lib/format'

const aging = ref<ReceivablesAging | null>(null)
const error = ref<string | null>(null)
const search = ref('')
const onlyArrears = ref(true)

onMounted(async () => {
  try {
    aging.value = (await financeApi.receivables()).data
  } catch (e) {
    error.value = errorMessage(e)
  }
})

type Row = ReceivablesAging['rows'][number]
const label = (row: Row) =>
  [row.building, `${UNIT_TYPE_LABELS[row.type]} ${row.code}`].filter(Boolean).join(' · ')
const overdue = (row: Row) =>
  Number(row.d30) + Number(row.d60) + Number(row.d90) + Number(row.over90)

const rows = computed(() =>
  (aging.value?.rows ?? []).filter(
    (row) =>
      (!onlyArrears.value || overdue(row) > 0) &&
      (!search.value || row.code.toLowerCase().includes(search.value.toLowerCase())),
  ),
)

const columns: TableColumn[] = [
  { name: 'unit', label: 'Unidad' },
  { name: 'oldestDue', label: 'Debe desde' },
  { name: 'current', label: 'Por vencer', classes: 'text-right' },
  { name: 'd30', label: '1–30 días', classes: 'text-right' },
  { name: 'd60', label: '31–60', classes: 'text-right' },
  { name: 'd90', label: '61–90', classes: 'text-right' },
  { name: 'over90', label: 'Más de 90', classes: 'text-right' },
  { name: 'total', label: 'Total', classes: 'text-right' },
]

function exportCsv() {
  if (!aging.value) return
  downloadCsv(`cartera-${aging.value.asOf}.csv`, [
    [
      'Unidad',
      'Debe desde',
      'Por vencer',
      '1-30',
      '31-60',
      '61-90',
      'Más de 90',
      'Total',
      'Saldo a favor',
    ],
    ...aging.value.rows.map((row) => [
      label(row),
      row.oldestDue,
      csvAmount(row.current),
      csvAmount(row.d30),
      csvAmount(row.d60),
      csvAmount(row.d90),
      csvAmount(row.over90),
      csvAmount(row.total),
      csvAmount(row.credit),
    ]),
  ])
}
</script>

<template>
  <PageHeader
    title="Cartera"
    :subtitle="
      aging ? `Edades de la deuda al ${formatDate(aging.asOf)}` : 'Edades de la deuda por unidad'
    "
  >
    <template #actions>
      <UiButton variant="outline" :disabled="!aging" @click="exportCsv">
        <span class="mr-1"><i class="mdi mdi-download" aria-hidden="true" /></span>Exportar
      </UiButton>
    </template>
  </PageHeader>
  <UiAlert v-if="error" color="danger" variant="soft" class="mb-4">{{ error }}</UiAlert>

  <div v-if="aging" class="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <StatTile
      label="Cartera total"
      :value="formatMoney(aging.totals.total)"
      icon="mdi mdi-account-cash-outline"
      tone="brand"
    />
    <StatTile
      label="Vencida"
      :value="formatMoney(Number(aging.totals.total) - Number(aging.totals.current))"
      :hint="`${aging.unitsInArrears} unidades en mora`"
      icon="mdi mdi-alert-circle-outline"
      tone="coral"
    />
    <StatTile
      label="Más de 90 días"
      :value="formatMoney(aging.totals.over90)"
      hint="Candidata a cobro jurídico"
      icon="mdi mdi-gavel"
      tone="amber"
    />
    <StatTile
      label="Saldos a favor"
      :value="formatMoney(aging.totals.credit)"
      icon="mdi mdi-piggy-bank-outline"
    />
  </div>

  <div class="mb-4 flex flex-wrap items-center gap-4">
    <UiInput
      v-model="search"
      type="search"
      placeholder="Buscar unidad"
      aria-label="Buscar unidad"
      class="w-full sm:w-72"
    />
    <UiCheckbox v-model="onlyArrears" label="Solo unidades en mora" />
  </div>

  <UiTable :columns="columns" :rows="rows" :loading="!aging && !error">
    <template #unit="row">
      <RouterLink
        :to="{ name: 'finance-statement', params: { unitId: row.unitId } }"
        class="font-medium hover:underline"
        >{{ label(row as Row) }}</RouterLink
      >
      <span v-if="Number(row.credit) > 0" class="block text-xs text-mint-700 dark:text-mint-300"
        >{{ formatMoney(row.credit) }} a favor</span
      >
    </template>
    <template #oldestDue="{ oldestDue }">{{ formatDate(oldestDue) }}</template>
    <template #current="{ current }"
      ><span class="tabular-nums">{{ formatAmount(current) }}</span></template
    >
    <template #d30="{ d30 }"
      ><span class="tabular-nums">{{ formatAmount(d30) }}</span></template
    >
    <template #d60="{ d60 }"
      ><span class="tabular-nums">{{ formatAmount(d60) }}</span></template
    >
    <template #d90="{ d90 }"
      ><span class="tabular-nums text-coral-700 dark:text-coral-300">{{
        formatAmount(d90)
      }}</span></template
    >
    <template #over90="{ over90 }"
      ><span class="font-semibold tabular-nums text-coral-700 dark:text-coral-300">{{
        formatAmount(over90)
      }}</span></template
    >
    <template #total="{ total }"
      ><span class="font-semibold tabular-nums">{{ formatMoney(total) }}</span></template
    >
    <template #empty>
      <EmptyState
        :title="onlyArrears ? 'Ninguna unidad está en mora' : 'No hay cartera'"
        description="Todas las unidades están al día."
      />
    </template>
  </UiTable>
</template>
