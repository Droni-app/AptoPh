<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  DuiAlert,
  DuiButton,
  DuiDropdown,
  DuiDropdownItem,
  DuiInput,
  DuiSelect,
  DuiTable,
  DuiTabs,
  useToast,
  type TableColumn,
} from '@dronico/droni-kit'
import type { ApiPaginated, BillingPeriod, ChargeFilters, FinanceCharge } from '@aptoph/shared'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import StatusBadge from '@/components/finance/StatusBadge.vue'
import GeneratePeriodModal from '@/components/finance/GeneratePeriodModal.vue'
import ChargeFormModal from '@/components/finance/ChargeFormModal.vue'
import ChargeDetailModal from '@/components/finance/ChargeDetailModal.vue'
import { financeApi } from '@/api/finance'
import { useFinanceCatalog } from '@/composables/useFinanceCatalog'
import { errorMessage } from '@/lib/errors'
import { formatDate, formatMoney, formatPeriod, todayInput, unitLabel } from '@/lib/format'
import { useTenantStore } from '@/stores/tenant'

const route = useRoute()
const router = useRouter()
const tenant = useTenantStore()
const toast = useToast()
const catalog = useFinanceCatalog()

const tab = ref(String(route.query.tab ?? 'periods'))
watch(tab, (value) => router.replace({ query: { ...route.query, tab: value } }))
const tabs = [
  { label: 'Periodos', value: 'periods', icon: 'mdi mdi-calendar-month-outline' },
  { label: 'Cobros', value: 'charges', icon: 'mdi mdi-format-list-bulleted' },
]

// Periods
const periods = ref<BillingPeriod[]>([])
const loadingPeriods = ref(true)
const error = ref<string | null>(null)
const generateOpen = ref(false)
const generateMonth = ref<string | undefined>()

async function loadPeriods() {
  loadingPeriods.value = true
  try {
    periods.value = (await financeApi.periods()).data
    error.value = null
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loadingPeriods.value = false
  }
}

const periodColumns: TableColumn[] = [
  { name: 'period', label: 'Mes' },
  { name: 'dueOn', label: 'Vence' },
  { name: 'chargesCount', label: 'Cobros', classes: 'text-right' },
  { name: 'totalAmount', label: 'Facturado', classes: 'text-right' },
  { name: 'balance', label: 'Por cobrar', classes: 'text-right' },
  { name: 'status', label: 'Estado' },
  { name: 'actions', label: '', classes: 'w-14 text-right' },
]

async function togglePeriod(period: BillingPeriod) {
  try {
    if (period.status === 'open') await financeApi.closePeriod(period.id)
    else await financeApi.reopenPeriod(period.id)
    toast.success(period.status === 'open' ? 'Periodo cerrado' : 'Periodo reabierto')
    await loadPeriods()
  } catch (e) {
    toast.error(errorMessage(e))
  }
}

function showCharges(period: BillingPeriod) {
  filters.value = { ...filters.value, billingPeriodId: period.id, page: 1 }
  tab.value = 'charges'
}

function regenerate(period: BillingPeriod) {
  generateMonth.value = period.period.slice(0, 7)
  generateOpen.value = true
}

// Charges
const filters = ref<ChargeFilters>({
  page: 1,
  status: (route.query.estado as ChargeFilters['status']) ?? '',
  conceptId: '',
  search: '',
  billingPeriodId: undefined,
})
const charges = ref<ApiPaginated<FinanceCharge> | null>(null)
const loadingCharges = ref(false)
const chargeFormOpen = ref(false)
const detailOpen = ref(false)
const detailId = ref<string | null>(null)
const today = todayInput()

const statusOptions = [
  { value: '', label: 'Todos los estados' },
  { value: 'open', label: 'Pendientes' },
  { value: 'overdue', label: 'Vencidos' },
  { value: 'paid', label: 'Pagados' },
  { value: 'cancelled', label: 'Anulados' },
]
const conceptOptions = computed(() => [
  { value: '', label: 'Todos los conceptos' },
  ...catalog.concepts.value.map((concept) => ({ value: concept.id, label: concept.name })),
])
const selectedPeriod = computed(() =>
  periods.value.find((period) => period.id === filters.value.billingPeriodId),
)

const chargeColumns: TableColumn[] = [
  { name: 'unit', label: 'Unidad' },
  { name: 'concept', label: 'Concepto' },
  { name: 'period', label: 'Mes' },
  { name: 'dueOn', label: 'Vence' },
  { name: 'amount', label: 'Valor', classes: 'text-right' },
  { name: 'balance', label: 'Saldo', classes: 'text-right' },
  { name: 'status', label: 'Estado' },
]

async function loadCharges() {
  loadingCharges.value = true
  try {
    charges.value = await financeApi.charges({ ...filters.value, perPage: 50 })
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    loadingCharges.value = false
  }
}

let timer: ReturnType<typeof setTimeout> | undefined
watch(
  () => [filters.value.status, filters.value.conceptId, filters.value.billingPeriodId],
  () => {
    filters.value.page = 1
    loadCharges()
  },
)
watch(
  () => filters.value.search,
  () => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      filters.value.page = 1
      loadCharges()
    }, 300)
  },
)

const pagination = computed(() =>
  charges.value
    ? {
        page: charges.value.metadata.currentPage,
        perPage: charges.value.metadata.perPage,
        total: charges.value.metadata.total,
      }
    : undefined,
)

function openCharge(row: FinanceCharge) {
  detailId.value = row.id
  detailOpen.value = true
}

function refreshAll() {
  loadPeriods()
  loadCharges()
}

onMounted(() => {
  catalog.load()
  refreshAll()
})
</script>

<template>
  <PageHeader title="Facturación" subtitle="Cuotas del mes, intereses de mora y cobros puntuales">
    <template v-if="tenant.canManageFinance" #actions>
      <DuiButton variant="outline" @click="chargeFormOpen = true">
        <span class="mr-1"><i class="mdi mdi-plus" aria-hidden="true" /></span>Nuevo cobro
      </DuiButton>
      <DuiButton color="primary" @click="((generateMonth = undefined), (generateOpen = true))">
        <span class="mr-1"><i class="mdi mdi-calendar-sync-outline" aria-hidden="true" /></span
        >Facturar mes
      </DuiButton>
    </template>
  </PageHeader>

  <DuiTabs v-model="tab" :tabs="tabs" class="mb-4" aria-label="Vista" />
  <DuiAlert v-if="error" color="danger" variant="soft" class="mb-4">{{ error }}</DuiAlert>

  <DuiTable
    v-if="tab === 'periods'"
    :columns="periodColumns"
    :rows="periods"
    :loading="loadingPeriods"
  >
    <template #period="row">
      <button
        type="button"
        class="font-semibold hover:underline"
        @click="showCharges(row as BillingPeriod)"
      >
        {{ formatPeriod(row.period) }}
      </button>
    </template>
    <template #dueOn="{ dueOn }"
      ><span class="whitespace-nowrap">{{ formatDate(dueOn) }}</span></template
    >
    <template #chargesCount="{ chargesCount }"
      ><span class="tabular-nums">{{ chargesCount }}</span></template
    >
    <template #totalAmount="{ totalAmount }"
      ><span class="tabular-nums">{{ formatMoney(totalAmount) }}</span></template
    >
    <template #balance="{ balance }"
      ><span class="tabular-nums">{{ formatMoney(balance) }}</span></template
    >
    <template #status="{ status }"><StatusBadge kind="period" :status="status" /></template>
    <template #actions="row">
      <DuiDropdown
        v-if="tenant.canManageFinance"
        placement="bottom-end"
        min-width="14rem"
        :aria-label="`Acciones de ${formatPeriod(row.period)}`"
      >
        <template #trigger>
          <span class="grid size-8 place-items-center rounded-lg text-lg text-neutral-500"
            ><i class="mdi mdi-dots-vertical" aria-hidden="true"
          /></span>
        </template>
        <DuiDropdownItem
          icon="mdi mdi-format-list-bulleted"
          label="Ver cobros"
          @click="showCharges(row as BillingPeriod)"
        />
        <DuiDropdownItem
          v-if="row.status === 'open'"
          icon="mdi mdi-refresh"
          label="Completar facturación"
          @click="regenerate(row as BillingPeriod)"
        />
        <DuiDropdownItem
          :icon="
            row.status === 'open' ? 'mdi mdi-lock-outline' : 'mdi mdi-lock-open-variant-outline'
          "
          :label="row.status === 'open' ? 'Cerrar periodo' : 'Reabrir periodo'"
          @click="togglePeriod(row as BillingPeriod)"
        />
      </DuiDropdown>
    </template>
    <template #empty>
      <EmptyState
        title="Aún no has facturado ningún mes"
        description="Configura las tarifas de las unidades y genera la facturación del mes: AptoPH crea los cobros, calcula la mora y aplica los saldos a favor."
        art="bienvenida"
      >
        <div class="flex flex-wrap justify-center gap-2">
          <RouterLink :to="{ name: 'finance-fees' }"
            ><DuiButton variant="outline">Configurar tarifas</DuiButton></RouterLink
          >
          <DuiButton v-if="tenant.canManageFinance" color="primary" @click="generateOpen = true"
            >Facturar mes</DuiButton
          >
        </div>
      </EmptyState>
    </template>
  </DuiTable>

  <template v-else>
    <div class="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem_14rem]">
      <DuiInput
        v-model="filters.search"
        type="search"
        placeholder="Buscar por unidad"
        aria-label="Buscar por unidad"
        block
      />
      <DuiSelect
        v-model="filters.conceptId"
        :options="conceptOptions"
        aria-label="Concepto"
        block
      />
      <DuiSelect v-model="filters.status" :options="statusOptions" aria-label="Estado" block />
    </div>
    <p v-if="selectedPeriod" class="mb-3 flex items-center gap-2 text-sm">
      <span
        class="rounded-full bg-brand-50 px-3 py-1 font-medium text-brand-700 dark:bg-white/10 dark:text-white"
      >
        {{ formatPeriod(selectedPeriod.period) }}
      </span>
      <button
        type="button"
        class="text-neutral-500 underline"
        @click="filters.billingPeriodId = undefined"
      >
        Ver todos los meses
      </button>
    </p>
    <DuiTable
      :columns="chargeColumns"
      :rows="charges?.data ?? []"
      :loading="loadingCharges"
      :pagination="pagination"
      @paginate="(page: number) => ((filters.page = page), loadCharges())"
    >
      <template #unit="row">
        <RouterLink
          v-if="row.unit"
          :to="{ name: 'finance-statement', params: { unitId: row.unit.id } }"
          class="font-medium hover:underline"
        >
          {{ unitLabel(row.unit) }}
        </RouterLink>
      </template>
      <template #concept="row">
        <button
          type="button"
          class="text-left hover:underline"
          @click="openCharge(row as FinanceCharge)"
        >
          {{ row.concept?.name }}
          <span v-if="row.description" class="block max-w-xs truncate text-xs text-neutral-500">{{
            row.description
          }}</span>
        </button>
      </template>
      <template #period="{ period }"
        ><span class="whitespace-nowrap">{{ formatPeriod(period) }}</span></template
      >
      <template #dueOn="{ dueOn }"
        ><span class="whitespace-nowrap">{{ formatDate(dueOn) }}</span></template
      >
      <template #amount="{ amount }"
        ><span class="tabular-nums">{{ formatMoney(amount) }}</span></template
      >
      <template #balance="{ balance }"
        ><span class="font-semibold tabular-nums">{{ formatMoney(balance) }}</span></template
      >
      <template #status="row">
        <StatusBadge
          kind="charge"
          :status="row.status"
          :overdue="['pending', 'partially_paid'].includes(row.status) && row.dueOn < today"
        />
      </template>
      <template #empty>
        <EmptyState title="No hay cobros con estos filtros" />
      </template>
    </DuiTable>
  </template>

  <GeneratePeriodModal
    v-model="generateOpen"
    :initial-month="generateMonth"
    @generated="refreshAll"
  />
  <ChargeFormModal v-model="chargeFormOpen" @saved="refreshAll" />
  <ChargeDetailModal v-model="detailOpen" :charge-id="detailId" @changed="refreshAll" />
</template>
