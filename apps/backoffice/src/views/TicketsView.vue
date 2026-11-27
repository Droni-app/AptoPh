<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  UiBadge,
  UiButton,
  UiInput,
  UiSelect,
  UiSwitch,
  UiTable,
  UiTabs,
  useToast,
  type TableColumn,
} from '@aptoph/ui'
import {
  TICKET_PRIORITIES,
  TICKET_PRIORITY_LABELS,
  TICKET_TYPES,
  TICKET_TYPE_LABELS,
  type ApiPaginated,
  type Building,
  type Ticket,
  type TicketAssignee,
  type TicketFilters,
  type TicketStats,
} from '@aptoph/shared'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import TicketDetailModal from '@/components/tickets/TicketDetailModal.vue'
import TicketPriorityBadge from '@/components/tickets/TicketPriorityBadge.vue'
import TicketStatusBadge from '@/components/tickets/TicketStatusBadge.vue'
import { buildingsApi } from '@/api/backoffice'
import { ticketsApi } from '@/api/tickets'
import { errorMessage } from '@/lib/errors'
import { formatDate } from '@/lib/format'
import { useTenantStore } from '@/stores/tenant'

const route = useRoute()
const router = useRouter()
const tenant = useTenantStore()
const toast = useToast()

type StatusTab = NonNullable<TicketFilters['status']>

const status = ref<StatusTab>('active')
const search = ref('')
const type = ref<TicketFilters['type']>('')
const priority = ref<TicketFilters['priority']>('')
const buildingId = ref('')
const assignedTo = ref('')
const overdue = ref(false)
const from = ref('')
const to = ref('')
const page = ref(1)

const list = ref<ApiPaginated<Ticket> | null>(null)
const stats = ref<TicketStats | null>(null)
const buildings = ref<Building[]>([])
const assignees = ref<TicketAssignee[]>([])
const loading = ref(false)
const showFilters = ref(false)

const detailOpen = ref(false)
const detailId = ref<string | null>(null)

const tabs = computed(() => {
  const s = stats.value
  return [
    { label: 'Por atender', value: 'active', badge: s ? s.open + s.inProgress : undefined },
    { label: 'Abiertas', value: 'open', badge: s?.open },
    { label: 'En trámite', value: 'in_progress', badge: s?.inProgress },
    { label: 'Resueltas', value: 'resolved' },
    { label: 'Cerradas', value: 'closed' },
    { label: 'Todas', value: '' },
  ]
})

const typeOptions = TICKET_TYPES.map((value) => ({ value, label: TICKET_TYPE_LABELS[value] }))
const priorityOptions = TICKET_PRIORITIES.map((value) => ({
  value,
  label: TICKET_PRIORITY_LABELS[value],
}))
const buildingOptions = computed(() => buildings.value.map((b) => ({ value: b.id, label: b.name })))
const assigneeOptions = computed(() => [
  { value: 'me', label: 'Asignadas a mí' },
  { value: 'none', label: 'Sin asignar' },
  ...assignees.value.map((a) => ({ value: a.id, label: a.fullName })),
])

const columns: TableColumn[] = [
  { name: 'subject', label: 'Solicitud' },
  { name: 'unit', label: 'Unidad' },
  { name: 'assignedTo', label: 'Responsable' },
  { name: 'priority', label: 'Prioridad' },
  { name: 'status', label: 'Estado' },
  { name: 'createdAt', label: 'Radicada' },
]

const activeFilters = computed(
  () =>
    [type.value, priority.value, buildingId.value, assignedTo.value, from.value, to.value].filter(
      Boolean,
    ).length + (overdue.value ? 1 : 0),
)

function clearFilters() {
  type.value = ''
  priority.value = ''
  buildingId.value = ''
  assignedTo.value = ''
  from.value = ''
  to.value = ''
  overdue.value = false
}

async function load() {
  loading.value = true
  try {
    const [rows, counts] = await Promise.all([
      ticketsApi.list({
        status: status.value,
        type: type.value,
        priority: priority.value,
        buildingId: buildingId.value || undefined,
        assignedTo: assignedTo.value || undefined,
        overdue: overdue.value || undefined,
        from: from.value || undefined,
        to: to.value || undefined,
        search: search.value || undefined,
        page: page.value,
      }),
      ticketsApi.stats(),
    ])
    list.value = rows
    stats.value = counts.data
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    loading.value = false
  }
}

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch([status, type, priority, buildingId, assignedTo, overdue, from, to], () => {
  page.value = 1
  load()
})
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => ((page.value = 1), load()), 300)
})

/** The summary tiles are shortcuts to a filter */
function only(filter: 'overdue' | 'unassigned' | 'mine') {
  clearFilters()
  status.value = 'active'
  if (filter === 'overdue') overdue.value = true
  if (filter === 'unassigned') assignedTo.value = 'none'
  if (filter === 'mine') assignedTo.value = 'me'
  showFilters.value = true
}

function openDetail(id: string) {
  detailId.value = id
  detailOpen.value = true
}

type TileKey = 'active' | 'overdue' | 'unassigned' | 'mine'
type Tile = { key: TileKey; label: string; value: number | null; icon: string; tone: string }

const tiles = computed(() => {
  const s = stats.value
  const items: Tile[] = [
    {
      key: 'active',
      label: 'Por atender',
      value: s ? s.open + s.inProgress : null,
      icon: 'mdi-inbox-outline',
      tone: 'bg-brand-50 text-brand-700 dark:bg-brand-400/15 dark:text-brand-200',
    },
    {
      key: 'overdue',
      label: 'Vencidas',
      value: s?.overdue ?? null,
      icon: 'mdi-clock-alert-outline',
      tone: 'bg-coral-50 text-coral-700 dark:bg-coral-400/15 dark:text-coral-300',
    },
  ]
  if (tenant.seesAllTickets) {
    items.push({
      key: 'unassigned',
      label: 'Sin asignar',
      value: s?.unassigned ?? null,
      icon: 'mdi-account-question-outline',
      tone: 'bg-amber-50 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200',
    })
  }
  if (tenant.canWorkTickets) {
    items.push({
      key: 'mine',
      label: 'Asignadas a mí',
      value: s?.mine ?? null,
      icon: 'mdi-account-check-outline',
      tone: 'bg-mint-50 text-mint-700 dark:bg-mint-400/15 dark:text-mint-300',
    })
  }
  return items
})

function onTile(key: TileKey) {
  if (key !== 'active') return only(key)
  clearFilters()
  status.value = 'active'
}

onMounted(async () => {
  load()
  // Link from the assignment email: /pqrs?id=…
  const id = route.query.id
  if (typeof id === 'string' && id) {
    openDetail(id)
    router.replace({ query: {} })
  }
  try {
    if (tenant.seesAllTickets) {
      const [b, a] = await Promise.all([buildingsApi.list(), ticketsApi.assignees()])
      buildings.value = b.data
      assignees.value = a.data
    }
  } catch {
    // Filters by tower and person are optional
  }
})
</script>

<template>
  <PageHeader
    title="PQRS"
    :subtitle="
      tenant.seesAllTickets
        ? 'Peticiones, quejas, reclamos, sugerencias y mantenimiento que radican los residentes'
        : 'Las solicitudes que la administración te asignó'
    "
  />

  <div class="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
    <button
      v-for="tile in tiles"
      :key="tile.key"
      type="button"
      class="flex items-start gap-3 rounded-2xl bg-white p-4 text-left ring-1 ring-brand-900/5 transition hover:ring-mint-500/40 dark:bg-neutral-900 dark:ring-white/10"
      @click="onTile(tile.key)"
    >
      <span class="grid size-10 shrink-0 place-items-center rounded-xl text-xl" :class="tile.tone">
        <i class="mdi" :class="tile.icon" aria-hidden="true" />
      </span>
      <span class="min-w-0">
        <span class="block text-xs font-medium text-neutral-500 dark:text-neutral-400">{{
          tile.label
        }}</span>
        <span class="block text-lg font-bold text-brand-700 tabular-nums dark:text-white">{{
          tile.value ?? '—'
        }}</span>
      </span>
    </button>
  </div>

  <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
    <UiTabs v-model="status" :tabs="tabs" aria-label="Estado" />
    <div class="flex w-full items-center gap-2 sm:w-auto">
      <UiInput
        v-model="search"
        type="search"
        placeholder="Número, asunto o unidad"
        aria-label="Buscar"
        class="w-full sm:w-64"
      />
      <UiButton
        variant="outline"
        :aria-expanded="showFilters"
        aria-controls="ticket-filters"
        @click="showFilters = !showFilters"
      >
        <i class="mdi mdi-filter-variant mr-1" aria-hidden="true" />Filtros
        <UiBadge
          v-if="activeFilters"
          :label="String(activeFilters)"
          color="primary"
          size="xs"
          class="ml-1"
        />
      </UiButton>
    </div>
  </div>

  <div
    v-if="showFilters"
    id="ticket-filters"
    class="mb-4 grid grid-cols-1 gap-3 rounded-2xl bg-neutral-50 p-4 sm:grid-cols-2 lg:grid-cols-4 dark:bg-white/5"
  >
    <label class="flex flex-col gap-1 text-xs font-medium text-neutral-600 dark:text-neutral-300">
      Tipo
      <UiSelect v-model="type" :options="typeOptions" placeholder="Todos" size="sm" block />
    </label>
    <label class="flex flex-col gap-1 text-xs font-medium text-neutral-600 dark:text-neutral-300">
      Prioridad
      <UiSelect v-model="priority" :options="priorityOptions" placeholder="Todas" size="sm" block />
    </label>
    <label
      v-if="tenant.seesAllTickets"
      class="flex flex-col gap-1 text-xs font-medium text-neutral-600 dark:text-neutral-300"
    >
      Torre
      <UiSelect
        v-model="buildingId"
        :options="buildingOptions"
        placeholder="Todas"
        size="sm"
        block
      />
    </label>
    <label
      v-if="tenant.seesAllTickets"
      class="flex flex-col gap-1 text-xs font-medium text-neutral-600 dark:text-neutral-300"
    >
      Responsable
      <UiSelect
        v-model="assignedTo"
        :options="assigneeOptions"
        placeholder="Cualquiera"
        size="sm"
        block
      />
    </label>
    <label class="flex flex-col gap-1 text-xs font-medium text-neutral-600 dark:text-neutral-300">
      Radicada desde
      <UiInput v-model="from" type="date" size="sm" block />
    </label>
    <label class="flex flex-col gap-1 text-xs font-medium text-neutral-600 dark:text-neutral-300">
      Hasta
      <UiInput v-model="to" type="date" size="sm" block />
    </label>
    <div class="flex items-end">
      <UiSwitch v-model="overdue" label="Solo vencidas" />
    </div>
    <div class="flex items-end justify-end">
      <UiButton v-if="activeFilters" variant="ghost" size="sm" @click="clearFilters"
        >Quitar filtros</UiButton
      >
    </div>
  </div>

  <UiTable
    :columns="columns"
    :rows="list?.data ?? []"
    :loading="loading"
    :pagination="
      list
        ? {
            page: list.metadata.currentPage,
            perPage: list.metadata.perPage,
            total: list.metadata.total,
          }
        : undefined
    "
    @paginate="(p: number) => ((page = p), load())"
  >
    <template #subject="row">
      <button
        type="button"
        class="flex max-w-md items-baseline gap-1.5 text-left font-medium hover:underline"
        @click="openDetail(row.id)"
      >
        <span class="shrink-0 text-neutral-400 tabular-nums">#{{ row.number }}</span>
        <span class="truncate">{{ row.subject }}</span>
      </button>
      <span class="mt-0.5 flex flex-wrap gap-3 text-xs text-neutral-500">
        <span>{{ TICKET_TYPE_LABELS[row.type as Ticket['type']] }}</span>
        <span v-if="row.createdBy">{{ row.createdBy.fullName }}</span>
        <span v-if="row.commentCount"
          ><i class="mdi mdi-comment-outline" aria-hidden="true" /> {{ row.commentCount }}</span
        >
      </span>
    </template>
    <template #unit="{ unit }">
      <span v-if="unit" class="whitespace-nowrap">
        {{ unit.building ? `${unit.building.name} · ` : '' }}{{ unit.code }}
      </span>
      <span v-else class="text-neutral-400">Zonas comunes</span>
    </template>
    <template #assignedTo="{ assignedTo: person }">
      <span v-if="person">{{ person.fullName }}</span>
      <span v-else class="text-amber-700 dark:text-amber-300">Sin asignar</span>
    </template>
    <template #priority="row">
      <TicketPriorityBadge :priority="row.priority" />
    </template>
    <template #status="row">
      <TicketStatusBadge :status="row.status" />
    </template>
    <template #createdAt="row">
      <span class="block whitespace-nowrap">{{ formatDate(row.createdAt) }}</span>
      <span
        v-if="row.isOverdue"
        class="flex items-center gap-1 text-xs font-medium whitespace-nowrap text-coral-700 dark:text-coral-300"
        ><i class="mdi mdi-clock-alert-outline" aria-hidden="true" />Venció el
        {{ formatDate(row.dueAt) }}</span
      >
      <span
        v-else-if="row.status === 'open' || row.status === 'in_progress'"
        class="block text-xs whitespace-nowrap text-neutral-500"
        >Vence el {{ formatDate(row.dueAt) }}</span
      >
    </template>
    <template #empty>
      <EmptyState
        art="sin-mensajes"
        :title="activeFilters || search ? 'Ninguna solicitud coincide' : 'No hay solicitudes aquí'"
        :description="
          activeFilters || search
            ? 'Prueba con otros filtros o búscala por su número.'
            : 'Cuando un residente radique una petición, queja, reclamo o solicitud de mantenimiento desde el portal, aparecerá aquí.'
        "
      />
    </template>
  </UiTable>

  <TicketDetailModal
    v-model="detailOpen"
    :ticket-id="detailId"
    :assignees="assignees"
    @changed="load"
  />
</template>
