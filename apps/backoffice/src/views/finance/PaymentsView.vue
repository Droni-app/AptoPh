<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  UiButton,
  UiInput,
  UiSelect,
  UiTable,
  useToast,
  type TableColumn,
} from '@aptoph/ui'
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUSES,
  PAYMENT_STATUS_LABELS,
  type ApiPaginated,
  type FinancePayment,
  type PaymentFilters,
} from '@aptoph/shared'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import StatusBadge from '@/components/finance/StatusBadge.vue'
import PaymentFormModal from '@/components/finance/PaymentFormModal.vue'
import PaymentDetailModal from '@/components/finance/PaymentDetailModal.vue'
import { financeApi } from '@/api/finance'
import { errorMessage } from '@/lib/errors'
import {
  csvAmount,
  downloadCsv,
  formatDateTime,
  formatMoney,
  isoDateOf,
  unitLabel,
} from '@/lib/format'
import { useTenantStore } from '@/stores/tenant'

const route = useRoute()
const router = useRouter()
const tenant = useTenantStore()
const toast = useToast()

const filters = ref<PaymentFilters>({
  page: 1,
  status: (route.query.estado as PaymentFilters['status']) ?? '',
  search: '',
  from: '',
  to: '',
})
const payments = ref<ApiPaginated<FinancePayment> | null>(null)
const loading = ref(false)
const formOpen = ref(route.query.nuevo === '1')
const detailOpen = ref(false)
const detailId = ref<string | null>(null)

const statusOptions = [
  { value: '', label: 'Todos los estados' },
  ...PAYMENT_STATUSES.map((value) => ({ value, label: PAYMENT_STATUS_LABELS[value] })),
]
const columns: TableColumn[] = [
  { name: 'number', label: 'Recibo' },
  { name: 'unit', label: 'Unidad' },
  { name: 'paidAt', label: 'Fecha' },
  { name: 'method', label: 'Medio' },
  { name: 'amount', label: 'Valor', classes: 'text-right' },
  { name: 'status', label: 'Estado' },
]

async function load() {
  loading.value = true
  try {
    payments.value = await financeApi.payments({
      ...filters.value,
      from: filters.value.from || undefined,
      to: filters.value.to || undefined,
      perPage: 50,
    })
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    loading.value = false
  }
}

let timer: ReturnType<typeof setTimeout> | undefined
watch(
  () => [filters.value.status, filters.value.from, filters.value.to],
  () => {
    filters.value.page = 1
    router.replace({ query: filters.value.status ? { estado: filters.value.status } : {} })
    load()
  },
)
watch(
  () => filters.value.search,
  () => {
    clearTimeout(timer)
    timer = setTimeout(() => ((filters.value.page = 1), load()), 300)
  },
)

const pagination = computed(() =>
  payments.value
    ? {
        page: payments.value.metadata.currentPage,
        perPage: payments.value.metadata.perPage,
        total: payments.value.metadata.total,
      }
    : undefined,
)

function open(row: FinancePayment) {
  detailId.value = row.id
  detailOpen.value = true
}

async function exportCsv() {
  const rows: FinancePayment[] = []
  for (let page = 1; page < 200; page++) {
    const result = await financeApi.payments({
      ...filters.value,
      from: filters.value.from || undefined,
      to: filters.value.to || undefined,
      page,
      perPage: 100,
    })
    rows.push(...result.data)
    if (page >= result.metadata.lastPage) break
  }
  downloadCsv('recaudo.csv', [
    [
      'Recibo',
      'Unidad',
      'Fecha',
      'Medio',
      'Referencia',
      'Cuenta',
      'Valor',
      'Saldo a favor',
      'Estado',
    ],
    ...rows.map((p) => [
      p.number,
      unitLabel(p.unit),
      isoDateOf(p.paidAt),
      PAYMENT_METHOD_LABELS[p.method],
      p.reference,
      p.cashAccount?.name,
      csvAmount(p.amount),
      csvAmount(p.unappliedAmount),
      PAYMENT_STATUS_LABELS[p.status],
    ]),
  ])
}

onMounted(load)
</script>

<template>
  <PageHeader
    title="Recaudo"
    subtitle="Pagos de las unidades y reportes de los residentes por confirmar"
  >
    <template #actions>
      <UiButton variant="outline" @click="exportCsv">
        <span class="mr-1"><i class="mdi mdi-download" aria-hidden="true" /></span>Exportar
      </UiButton>
      <UiButton v-if="tenant.canManageFinance" color="primary" @click="formOpen = true">
        <span class="mr-1"><i class="mdi mdi-cash-plus" aria-hidden="true" /></span>Registrar pago
      </UiButton>
    </template>
  </PageHeader>

  <div class="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_12rem_10rem_10rem]">
    <UiInput
      v-model="filters.search"
      type="search"
      placeholder="Unidad, recibo o referencia"
      aria-label="Buscar"
      block
    />
    <UiSelect v-model="filters.status" :options="statusOptions" aria-label="Estado" block />
    <UiInput v-model="filters.from" type="date" aria-label="Desde" block />
    <UiInput v-model="filters.to" type="date" aria-label="Hasta" block />
  </div>

  <UiTable
    :columns="columns"
    :rows="payments?.data ?? []"
    :loading="loading"
    :pagination="pagination"
    @paginate="(page: number) => ((filters.page = page), load())"
  >
    <template #number="row">
      <button
        type="button"
        class="font-semibold hover:underline"
        @click="open(row as FinancePayment)"
      >
        {{ row.number ? `RC-${row.number}` : 'Reportado' }}
      </button>
    </template>
    <template #unit="row">
      <RouterLink
        v-if="row.unit"
        :to="{ name: 'finance-statement', params: { unitId: row.unit.id } }"
        class="hover:underline"
        >{{ unitLabel(row.unit) }}</RouterLink
      >
    </template>
    <template #paidAt="{ paidAt }"
      ><span class="whitespace-nowrap">{{ formatDateTime(paidAt) }}</span></template
    >
    <template #method="row">
      {{ PAYMENT_METHOD_LABELS[row.method as keyof typeof PAYMENT_METHOD_LABELS] }}
      <span v-if="row.reference" class="block max-w-40 truncate text-xs text-neutral-500">{{
        row.reference
      }}</span>
    </template>
    <template #amount="row">
      <span class="font-semibold tabular-nums">{{ formatMoney(row.amount) }}</span>
      <span v-if="Number(row.unappliedAmount) > 0" class="block text-xs text-neutral-500"
        >{{ formatMoney(row.unappliedAmount) }} a favor</span
      >
    </template>
    <template #status="row">
      <button
        v-if="row.status === 'pending_review' && tenant.canManageFinance"
        type="button"
        @click="open(row as FinancePayment)"
      >
        <StatusBadge kind="payment" :status="row.status" />
      </button>
      <StatusBadge v-else kind="payment" :status="row.status" />
    </template>
    <template #empty>
      <EmptyState title="No hay pagos con estos filtros" />
    </template>
  </UiTable>

  <PaymentFormModal v-model="formOpen" @saved="load" />
  <PaymentDetailModal v-model="detailOpen" :payment-id="detailId" @changed="load" />
</template>
