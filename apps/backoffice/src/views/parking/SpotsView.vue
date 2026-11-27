<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  UiBadge,
  UiButton,
  UiInput,
  UiSelect,
  UiTable,
  UiTabs,
  useToast,
  type TableColumn,
} from '@aptoph/ui'
import {
  PARKING_ASSIGNMENT_STATUSES,
  PARKING_ASSIGNMENT_STATUS_LABELS,
  PARKING_END_REASON_LABELS,
  PARKING_OWNERSHIP_LABELS,
  VEHICLE_TYPES,
  VEHICLE_TYPE_ICONS,
  VEHICLE_TYPE_LABELS,
  type ApiPaginated,
  type ParkingAssignment,
  type ParkingAssignmentStatus,
  type ParkingOwnership,
  type ParkingSettings,
  type ParkingSpot,
  type ParkingSpotsSummary,
  type VehicleType,
} from '@aptoph/shared'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import SpotFormModal from '@/components/parking/SpotFormModal.vue'
import AssignSpotModal from '@/components/parking/AssignSpotModal.vue'
import EndAssignmentModal from '@/components/parking/EndAssignmentModal.vue'
import { parkingApi } from '@/api/parking'
import { errorMessage } from '@/lib/errors'
import { formatDate, formatMoney } from '@/lib/format'
import { useTenantStore } from '@/stores/tenant'

const tenant = useTenantStore()
const toast = useToast()
const manage = computed(() => tenant.canManageParking)
const canSeeLotteries = computed(() => tenant.canReadParkingLotteries)

const tab = ref<'spots' | 'assignments'>('spots')
const summary = ref<ParkingSpotsSummary | null>(null)
const settings = ref<ParkingSettings | null>(null)
const spots = ref<ApiPaginated<ParkingSpot> | null>(null)
const assignments = ref<ApiPaginated<ParkingAssignment> | null>(null)
const loading = ref(false)
const importing = ref(false)

const search = ref('')
const ownership = ref<ParkingOwnership | ''>('')
const vehicleType = ref<VehicleType | ''>('')
const state = ref<'free' | 'assigned' | 'inactive' | ''>('')
const status = ref<ParkingAssignmentStatus | ''>('')
const page = ref(1)

const spotModal = ref(false)
const editing = ref<ParkingSpot | null>(null)
const assignModal = ref(false)
const assigning = ref<ParkingSpot | null>(null)
const endModal = ref(false)
const ending = ref<ParkingAssignment | null>(null)

const mode = computed(() => summary.value?.mode ?? 'private')
const tabs = computed(() => [
  { label: 'Parqueaderos', value: 'spots' },
  ...(mode.value === 'private' ? [] : [{ label: 'Asignaciones', value: 'assignments' }]),
])
const typeOptions = VEHICLE_TYPES.map((value) => ({ value, label: VEHICLE_TYPE_LABELS[value] }))
const ownershipOptions = [
  { value: 'private', label: 'Propios' },
  { value: 'communal', label: 'Comunales' },
]
const stateOptions = [
  { value: 'free', label: 'Libres' },
  { value: 'assigned', label: 'Asignados' },
  { value: 'inactive', label: 'Fuera de servicio' },
]
const statusOptions = PARKING_ASSIGNMENT_STATUSES.map((value) => ({
  value,
  label: PARKING_ASSIGNMENT_STATUS_LABELS[value],
}))

const spotColumns = computed<TableColumn[]>(() => [
  { name: 'code', label: 'Parqueadero' },
  { name: 'type', label: 'Tipo' },
  { name: 'unit', label: 'Unidad' },
  { name: 'vehicles', label: 'Vehículos' },
  { name: 'state', label: 'Estado' },
  ...(manage.value ? [{ name: 'actions', label: '', classes: 'text-right' }] : []),
])
const assignmentColumns = computed<TableColumn[]>(() => [
  { name: 'spot', label: 'Parqueadero' },
  { name: 'unit', label: 'Unidad' },
  { name: 'vehicle', label: 'Vehículo' },
  { name: 'period', label: 'Periodo' },
  ...(manage.value || tenant.canReadFinance
    ? [{ name: 'rate', label: 'Mensual', classes: 'text-right' }]
    : []),
  { name: 'status', label: 'Estado' },
  ...(manage.value ? [{ name: 'actions', label: '', classes: 'text-right' }] : []),
])

const unitLabel = (unit: { code: string; building: { name: string } | null } | null) =>
  unit ? [unit.building?.name, unit.code].filter(Boolean).join(' · ') : '—'
const holder = (spot: ParkingSpot) => spot.ownerUnit ?? spot.assignment?.unit ?? null
const statusColor = (value: ParkingAssignmentStatus) =>
  value === 'active'
    ? 'success'
    : value === 'offered' || value === 'scheduled'
      ? 'primary'
      : value === 'ended'
        ? 'neutral'
        : 'danger'
const visibleSummary = computed(
  () => summary.value?.byType.filter((row) => row.private > 0 || row.communal > 0) ?? [],
)

async function loadSummary() {
  summary.value = (await parkingApi.summary()).data
}

async function load() {
  loading.value = true
  try {
    if (tab.value === 'spots') {
      spots.value = await parkingApi.spots({
        ownership: ownership.value,
        vehicleType: vehicleType.value,
        state: state.value,
        search: search.value || undefined,
        page: page.value,
      })
    } else {
      assignments.value = await parkingApi.assignments({
        status: status.value,
        search: search.value || undefined,
        page: page.value,
      })
    }
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    loading.value = false
  }
}

async function refresh() {
  await Promise.all([load(), loadSummary()])
}

let timer: ReturnType<typeof setTimeout> | undefined
watch([tab, ownership, vehicleType, state, status], () => {
  page.value = 1
  load()
})
watch(search, () => {
  clearTimeout(timer)
  timer = setTimeout(() => ((page.value = 1), load()), 300)
})

function editSpot(spot: ParkingSpot | null) {
  editing.value = spot
  spotModal.value = true
}
function assign(spot: ParkingSpot) {
  assigning.value = spot
  assignModal.value = true
}
function end(assignment: ParkingAssignment) {
  ending.value = assignment
  endModal.value = true
}

async function importSpots() {
  importing.value = true
  try {
    const { data } = await parkingApi.importSpots()
    toast.success(
      data.created
        ? `Se crearon ${data.created} parqueaderos propios desde las unidades`
        : 'No hay parqueaderos nuevos en las unidades',
    )
    await refresh()
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    importing.value = false
  }
}

async function remove(spot: ParkingSpot) {
  try {
    await parkingApi.removeSpot(spot.id)
    toast.success(`Parqueadero ${spot.code} eliminado`)
    await refresh()
  } catch (e) {
    toast.error(errorMessage(e))
  }
}

onMounted(async () => {
  try {
    await loadSummary()
    if (manage.value) settings.value = (await parkingApi.settings()).data
  } catch (e) {
    toast.error(errorMessage(e))
  }
  await load()
})
</script>

<template>
  <PageHeader
    title="Parqueaderos"
    :subtitle="
      manage
        ? 'Parqueaderos propios y comunales, y a qué unidad está asignado cada uno'
        : 'Consulta a qué unidad pertenece cada parqueadero y sus vehículos'
    "
  >
    <template v-if="manage || canSeeLotteries" #actions>
      <UiButton
        v-if="canSeeLotteries && mode !== 'private'"
        variant="outline"
        :to="{ name: 'parking-lotteries' }"
      >
        <i class="mdi mdi-dice-multiple-outline mr-1" aria-hidden="true" />Sorteos
      </UiButton>
      <UiButton v-if="manage" variant="outline" :to="{ name: 'parking-settings' }">
        <i class="mdi mdi-cog-outline mr-1" aria-hidden="true" />Configuración
      </UiButton>
      <UiButton
        v-if="manage && mode !== 'communal'"
        variant="outline"
        :loading="importing"
        title="Crea un parqueadero propio por cada unidad tipo parqueadero anexa a un apartamento"
        @click="importSpots"
      >
        <i class="mdi mdi-database-import-outline mr-1" aria-hidden="true" />Traer de unidades
      </UiButton>
      <UiButton v-if="manage" color="primary" @click="editSpot(null)">
        <i class="mdi mdi-plus mr-1" aria-hidden="true" />Nuevo parqueadero
      </UiButton>
    </template>
  </PageHeader>

  <!-- Spots by vehicle type -->
  <div v-if="visibleSummary.length" class="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
    <div
      v-for="row in visibleSummary"
      :key="row.type"
      class="rounded-2xl bg-white p-4 ring-1 ring-brand-900/5 dark:bg-neutral-900 dark:ring-white/10"
    >
      <p class="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-300">
        <i class="mdi text-xl" :class="VEHICLE_TYPE_ICONS[row.type]" aria-hidden="true" />
        {{ VEHICLE_TYPE_LABELS[row.type] }}
      </p>
      <dl class="mt-2 grid grid-cols-2 gap-2 text-sm">
        <div v-if="row.communal">
          <dt class="text-xs text-neutral-500">Comunales libres</dt>
          <dd class="text-lg font-bold tabular-nums">
            {{ row.free
            }}<span class="text-sm font-medium text-neutral-400">/{{ row.communal }}</span>
          </dd>
        </div>
        <div v-if="row.private">
          <dt class="text-xs text-neutral-500">Propios</dt>
          <dd class="text-lg font-bold tabular-nums">{{ row.private }}</dd>
        </div>
      </dl>
    </div>
  </div>
  <p
    v-if="manage && summary?.withDebt"
    class="mb-4 flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-400/10 dark:text-amber-200"
  >
    <i class="mdi mdi-alert-outline text-lg" aria-hidden="true" />
    {{ summary.withDebt }}
    {{
      summary.withDebt === 1 ? 'unidad con cupo comunal tiene' : 'unidades con cupo comunal tienen'
    }}
    saldo vencido. Revísalas en Asignaciones.
  </p>

  <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
    <UiTabs v-if="tabs.length > 1" v-model="tab" :tabs="tabs" aria-label="Parqueaderos" />
    <div class="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
      <template v-if="tab === 'spots'">
        <UiSelect
          v-if="mode === 'mixed'"
          v-model="ownership"
          :options="ownershipOptions"
          placeholder="Propios y comunales"
          size="sm"
          aria-label="Propios o comunales"
        />
        <UiSelect
          v-model="vehicleType"
          :options="typeOptions"
          placeholder="Todos los vehículos"
          size="sm"
          aria-label="Tipo de vehículo"
        />
        <UiSelect
          v-if="mode !== 'private'"
          v-model="state"
          :options="stateOptions"
          placeholder="Cualquier estado"
          size="sm"
          aria-label="Estado"
        />
      </template>
      <UiSelect
        v-else
        v-model="status"
        :options="statusOptions"
        placeholder="Todas"
        size="sm"
        aria-label="Estado de la asignación"
      />
      <UiInput
        v-model="search"
        type="search"
        :placeholder="tab === 'spots' ? 'Código, unidad o placa' : 'Parqueadero o unidad'"
        aria-label="Buscar"
        class="w-full sm:w-60"
      />
    </div>
  </div>

  <UiTable
    v-if="tab === 'spots'"
    :columns="spotColumns"
    :rows="spots?.data ?? []"
    :loading="loading"
    :pagination="
      spots
        ? {
            page: spots.metadata.currentPage,
            perPage: spots.metadata.perPage,
            total: spots.metadata.total,
          }
        : undefined
    "
    @paginate="(p: number) => ((page = p), load())"
  >
    <template #code="row">
      <span class="block font-mono font-semibold">{{ row.code }}</span>
      <span class="block text-xs text-neutral-500">{{
        [row.location, row.isCovered ? 'Cubierto' : null].filter(Boolean).join(' · ')
      }}</span>
    </template>
    <template #type="row">
      <span class="flex items-center gap-1.5 whitespace-nowrap">
        <i
          class="mdi text-lg text-neutral-500"
          :class="VEHICLE_TYPE_ICONS[row.vehicleType as VehicleType]"
          aria-hidden="true"
        />{{ VEHICLE_TYPE_LABELS[row.vehicleType as VehicleType] }}
      </span>
      <span class="text-xs text-neutral-500">{{
        PARKING_OWNERSHIP_LABELS[row.ownership as ParkingOwnership]
      }}</span>
    </template>
    <template #unit="row">
      <span class="whitespace-nowrap">{{ unitLabel(holder(row)) }}</span>
    </template>
    <template #vehicles="row">
      <span v-if="row.vehicles.length" class="flex flex-wrap gap-1">
        <span
          v-for="vehicle in row.vehicles"
          :key="vehicle.id"
          class="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs font-semibold dark:bg-white/10"
          :class="row.assignment?.vehicle?.id === vehicle.id ? 'ring-1 ring-mint-500' : ''"
          :title="[vehicle.brand, vehicle.color].filter(Boolean).join(' ')"
          >{{ vehicle.plate }}</span
        >
      </span>
      <span v-else class="text-neutral-400">—</span>
    </template>
    <template #state="row">
      <UiBadge v-if="!row.isActive" label="Fuera de servicio" color="neutral" size="sm" />
      <template v-else-if="row.ownership === 'communal'">
        <UiBadge
          v-if="row.assignment"
          :label="
            PARKING_ASSIGNMENT_STATUS_LABELS[row.assignment.status as ParkingAssignmentStatus]
          "
          :color="statusColor(row.assignment.status)"
          variant="soft"
          size="sm"
        />
        <UiBadge v-else label="Libre" color="warning" variant="soft" size="sm" />
        <span v-if="row.assignment?.endsOn" class="block text-xs text-neutral-500"
          >hasta {{ formatDate(row.assignment.endsOn) }}</span
        >
      </template>
      <UiBadge v-else label="Propio" color="primary" variant="soft" size="sm" />
    </template>
    <template #actions="row">
      <span class="flex justify-end gap-1">
        <UiButton
          v-if="row.ownership === 'communal' && row.isActive && !row.assignment"
          size="sm"
          color="primary"
          variant="outline"
          @click="assign(row)"
          >Asignar</UiButton
        >
        <UiButton
          v-if="row.assignment"
          size="sm"
          variant="ghost"
          color="danger"
          @click="end(row.assignment)"
          >Terminar</UiButton
        >
        <UiButton
          size="sm"
          variant="ghost"
          :aria-label="`Editar ${row.code}`"
          @click="editSpot(row)"
        >
          <i class="mdi mdi-pencil-outline" aria-hidden="true" />
        </UiButton>
        <UiButton
          v-if="!row.assignment"
          size="sm"
          variant="ghost"
          color="danger"
          :aria-label="`Eliminar ${row.code}`"
          @click="remove(row)"
        >
          <i class="mdi mdi-delete-outline" aria-hidden="true" />
        </UiButton>
      </span>
    </template>
    <template #empty>
      <EmptyState
        art="sin-resultados"
        :title="search ? 'Ningún parqueadero coincide' : 'Todavía no hay parqueaderos'"
        :description="
          search || !manage
            ? undefined
            : mode === 'communal'
              ? 'Crea los cupos comunales, uno por uno o en lote (P-001 a P-080).'
              : 'Trae los parqueaderos propios desde las unidades o créalos uno por uno.'
        "
      />
    </template>
  </UiTable>

  <UiTable
    v-else
    :columns="assignmentColumns"
    :rows="assignments?.data ?? []"
    :loading="loading"
    :pagination="
      assignments
        ? {
            page: assignments.metadata.currentPage,
            perPage: assignments.metadata.perPage,
            total: assignments.metadata.total,
          }
        : undefined
    "
    @paginate="(p: number) => ((page = p), load())"
  >
    <template #spot="row">
      <span class="font-mono font-semibold">{{ row.spot.code }}</span>
    </template>
    <template #unit="row">
      <span class="whitespace-nowrap">{{ unitLabel(row.unit) }}</span>
    </template>
    <template #vehicle="row">
      <span v-if="row.vehicle" class="font-mono text-sm">{{ row.vehicle.plate }}</span>
      <span v-else class="text-neutral-400">—</span>
    </template>
    <template #period="row">
      <span class="block whitespace-nowrap">{{ formatDate(row.startsOn) }}</span>
      <span class="block text-xs whitespace-nowrap text-neutral-500">{{
        row.endedOn && row.status !== 'ended'
          ? `terminó ${formatDate(row.endedOn)}`
          : row.endsOn
            ? `hasta ${formatDate(row.endsOn)}`
            : 'sin fin'
      }}</span>
    </template>
    <template #rate="row">
      <span class="tabular-nums">{{
        row.monthlyRate === null ? '—' : formatMoney(row.monthlyRate)
      }}</span>
    </template>
    <template #status="row">
      <UiBadge
        :label="PARKING_ASSIGNMENT_STATUS_LABELS[row.status as ParkingAssignmentStatus]"
        :color="statusColor(row.status)"
        variant="soft"
        size="sm"
      />
      <span
        v-if="row.endReason"
        class="block text-xs text-neutral-500"
        :title="row.endNote ?? ''"
        >{{
          PARKING_END_REASON_LABELS[row.endReason as keyof typeof PARKING_END_REASON_LABELS]
        }}</span
      >
    </template>
    <template #actions="row">
      <UiButton
        v-if="['scheduled', 'offered', 'active'].includes(row.status)"
        size="sm"
        variant="ghost"
        color="danger"
        @click="end(row)"
        >Terminar</UiButton
      >
    </template>
    <template #empty>
      <EmptyState
        art="sin-resultados"
        :title="search ? 'Ninguna asignación coincide' : 'Todavía no hay asignaciones'"
        :description="
          manage && !search
            ? 'Asigna un cupo comunal libre desde la pestaña Parqueaderos.'
            : undefined
        "
      />
    </template>
  </UiTable>

  <SpotFormModal v-model="spotModal" :spot="editing" :mode="mode" @saved="refresh" />
  <AssignSpotModal v-model="assignModal" :spot="assigning" :settings="settings" @saved="refresh" />
  <EndAssignmentModal v-model="endModal" :assignment="ending" @saved="refresh" />
</template>
