<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { UiAlert, UiBadge, UiButton, UiSkeleton, UiTabs } from '@aptoph/ui'
import {
  PARCEL_STATUS_LABELS,
  VISIT_TYPE_LABELS,
  type ResidentParcel,
  type ResidentVisit,
  type VisitStatus,
} from '@aptoph/shared'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import VisitFormModal from '@/components/VisitFormModal.vue'
import { residentApi } from '@/api/resident'
import { useSubmit } from '@/composables/useSubmit'
import { errorMessage } from '@/lib/errors'
import { formatDateTime, formatRelative, unitName } from '@/lib/format'
import { useUnitsStore } from '@/stores/units'

const route = useRoute()
const router = useRouter()
const units = useUnitsStore()

const visits = ref<ResidentVisit[] | null>(null)
const parcels = ref<ResidentParcel[] | null>(null)
const error = ref<string | null>(null)
const tab = ref(route.query.tab === 'paquetes' ? 'parcels' : 'visits')
const formOpen = ref(false)

const STATUS: Record<
  VisitStatus,
  { label: string; color: 'primary' | 'success' | 'neutral' | 'warning' }
> = {
  expected: { label: 'Autorizada', color: 'primary' },
  inside: { label: 'En el conjunto', color: 'success' },
  completed: { label: 'Finalizada', color: 'neutral' },
  expired: { label: 'No llegó', color: 'warning' },
}

const upcoming = computed(() =>
  (visits.value ?? []).filter((v) => v.status === 'expected' || v.status === 'inside'),
)
const history = computed(() =>
  (visits.value ?? []).filter((v) => v.status === 'completed' || v.status === 'expired'),
)
const pendingParcels = computed(
  () => (parcels.value ?? []).filter((p) => p.status === 'pending').length,
)
const showUnit = computed(() => (units.home?.units.length ?? 0) > 1)

const tabs = computed(() => [
  { label: 'Visitas', value: 'visits', icon: 'mdi mdi-account-clock-outline' },
  {
    label: 'Paquetes',
    value: 'parcels',
    icon: 'mdi mdi-package-variant-closed',
    badge: pendingParcels.value || undefined,
  },
])

async function load() {
  error.value = null
  try {
    const [v, p] = await Promise.all([
      residentApi.visits.list(),
      residentApi.parcels(),
      units.load(),
    ])
    visits.value = v.data
    parcels.value = p.data
  } catch (e) {
    error.value = errorMessage(e, 'No pudimos cargar la información de portería')
  }
}

function changeTab(value: string) {
  tab.value = value
  router.replace({ query: value === 'parcels' ? { tab: 'paquetes' } : {} })
}

const cancelling = ref<ResidentVisit | null>(null)
const cancelOpen = ref(false)
const { saving: cancelBusy, run } = useSubmit()
function askCancel(visit: ResidentVisit) {
  cancelling.value = visit
  cancelOpen.value = true
}
async function confirmCancel() {
  const visit = cancelling.value
  if (visit && (await run(() => residentApi.visits.cancel(visit.id), 'Visita cancelada'))) {
    cancelOpen.value = false
    await load()
  }
}

onMounted(() => {
  load()
  if (route.query.nueva) formOpen.value = true
})
</script>

<template>
  <PageHeader
    title="Portería"
    subtitle="Autoriza visitantes y consulta los paquetes que llegan a tu nombre"
    art="porteria"
  >
    <template #actions>
      <UiButton color="primary" @click="formOpen = true">
        <span class="mr-1" aria-hidden="true"><i class="mdi mdi-account-plus-outline" /></span
        >Autorizar visita
      </UiButton>
    </template>
  </PageHeader>

  <UiTabs
    :model-value="tab"
    :tabs="tabs"
    aria-label="Portería"
    class="mb-6"
    @update:model-value="changeTab"
  />

  <div v-if="error" class="flex flex-col items-start gap-4">
    <UiAlert color="danger" variant="soft" class="w-full">{{ error }}</UiAlert>
    <UiButton variant="outline" @click="load">Reintentar</UiButton>
  </div>

  <div v-else-if="!visits || !parcels" class="flex flex-col gap-3" aria-busy="true">
    <UiSkeleton v-for="n in 3" :key="n" height="5rem" variant="rounded" />
  </div>

  <!-- Visitas -->
  <template v-else-if="tab === 'visits'">
    <section aria-labelledby="upcoming-title" class="mb-8">
      <h2 id="upcoming-title" class="mb-3 text-lg font-semibold">Próximas y en curso</h2>
      <EmptyState
        v-if="upcoming.length === 0"
        class="rounded-2xl border border-neutral-100 bg-white dark:border-white/10 dark:bg-neutral-900"
        title="No tienes visitas autorizadas"
        description="Autoriza una para agilizar su ingreso en portería."
      />
      <ul v-else class="grid gap-3 md:grid-cols-2">
        <li
          v-for="visit in upcoming"
          :key="visit.id"
          class="flex flex-col gap-3 rounded-2xl border border-neutral-100 bg-white p-4 dark:border-white/10 dark:bg-neutral-900"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="font-medium">{{ visit.visitorName }}</p>
              <p class="text-sm text-neutral-500 dark:text-neutral-300">
                {{ VISIT_TYPE_LABELS[visit.type] }}
                <template v-if="visit.vehiclePlate"> · {{ visit.vehiclePlate }}</template>
                <template v-if="showUnit"> · {{ unitName(visit.unit) }}</template>
                <template v-if="visit.fromGate"> · Anunciada en portería</template>
              </p>
            </div>
            <UiBadge
              :label="STATUS[visit.status].label"
              :color="STATUS[visit.status].color"
              variant="soft"
              size="sm"
            />
          </div>
          <div class="flex items-end justify-between gap-3">
            <div>
              <p class="text-xs text-neutral-500 dark:text-neutral-300">
                {{ visit.status === 'inside' ? 'Ingresó' : 'Llega' }}
              </p>
              <p class="text-sm font-medium">
                {{
                  formatDateTime(
                    (visit.status === 'inside' ? visit.checkedInAt : visit.expectedAt)!,
                  )
                }}
              </p>
            </div>
            <div v-if="visit.accessCode" class="text-right">
              <p class="text-xs text-neutral-500 dark:text-neutral-300">Código de acceso</p>
              <p
                class="font-mono text-xl font-semibold tracking-[0.2em] text-mint-700 dark:text-mint-300"
              >
                {{ visit.accessCode }}
              </p>
            </div>
          </div>
          <UiButton
            v-if="visit.canCancel"
            size="sm"
            variant="ghost"
            color="danger"
            class="self-start"
            @click="askCancel(visit)"
          >
            Cancelar autorización
          </UiButton>
        </li>
      </ul>
    </section>

    <section v-if="history.length" aria-labelledby="history-title">
      <h2 id="history-title" class="mb-3 text-lg font-semibold">Último mes</h2>
      <ul
        class="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-100 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-neutral-900"
      >
        <li
          v-for="visit in history"
          :key="visit.id"
          class="flex items-center justify-between gap-3 p-4"
        >
          <div class="min-w-0">
            <p class="truncate font-medium">{{ visit.visitorName }}</p>
            <p class="text-sm text-neutral-500 dark:text-neutral-300">
              {{ VISIT_TYPE_LABELS[visit.type]
              }}<template v-if="visit.vehiclePlate"> · {{ visit.vehiclePlate }}</template
              ><template v-if="visit.fromGate"> · anunciada en portería</template> ·
              {{ formatDateTime((visit.checkedInAt ?? visit.expectedAt)!) }}
            </p>
          </div>
          <UiBadge
            :label="STATUS[visit.status].label"
            :color="STATUS[visit.status].color"
            variant="soft"
            size="sm"
          />
        </li>
      </ul>
    </section>
  </template>

  <!-- Paquetes -->
  <template v-else>
    <EmptyState
      v-if="parcels.length === 0"
      class="rounded-2xl border border-neutral-100 bg-white dark:border-white/10 dark:bg-neutral-900"
      title="No tienes paquetes"
      description="No hay paquetes registrados a tu nombre en el último mes."
    />
    <ul
      v-else
      class="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-100 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-neutral-900"
    >
      <li v-for="parcel in parcels" :key="parcel.id" class="flex items-center gap-3 p-4">
        <span
          class="grid size-10 shrink-0 place-items-center rounded-xl text-xl"
          :class="
            parcel.status === 'pending'
              ? 'bg-mint-50 text-mint-700 dark:bg-mint-500/15 dark:text-mint-300'
              : 'bg-neutral-50 text-neutral-400 dark:bg-white/5'
          "
          aria-hidden="true"
        >
          <i class="mdi mdi-package-variant-closed" />
        </span>
        <div class="min-w-0 flex-1">
          <p class="font-medium">
            {{ [parcel.carrier, parcel.description].filter(Boolean).join(' · ') || 'Paquete' }}
          </p>
          <p class="text-sm text-neutral-500 dark:text-neutral-300">
            Llegó {{ formatRelative(parcel.receivedAt) }}
            <template v-if="parcel.deliveredAt">
              · entregado a {{ parcel.deliveredToName ?? 'un residente' }}</template
            >
            <template v-if="showUnit"> · {{ unitName(parcel.unit) }}</template>
          </p>
        </div>
        <UiBadge
          :label="PARCEL_STATUS_LABELS[parcel.status]"
          :color="parcel.status === 'pending' ? 'primary' : 'neutral'"
          variant="soft"
          size="sm"
        />
      </li>
    </ul>
  </template>

  <VisitFormModal v-model="formOpen" @saved="load" />
  <ConfirmDialog
    v-model="cancelOpen"
    title="Cancelar visita"
    :message="`¿Cancelar la autorización de ${cancelling?.visitorName}? Su código dejará de funcionar.`"
    confirm-label="Cancelar visita"
    :loading="cancelBusy"
    @confirm="confirmCancel"
  />
</template>
