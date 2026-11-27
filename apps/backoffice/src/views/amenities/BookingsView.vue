<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  UiBadge,
  UiButton,
  UiSelect,
  UiTable,
  UiTabs,
  useToast,
  type TableColumn,
} from '@aptoph/ui'
import {
  BOOKING_STATUS_LABELS,
  DEPOSIT_STATUS_LABELS,
  type Amenity,
  type Booking,
} from '@aptoph/shared'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import StatTile from '@/components/finance/StatTile.vue'
import BookingCalendar from '@/components/amenities/BookingCalendar.vue'
import BookingDetailModal from '@/components/amenities/BookingDetailModal.vue'
import BookingFormModal from '@/components/amenities/BookingFormModal.vue'
import { amenitiesApi, bookingsApi, type BookingListStatus } from '@/api/amenities'
import { errorMessage } from '@/lib/errors'
import { formatMoney, todayInput } from '@/lib/format'
import { STATUS_COLORS, bookedFor, formatRange } from '@/lib/amenities'
import { useTenantStore } from '@/stores/tenant'

const tenant = useTenantStore()
const route = useRoute()
const router = useRouter()
const toast = useToast()
const manage = computed(() => tenant.canManageAmenities)

const amenities = ref<Amenity[]>([])
const loaded = ref(false)
const stats = ref({ pending: 0, deposits: 0, today: 0 })
const tab = ref(String(route.query.tab ?? 'calendar'))
const amenityId = ref('')

const tabs = computed(() => [
  { label: 'Calendario', value: 'calendar', icon: 'mdi-calendar-month-outline' },
  { label: 'Por aprobar', value: 'pending', badge: stats.value.pending || undefined },
  { label: 'Depósitos', value: 'deposit', badge: stats.value.deposits || undefined },
  { label: 'Historial', value: 'history' },
])

/* ---------- Calendar ---------- */
const today = todayInput()
const view = ref<'week' | 'month'>('week')
const anchor = ref(today)
const calendar = ref<Booking[]>([])
const loadingCalendar = ref(false)

const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
const mondayOf = (date: string) =>
  addDays(date, -((new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7))
const start = computed(() =>
  view.value === 'week' ? mondayOf(anchor.value) : mondayOf(`${anchor.value.slice(0, 7)}-01`),
)
const end = computed(() => addDays(start.value, view.value === 'week' ? 6 : 41))
const title = computed(() => {
  const fmt = (date: string, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('es-CO', { timeZone: 'UTC', ...options }).format(
      new Date(`${date}T12:00:00Z`),
    )
  if (view.value === 'month')
    return fmt(`${anchor.value.slice(0, 7)}-01`, { month: 'long', year: 'numeric' })
  return `${fmt(start.value, { day: 'numeric', month: 'short' })} – ${fmt(end.value, { day: 'numeric', month: 'short', year: 'numeric' })}`
})
function move(step: number) {
  if (view.value === 'week') anchor.value = addDays(anchor.value, step * 7)
  else {
    const d = new Date(`${anchor.value.slice(0, 7)}-15T12:00:00Z`)
    d.setUTCMonth(d.getUTCMonth() + step)
    anchor.value = d.toISOString().slice(0, 10)
  }
}
const showCancelled = ref(false)
const shown = computed(() =>
  calendar.value.filter(
    (b) => showCancelled.value || b.status === 'pending' || b.status === 'approved',
  ),
)

async function loadCalendar() {
  loadingCalendar.value = true
  try {
    calendar.value = (await bookingsApi.calendar(start.value, end.value, amenityId.value)).data
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    loadingCalendar.value = false
  }
}
watch([start, end, amenityId], () => tab.value === 'calendar' && loadCalendar())

/* ---------- Lists ---------- */
const rows = ref<Booking[]>([])
const page = ref(1)
const total = ref(0)
const loadingList = ref(false)
const columns = computed<TableColumn[]>(() => [
  { name: 'number', label: '#' },
  { name: 'amenity', label: 'Zona' },
  { name: 'when', label: 'Cuándo' },
  { name: 'for', label: 'Para' },
  { name: 'money', label: tab.value === 'deposit' ? 'Depósito' : 'Valor', classes: 'text-right' },
  { name: 'status', label: 'Estado' },
])
async function loadList() {
  loadingList.value = true
  try {
    const status: BookingListStatus | undefined =
      tab.value === 'pending' ? 'pending' : tab.value === 'deposit' ? 'deposit' : undefined
    const result = await bookingsApi.list({ status, amenityId: amenityId.value, page: page.value })
    rows.value = result.data
    total.value = result.metadata.total
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    loadingList.value = false
  }
}
watch([tab, amenityId], () => {
  page.value = 1
  router.replace({
    query: { ...route.query, tab: tab.value === 'calendar' ? undefined : tab.value },
  })
  if (tab.value === 'calendar') loadCalendar()
  else loadList()
})

async function loadStats() {
  stats.value = (await bookingsApi.stats().catch(() => ({ data: stats.value }))).data
}

/* ---------- Detail and new booking ---------- */
const selected = computed(() => (route.query.reserva ? String(route.query.reserva) : null))
const select = (booking: Booking) => router.push({ query: { ...route.query, reserva: booking.id } })
function closeDetail() {
  const query = { ...route.query }
  delete query.reserva
  router.replace({ query })
}
function changed() {
  loadStats()
  if (tab.value === 'calendar') loadCalendar()
  else loadList()
}

const formOpen = ref(false)
const initial = ref<{ amenityId?: string; date?: string; hour?: number } | null>(null)
function create(date?: string, hour?: number) {
  if (!manage.value) return
  if (date && date < today) return
  initial.value = { amenityId: amenityId.value || undefined, date, hour }
  formOpen.value = true
}

onMounted(async () => {
  try {
    amenities.value = (await amenitiesApi.list()).data
  } catch (e) {
    toast.error(errorMessage(e))
  }
  loaded.value = true
  loadStats()
  if (tab.value === 'calendar') loadCalendar()
  else loadList()
})

const amenityOptions = computed(() => [
  { id: '', name: 'Todas las zonas' },
  ...amenities.value.filter((a) => a.isActive),
])
</script>

<template>
  <PageHeader title="Zonas comunes" subtitle="Calendario de reservas, aprobaciones y depósitos">
    <template #actions>
      <UiButton
        v-if="manage"
        variant="outline"
        icon="mdi-cog-outline"
        :to="{ name: 'amenities-settings' }"
      >
        Configurar zonas
      </UiButton>
      <UiButton v-if="manage && amenities.length" color="primary" icon="mdi-plus" @click="create()">
        Nueva reserva
      </UiButton>
    </template>
  </PageHeader>

  <EmptyState
    v-if="loaded && !amenities.length && manage"
    art="bienvenida"
    title="Configura tus zonas comunes"
    description="Crea el salón social, la BBQ, el gimnasio… con su horario, tarifa y reglas para que los residentes reserven desde el portal."
  >
    <UiButton color="primary" icon="mdi-plus" :to="{ name: 'amenities-settings' }">
      Crear zonas comunes
    </UiButton>
  </EmptyState>

  <template v-else>
    <div class="mb-6 grid gap-3 sm:grid-cols-3">
      <StatTile
        label="Por aprobar"
        :value="String(stats.pending)"
        icon="mdi mdi-clock-outline"
        tone="amber"
        hint="Solicitudes del portal"
      />
      <StatTile
        label="Hoy"
        :value="String(stats.today)"
        icon="mdi mdi-calendar-today"
        tone="brand"
        hint="Reservas confirmadas"
      />
      <StatTile
        label="Depósitos por devolver"
        :value="String(stats.deposits)"
        icon="mdi mdi-cash-lock"
        tone="mint"
        hint="De eventos ya realizados o próximos"
      />
    </div>

    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <UiTabs v-model="tab" :tabs="tabs" variant="pills" size="sm" aria-label="Vista" />
      <UiSelect
        v-model="amenityId"
        :options="amenityOptions"
        item-label="name"
        item-value="id"
        size="sm"
        aria-label="Zona común"
      />
    </div>

    <!-- Calendar -->
    <section v-if="tab === 'calendar'" aria-label="Calendario">
      <div class="mb-3 flex flex-wrap items-center gap-2">
        <UiButton
          size="sm"
          variant="outline"
          icon="mdi-chevron-left"
          aria-label="Anterior"
          @click="move(-1)"
        />
        <UiButton size="sm" variant="outline" @click="anchor = today">Hoy</UiButton>
        <UiButton
          size="sm"
          variant="outline"
          icon="mdi-chevron-right"
          aria-label="Siguiente"
          @click="move(1)"
        />
        <h2 class="ml-1 text-base font-semibold first-letter:uppercase">{{ title }}</h2>
        <span
          v-if="loadingCalendar"
          class="mdi mdi-loading mdi-spin text-neutral-400"
          aria-hidden="true"
        />
        <div class="ml-auto flex items-center gap-3">
          <label class="flex items-center gap-1.5 text-xs text-neutral-500">
            <input v-model="showCancelled" type="checkbox" class="rounded" />
            Rechazadas y canceladas
          </label>
          <UiTabs
            v-model="view"
            :tabs="[
              { label: 'Semana', value: 'week' },
              { label: 'Mes', value: 'month' },
            ]"
            variant="boxed"
            size="sm"
            aria-label="Periodo"
          />
        </div>
      </div>
      <BookingCalendar
        :bookings="shown"
        :view="view"
        :start="start"
        :today="today"
        @select="select"
        @create="create"
      />
      <ul class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
        <li
          v-for="amenity in amenities.filter((a) => a.isActive)"
          :key="amenity.id"
          class="flex items-center gap-1.5"
        >
          <span
            class="size-2.5 rounded-full"
            :style="{ background: amenity.color ?? '#64748b' }"
            aria-hidden="true"
          />
          {{ amenity.name }}
        </li>
        <li class="flex items-center gap-1.5">
          <i class="mdi mdi-clock-outline" aria-hidden="true" /> Por aprobar (borde punteado)
        </li>
        <li class="flex items-center gap-1.5">
          <i class="mdi mdi-wrench-outline" aria-hidden="true" /> Bloqueo
        </li>
        <li>Rayado bajo la reserva: tiempo de aseo</li>
      </ul>
    </section>

    <!-- Lists -->
    <UiTable
      v-else
      :columns="columns"
      :rows="rows"
      :loading="loadingList"
      :pagination="{ page, perPage: 20, total }"
      @paginate="(p) => ((page = p), loadList())"
    >
      <template #number="row">
        <button
          type="button"
          class="font-medium text-brand-700 hover:underline dark:text-brand-200"
          @click="select(row)"
        >
          #{{ row.number }}
        </button>
      </template>
      <template #amenity="row">
        <span class="flex items-center gap-2">
          <span
            class="size-2.5 rounded-full"
            :style="{ background: row.amenity.color ?? '#64748b' }"
            aria-hidden="true"
          />
          {{ row.amenity.name }}
        </span>
      </template>
      <template #when="row">{{ formatRange(row) }}</template>
      <template #for="row">{{ bookedFor(row) }}</template>
      <template #money="row">
        <template v-if="tab === 'deposit'">{{ formatMoney(row.depositAmount) }}</template>
        <template v-else>{{
          row.bookingType === 'block' ? '—' : formatMoney(row.feeAmount)
        }}</template>
      </template>
      <template #status="row">
        <div class="flex flex-wrap gap-1">
          <UiBadge
            :label="BOOKING_STATUS_LABELS[row.status as Booking['status']]"
            :color="STATUS_COLORS[row.status as Booking['status']]"
            variant="soft"
            size="sm"
          />
          <UiBadge
            v-if="row.status === 'pending' && row.attachmentCount"
            label="Con soporte"
            icon="mdi-paperclip"
            size="sm"
            variant="outline"
          />
          <UiBadge
            v-if="tab === 'deposit' && row.depositStatus"
            :label="
              DEPOSIT_STATUS_LABELS[row.depositStatus as NonNullable<Booking['depositStatus']>]
            "
            size="sm"
          />
        </div>
      </template>
      <template #empty>
        <EmptyState
          :art="tab === 'pending' ? 'al-dia' : 'sin-resultados'"
          :title="
            tab === 'pending'
              ? 'No hay reservas por aprobar'
              : tab === 'deposit'
                ? 'No hay depósitos por devolver'
                : 'Sin reservas'
          "
        />
      </template>
    </UiTable>
  </template>

  <BookingDetailModal
    :booking-id="selected"
    :manage="manage"
    @close="closeDetail"
    @changed="changed"
  />
  <BookingFormModal v-model="formOpen" :amenities="amenities" :initial="initial" @saved="changed" />
</template>
