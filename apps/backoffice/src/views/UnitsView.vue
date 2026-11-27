<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  UiAlert,
  UiBadge,
  UiButton,
  UiInput,
  UiSelect,
  UiTable,
  type TableColumn,
} from '@aptoph/ui'
import {
  UNIT_STATUSES,
  UNIT_STATUS_LABELS,
  UNIT_TYPES,
  UNIT_TYPE_LABELS,
  type ApiPaginated,
  type Building,
  type Unit,
  type UnitStatus,
  type UnitType,
} from '@aptoph/shared'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import UnitFormModal from '@/components/UnitFormModal.vue'
import { buildingsApi, unitsApi } from '@/api/backoffice'
import { errorMessage } from '@/lib/errors'
import { useTenantStore } from '@/stores/tenant'

const route = useRoute()
const router = useRouter()
const tenant = useTenantStore()

const PER_PAGE = 25
const buildings = ref<Building[]>([])
const result = ref<ApiPaginated<Unit> | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const formOpen = ref(false)

const queryString = (key: string) =>
  typeof route.query[key] === 'string' ? (route.query[key] as string) : ''

const filters = ref({
  search: queryString('search'),
  buildingId: queryString('buildingId'),
  type: queryString('type') as UnitType | '',
  status: queryString('status') as UnitStatus | '',
  page: Number(queryString('page')) || 1,
})

const columns: TableColumn[] = [
  { name: 'code', label: 'Unidad' },
  { name: 'building', label: 'Torre' },
  { name: 'type', label: 'Tipo' },
  { name: 'floor', label: 'Piso', classes: 'w-20' },
  { name: 'ownershipCoefficient', label: 'Coeficiente', classes: 'w-32' },
  { name: 'occupantsCount', label: 'Ocupantes', classes: 'w-28' },
  { name: 'status', label: 'Estado', classes: 'w-36' },
]

const buildingOptions = computed(() => [
  { value: '', label: 'Todas las torres' },
  ...buildings.value.map((building) => ({ value: building.id, label: building.name })),
])
const typeOptions = [
  { value: '', label: 'Todos los tipos' },
  ...UNIT_TYPES.map((value) => ({ value, label: UNIT_TYPE_LABELS[value] })),
]
const statusOptions = [
  { value: '', label: 'Todos los estados' },
  ...UNIT_STATUSES.map((value) => ({ value, label: UNIT_STATUS_LABELS[value] })),
]
const statusColor: Record<UnitStatus, 'success' | 'neutral' | 'warning'> = {
  occupied: 'success',
  vacant: 'neutral',
  under_construction: 'warning',
}

const pagination = computed(() =>
  result.value
    ? {
        page: result.value.metadata.currentPage,
        perPage: result.value.metadata.perPage,
        total: result.value.metadata.total,
      }
    : undefined,
)

async function load() {
  loading.value = true
  try {
    result.value = await unitsApi.list({ ...filters.value, perPage: PER_PAGE })
    error.value = null
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(
  () => filters.value.search,
  () => {
    clearTimeout(searchTimer)
    searchTimer = setTimeout(() => {
      filters.value.page = 1
      sync()
    }, 300)
  },
)
watch(
  () => [filters.value.buildingId, filters.value.type, filters.value.status],
  () => {
    filters.value.page = 1
    sync()
  },
)

/** Keeps filters in the URL so they survive reloads and back navigation */
function sync() {
  const query = Object.fromEntries(
    Object.entries(filters.value).filter(
      ([key, value]) => value !== '' && !(key === 'page' && value === 1),
    ),
  )
  router.replace({ query })
  load()
}

function paginate(page: number) {
  filters.value.page = page
  sync()
}

function percent(coefficient: string) {
  return `${(Number(coefficient) * 100).toLocaleString('es-CO', { maximumFractionDigits: 4 })} %`
}

onMounted(async () => {
  buildingsApi
    .list()
    .then(({ data }) => (buildings.value = data))
    .catch(() => undefined)
  await load()
})
</script>

<template>
  <PageHeader title="Unidades" subtitle="Apartamentos, casas, locales, parqueaderos y depósitos">
    <template #actions>
      <UiButton v-if="tenant.canManage" color="primary" @click="formOpen = true">
        <span class="mdi mdi-plus mr-1" aria-hidden="true" />Nueva unidad
      </UiButton>
    </template>
  </PageHeader>

  <div class="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
    <UiInput
      v-model="filters.search"
      type="search"
      placeholder="Buscar por código…"
      aria-label="Buscar por código"
    />
    <UiSelect v-model="filters.buildingId" :options="buildingOptions" aria-label="Torre" />
    <UiSelect v-model="filters.type" :options="typeOptions" aria-label="Tipo" />
    <UiSelect v-model="filters.status" :options="statusOptions" aria-label="Estado" />
  </div>

  <UiAlert v-if="error" color="danger" variant="soft" class="mb-4">{{ error }}</UiAlert>

  <UiTable
    :columns="columns"
    :rows="result?.data ?? []"
    :loading="loading"
    :pagination="pagination"
    @paginate="paginate"
  >
    <template #code="{ id, code }">
      <RouterLink
        :to="{ name: 'unit', params: { id } }"
        class="font-medium text-brand-600 hover:underline dark:text-brand-200"
      >
        {{ code }}
      </RouterLink>
    </template>
    <template #building="{ building }">{{ building?.name ?? '—' }}</template>
    <template #type="{ type }">{{ UNIT_TYPE_LABELS[type as UnitType] }}</template>
    <template #floor="{ floor }">{{ floor ?? '—' }}</template>
    <template #ownershipCoefficient="{ ownershipCoefficient }">
      <span class="tabular-nums">{{ percent(ownershipCoefficient) }}</span>
    </template>
    <template #status="{ status }">
      <UiBadge
        :label="UNIT_STATUS_LABELS[status as UnitStatus]"
        :color="statusColor[status as UnitStatus]"
        variant="soft"
        size="sm"
      />
    </template>
    <template #empty
      ><EmptyState
        title="No hay unidades que coincidan"
        description="Prueba con otros filtros o crea una unidad nueva."
    /></template>
  </UiTable>

  <UnitFormModal
    v-model="formOpen"
    :buildings="buildings"
    @saved="(unit) => router.push({ name: 'unit', params: { id: unit.id } })"
  />
</template>
