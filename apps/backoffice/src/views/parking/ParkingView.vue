<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
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
  PARKING_AUTHORIZATION_LABELS,
  PARKING_SETTLEMENTS,
  PARKING_SETTLEMENT_LABELS,
  VEHICLE_TYPES,
  VEHICLE_TYPE_ICONS,
  VEHICLE_TYPE_LABELS,
  formatMinutes,
  type ApiPaginated,
  type ParkingSettlement,
  type ParkingStay,
  type ParkingStayStatus,
  type ParkingSummary,
  type VehicleType,
  type VisitorParkingSettings,
} from '@aptoph/shared'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import ParkingEntryModal from '@/components/parking/ParkingEntryModal.vue'
import ParkingStayModal from '@/components/parking/ParkingStayModal.vue'
import { visitorParkingApi } from '@/api/visitorParking'
import { errorMessage } from '@/lib/errors'
import { formatDateTime, formatMoney } from '@/lib/format'
import { useTenantStore } from '@/stores/tenant'

const tenant = useTenantStore()
const toast = useToast()

const summary = ref<ParkingSummary | null>(null)
const settings = ref<VisitorParkingSettings | null>(null)
const list = ref<ApiPaginated<ParkingStay> | null>(null)
const loading = ref(false)

const status = ref<ParkingStayStatus>('inside')
const search = ref('')
const vehicleType = ref<VehicleType | ''>('')
const settlement = ref<ParkingSettlement | ''>('')
const from = ref('')
const to = ref('')
const page = ref(1)

const entryOpen = ref(false)
const stayOpen = ref(false)
const stayId = ref<string | null>(null)

const tabs = computed(() => [
  { label: 'Adentro', value: 'inside', badge: summary.value?.inside },
  { label: 'Historial', value: 'exited' },
])
const typeOptions = VEHICLE_TYPES.map((value) => ({ value, label: VEHICLE_TYPE_LABELS[value] }))
const settlementOptions = PARKING_SETTLEMENTS.map((value) => ({
  value,
  label: PARKING_SETTLEMENT_LABELS[value],
}))

const insideColumns: TableColumn[] = [
  { name: 'vehicle', label: 'Vehículo' },
  { name: 'unit', label: 'Unidad' },
  { name: 'visitor', label: 'Visitante' },
  { name: 'enteredAt', label: 'Ingreso' },
  { name: 'amount', label: 'Valor a hoy', classes: 'text-right' },
  { name: 'actions', label: '', classes: 'text-right' },
]
const historyColumns: TableColumn[] = [
  { name: 'number', label: 'N.º' },
  { name: 'vehicle', label: 'Vehículo' },
  { name: 'unit', label: 'Unidad' },
  { name: 'times', label: 'Ingreso y salida' },
  { name: 'amount', label: 'Valor', classes: 'text-right' },
  { name: 'settlement', label: 'Cobro' },
]

/** Spot types worth showing: with spots or with vehicles inside */
const capacity = computed(
  () => summary.value?.byType.filter((row) => row.capacity > 0 || row.inside > 0) ?? [],
)

const unitLabel = (unit: ParkingStay['unit']) =>
  [unit.building?.name, unit.code].filter(Boolean).join(' · ')
const elapsed = (stay: ParkingStay) => formatMinutes(stay.quote.minutes)
const settlementColor = (value: ParkingSettlement | null) =>
  value === 'gate'
    ? 'success'
    : value === 'unit'
      ? 'primary'
      : value === 'exempt'
        ? 'warning'
        : 'neutral'

async function load() {
  loading.value = true
  try {
    const [rows, counts] = await Promise.all([
      visitorParkingApi.stays({
        status: status.value,
        vehicleType: vehicleType.value,
        settlement: status.value === 'exited' ? settlement.value : '',
        from: status.value === 'exited' ? from.value || undefined : undefined,
        to: status.value === 'exited' ? to.value || undefined : undefined,
        search: search.value || undefined,
        page: page.value,
      }),
      visitorParkingApi.summary(),
    ])
    list.value = rows
    summary.value = counts.data
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    loading.value = false
  }
}

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch([status, vehicleType, settlement, from, to], () => {
  page.value = 1
  load()
})
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => ((page.value = 1), load()), 300)
})

function openStay(id: string) {
  stayId.value = id
  stayOpen.value = true
}
function onEntered() {
  status.value = 'inside'
  load()
}
function exitFromEntry(stay: ParkingStay) {
  entryOpen.value = false
  openStay(stay.id)
}

// Time and price of the vehicles inside keep running
let refresh: ReturnType<typeof setInterval> | undefined
onMounted(async () => {
  try {
    settings.value = (await visitorParkingApi.settings()).data
  } catch {
    // The summary also says whether it is enabled
  }
  await load()
  refresh = setInterval(() => {
    if (status.value === 'inside' && !entryOpen.value && !stayOpen.value) load()
  }, 60_000)
})
onBeforeUnmount(() => clearInterval(refresh))
</script>

<template>
  <PageHeader
    title="Parqueadero de visitantes"
    subtitle="Ingresos y salidas de vehículos de visitantes"
  >
    <template #actions>
      <UiButton
        v-if="tenant.canConfigureVisitorParking"
        variant="outline"
        :to="{ name: 'visitor-parking-settings' }"
      >
        <i class="mdi mdi-cog-outline mr-1" aria-hidden="true" />Configuración
      </UiButton>
      <UiButton v-if="summary?.enabled" color="primary" @click="entryOpen = true">
        <i class="mdi mdi-plus mr-1" aria-hidden="true" />Registrar ingreso
      </UiButton>
    </template>
  </PageHeader>

  <EmptyState
    v-if="summary && !summary.enabled"
    art="bienvenida"
    title="El parqueadero de visitantes no está activo"
    :description="
      tenant.canConfigureVisitorParking
        ? 'Define los cupos, las tarifas por hora, las horas de gracia y quién paga para empezar a registrar ingresos.'
        : 'La administración debe activarlo y definir cupos y tarifas antes de registrar ingresos.'
    "
  >
    <RouterLink
      v-if="tenant.canConfigureVisitorParking"
      :to="{ name: 'visitor-parking-settings' }"
      class="mt-4 inline-flex rounded-lg bg-mint-600 px-4 py-2 text-sm font-semibold text-white hover:bg-mint-700"
      >Configurar el parqueadero</RouterLink
    >
  </EmptyState>

  <template v-else>
    <!-- Spots -->
    <div class="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div
        v-for="row in capacity"
        :key="row.type"
        class="rounded-2xl bg-white p-4 ring-1 ring-brand-900/5 dark:bg-neutral-900 dark:ring-white/10"
      >
        <div class="flex items-center justify-between gap-2">
          <span
            class="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-300"
          >
            <i class="mdi text-xl" :class="VEHICLE_TYPE_ICONS[row.type]" aria-hidden="true" />
            {{ VEHICLE_TYPE_LABELS[row.type] }}
          </span>
          <span
            class="text-lg font-bold tabular-nums"
            :class="
              row.inside >= row.capacity
                ? 'text-coral-700 dark:text-coral-300'
                : 'text-brand-700 dark:text-white'
            "
            >{{ row.inside
            }}<span class="text-sm font-medium text-neutral-400">/{{ row.capacity }}</span></span
          >
        </div>
        <div
          class="mt-3 h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-white/10"
          role="progressbar"
          :aria-valuenow="row.inside"
          :aria-valuemax="row.capacity"
          :aria-label="`Cupos de ${VEHICLE_TYPE_LABELS[row.type]} ocupados`"
        >
          <div
            class="h-full rounded-full"
            :class="row.inside >= row.capacity ? 'bg-coral-500' : 'bg-mint-500'"
            :style="{
              width: `${row.capacity ? Math.min(100, (row.inside / row.capacity) * 100) : 100}%`,
            }"
          />
        </div>
        <p class="mt-1.5 text-xs text-neutral-500">
          {{
            row.capacity > row.inside
              ? `${row.capacity - row.inside} libres`
              : row.inside > row.capacity
                ? `${row.inside - row.capacity} sin cupo`
                : 'Lleno'
          }}
        </p>
      </div>
    </div>

    <dl
      v-if="summary"
      class="mb-6 grid grid-cols-2 gap-3 rounded-2xl bg-neutral-50 p-4 text-sm sm:grid-cols-4 dark:bg-white/5"
    >
      <div>
        <dt class="text-xs text-neutral-500">Adentro ahora</dt>
        <dd class="text-lg font-bold tabular-nums">{{ summary.inside }}</dd>
      </div>
      <div>
        <dt class="text-xs text-neutral-500">Excedidos</dt>
        <dd
          class="text-lg font-bold tabular-nums"
          :class="summary.overstays ? 'text-coral-700 dark:text-coral-300' : ''"
        >
          {{ summary.overstays }}
        </dd>
      </div>
      <div>
        <dt class="text-xs text-neutral-500">Hoy: ingresos / salidas</dt>
        <dd class="text-lg font-bold tabular-nums">
          {{ summary.today.entries }} / {{ summary.today.exits }}
        </dd>
      </div>
      <div>
        <dt class="text-xs text-neutral-500">Hoy: cobrado</dt>
        <dd class="text-lg font-bold tabular-nums">{{ formatMoney(summary.today.billed) }}</dd>
        <dd class="text-xs text-neutral-500">
          {{ formatMoney(summary.today.collectedAtGate) }} en portería
        </dd>
      </div>
    </dl>

    <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
      <UiTabs v-model="status" :tabs="tabs" aria-label="Vehículos" />
      <div class="flex w-full flex-wrap items-center gap-2 sm:w-auto">
        <UiSelect
          v-model="vehicleType"
          :options="typeOptions"
          placeholder="Todos los vehículos"
          size="sm"
          aria-label="Tipo de vehículo"
        />
        <UiInput
          v-model="search"
          type="search"
          placeholder="Placa, visitante o unidad"
          aria-label="Buscar"
          class="w-full sm:w-64"
        />
      </div>
    </div>
    <div v-if="status === 'exited'" class="mb-3 flex flex-wrap items-end gap-3">
      <UiSelect
        v-model="settlement"
        :options="settlementOptions"
        placeholder="Cualquier cobro"
        size="sm"
        aria-label="Cobro"
      />
      <label class="flex items-center gap-2 text-xs text-neutral-500"
        >Desde <UiInput v-model="from" type="date" size="sm"
      /></label>
      <label class="flex items-center gap-2 text-xs text-neutral-500"
        >Hasta <UiInput v-model="to" type="date" size="sm"
      /></label>
    </div>

    <UiTable
      :columns="status === 'inside' ? insideColumns : historyColumns"
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
      <template #number="row">
        <button
          type="button"
          class="font-medium tabular-nums hover:underline"
          @click="openStay(row.id)"
        >
          {{ row.number }}
        </button>
      </template>
      <template #vehicle="row">
        <button
          type="button"
          class="flex items-center gap-2 text-left hover:underline"
          @click="openStay(row.id)"
        >
          <i
            class="mdi text-xl text-neutral-500"
            :class="VEHICLE_TYPE_ICONS[row.vehicleType as VehicleType]"
            :aria-label="VEHICLE_TYPE_LABELS[row.vehicleType as VehicleType]"
            role="img"
          />
          <span>
            <span class="block font-mono font-semibold">{{
              row.plate ?? row.vehicleDescription
            }}</span>
            <span
              v-if="row.plate && row.vehicleDescription"
              class="block text-xs text-neutral-500"
              >{{ row.vehicleDescription }}</span
            >
          </span>
        </button>
        <span class="mt-0.5 flex gap-1">
          <UiBadge v-if="row.isOverstay" label="Excedido" color="danger" size="xs" />
          <UiBadge v-if="row.overCapacity" label="Sin cupo" color="warning" size="xs" />
        </span>
      </template>
      <template #unit="{ unit }">
        <span class="whitespace-nowrap">{{ unitLabel(unit) }}</span>
      </template>
      <template #visitor="row">
        <span class="block">{{ row.visitorName }}</span>
        <span class="block text-xs text-neutral-500">{{
          PARKING_AUTHORIZATION_LABELS[row.authorization as ParkingStay['authorization']]
        }}</span>
      </template>
      <template #enteredAt="row">
        <span class="block whitespace-nowrap">{{ formatDateTime(row.enteredAt) }}</span>
        <span class="block text-xs text-neutral-500">{{ elapsed(row) }}</span>
      </template>
      <template #times="row">
        <span class="block whitespace-nowrap">{{ formatDateTime(row.enteredAt) }}</span>
        <span class="block text-xs whitespace-nowrap text-neutral-500"
          >{{ formatDateTime(row.exitedAt) }} · {{ elapsed(row) }}</span
        >
      </template>
      <template #amount="row">
        <span class="font-medium tabular-nums">{{ formatMoney(row.quote.total) }}</span>
      </template>
      <template #settlement="row">
        <UiBadge
          v-if="row.settlement"
          :label="PARKING_SETTLEMENT_LABELS[row.settlement as ParkingSettlement]"
          :color="settlementColor(row.settlement)"
          variant="soft"
          size="sm"
        />
      </template>
      <template #actions="row">
        <UiButton size="sm" color="primary" variant="outline" @click="openStay(row.id)"
          >Dar salida</UiButton
        >
      </template>
      <template #empty>
        <EmptyState
          art="sin-resultados"
          :title="
            search
              ? 'Ningún vehículo coincide'
              : status === 'inside'
                ? 'No hay vehículos de visitantes adentro'
                : 'Todavía no hay salidas registradas'
          "
          :description="
            status === 'inside' && !search
              ? 'Registra el ingreso cuando llegue un visitante.'
              : undefined
          "
        />
      </template>
    </UiTable>
  </template>

  <ParkingEntryModal
    v-model="entryOpen"
    :summary="summary"
    @saved="onEntered"
    @exit="exitFromEntry"
  />
  <ParkingStayModal
    v-model="stayOpen"
    :stay-id="stayId"
    :payment-mode="settings?.paymentMode ?? 'gate'"
    @changed="load"
  />
</template>
