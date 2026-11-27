<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { UiAlert, UiBadge, UiButton, UiSkeleton } from '@aptoph/ui'
import {
  PARKING_APPLICATION_STATUS_LABELS,
  PARKING_DRAW_METHOD,
  VEHICLE_TYPE_LABELS,
  type ParkingApplication,
  type ParkingApplicationStatus,
  type ParkingUnitRef,
  type ResidentParkingOverview,
  type VehicleType,
} from '@aptoph/shared'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import { residentApi } from '@/api/resident'
import { useSubmit } from '@/composables/useSubmit'
import { errorMessage } from '@/lib/errors'
import { formatDate, formatDateTime } from '@/lib/format'

const overview = ref<ResidentParkingOverview | null>(null)
const loadError = ref<string | null>(null)
const { saving, error, run } = useSubmit()
const busyKey = ref<string | null>(null)
const confirming = ref<{ application: ParkingApplication; action: 'withdraw' | 'decline' } | null>(
  null,
)
const confirmOpen = ref(false)

const lottery = computed(() => overview.value?.lottery ?? null)
const accepting = computed(
  () =>
    !!lottery.value &&
    (lottery.value.status === 'drawn' ||
      (lottery.value.status === 'open' && new Date(lottery.value.closesAt).getTime() > Date.now())),
)
const unitLabel = (unit: ParkingUnitRef) =>
  [unit.building?.name, unit.code].filter(Boolean).join(' · ')
const typeLabel = (type: VehicleType) => VEHICLE_TYPE_LABELS[type].toLowerCase()

const STATUS_COLOR: Record<
  ParkingApplicationStatus,
  'primary' | 'success' | 'neutral' | 'warning' | 'danger'
> = {
  pending: 'primary',
  ineligible: 'danger',
  won: 'success',
  waiting: 'warning',
  offered: 'primary',
  accepted: 'success',
  declined: 'neutral',
  expired: 'neutral',
  withdrawn: 'neutral',
}

/** What each unit can still apply for */
const options = computed(() =>
  (overview.value?.units ?? []).map((row) => ({
    ...row,
    eligibility: row.eligibility.map((item) => ({
      ...item,
      applied: (overview.value?.applications ?? []).some(
        (a) =>
          a.unit.id === row.unit.id &&
          a.vehicleType === item.vehicleType &&
          a.status !== 'withdrawn',
      ),
    })),
  })),
)

const requirementsText = computed(() => {
  const req = overview.value?.requirements
  if (!req) return []
  return [
    req.noDebt &&
      (req.debtToleranceDays
        ? `Estar a paz y salvo (se toleran ${req.debtToleranceDays} días de mora)`
        : 'Estar a paz y salvo con la administración'),
    req.vehicle && 'Tener registrado un vehículo del tipo del cupo',
    req.documents && 'SOAT y tecnomecánica vigentes',
    req.priorityWithoutPrivate && 'Las unidades sin parqueadero propio sortean primero',
  ].filter(Boolean) as string[]
})

async function load() {
  loadError.value = null
  try {
    overview.value = (await residentApi.parking.overview()).data
  } catch (e) {
    loadError.value = errorMessage(e)
  }
}

async function apply(unitId: string, vehicleType: VehicleType) {
  busyKey.value = `${unitId}:${vehicleType}`
  const ok = await run(
    () => residentApi.parking.apply({ unitId, vehicleType }),
    lottery.value?.status === 'drawn' ? 'Quedaste en la lista de espera' : 'Postulación registrada',
  )
  busyKey.value = null
  if (ok) await load()
}

async function accept(application: ParkingApplication) {
  busyKey.value = application.id
  const ok = await run(
    () => residentApi.parking.respond(application.id, 'accept'),
    `Aceptaste el parqueadero ${application.spot?.code ?? ''}`,
  )
  busyKey.value = null
  if (ok) await load()
}

function ask(application: ParkingApplication, action: 'withdraw' | 'decline') {
  confirming.value = { application, action }
  confirmOpen.value = true
}

async function confirm() {
  if (!confirming.value) return
  const { application, action } = confirming.value
  const ok = await run(
    () => residentApi.parking.respond(application.id, action),
    action === 'decline' ? 'Rechazaste el cupo' : 'Retiraste la postulación',
  )
  confirmOpen.value = false
  if (ok) await load()
}

onMounted(load)
</script>

<template>
  <PageHeader
    title="Parqueaderos"
    subtitle="Postúlate al sorteo de los cupos comunales y consulta el resultado"
  />

  <UiAlert v-if="loadError" color="danger" variant="soft" class="mb-6">{{ loadError }}</UiAlert>
  <UiAlert v-if="error" color="danger" variant="soft" class="mb-6">{{ error }}</UiAlert>

  <div v-if="!overview && !loadError" class="space-y-4">
    <UiSkeleton class="h-32 rounded-2xl" />
    <UiSkeleton class="h-24 rounded-2xl" />
  </div>

  <EmptyState
    v-else-if="overview && !lottery"
    art="sin-resultados"
    title="No hay un sorteo abierto"
    description="Cuando la administración abra el sorteo de parqueaderos comunales podrás postularte aquí."
  />

  <div v-else-if="overview && lottery" class="space-y-8">
    <!-- Sorteo -->
    <section
      class="rounded-2xl border border-neutral-100 bg-white p-5 dark:border-white/10 dark:bg-neutral-900"
      aria-labelledby="lottery-title"
    >
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="lottery-title" class="text-lg font-semibold">{{ lottery.title }}</h2>
          <p class="text-sm text-neutral-500 dark:text-neutral-300">
            Periodo del {{ formatDate(lottery.periodStartsOn) }} al
            {{ formatDate(lottery.periodEndsOn) }} ·
            {{ lottery.spots.map((s) => `${s.count} cupos de ${typeLabel(s.type)}`).join(' · ') }}
          </p>
        </div>
        <UiBadge
          :label="
            lottery.status === 'open'
              ? accepting
                ? 'Postulaciones abiertas'
                : 'Esperando el sorteo'
              : 'Sorteado'
          "
          :color="lottery.status === 'open' ? 'primary' : 'success'"
          variant="soft"
        />
      </div>
      <p v-if="lottery.status === 'open'" class="mt-3 text-sm">
        {{ accepting ? 'Puedes postularte hasta el' : 'Las postulaciones cerraron el' }}
        <span class="font-medium">{{ formatDateTime(lottery.closesAt) }}</span
        >.
      </p>
      <p v-else class="mt-3 text-sm text-neutral-600 dark:text-neutral-300">
        Si te postulas ahora quedas al final de la lista de espera. Cuando se libere un cupo te lo
        ofreceremos y tendrás {{ overview.offerDays }} días para aceptarlo.
      </p>
      <p v-if="lottery.notes" class="mt-3 whitespace-pre-line text-sm">{{ lottery.notes }}</p>
      <div v-if="requirementsText.length" class="mt-4">
        <p class="text-sm font-medium">Requisitos</p>
        <ul class="mt-1 list-disc space-y-0.5 pl-5 text-sm text-neutral-600 dark:text-neutral-300">
          <li v-for="text in requirementsText" :key="text">{{ text }}</li>
        </ul>
      </div>
    </section>

    <!-- Mis postulaciones -->
    <section v-if="overview.applications.length" aria-labelledby="mine-title">
      <h2 id="mine-title" class="mb-3 text-lg font-semibold">Tus postulaciones</h2>
      <ul class="space-y-3">
        <li
          v-for="application in overview.applications"
          :key="application.id"
          class="rounded-2xl border border-neutral-100 bg-white p-4 dark:border-white/10 dark:bg-neutral-900"
          :class="application.status === 'offered' ? 'ring-2 ring-brand-500' : ''"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <p class="font-medium">
              {{ unitLabel(application.unit) }} · cupo de {{ typeLabel(application.vehicleType) }}
            </p>
            <UiBadge
              :label="PARKING_APPLICATION_STATUS_LABELS[application.status]"
              :color="STATUS_COLOR[application.status]"
              variant="soft"
              size="sm"
            />
          </div>
          <p class="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
            <template v-if="application.status === 'won' || application.status === 'accepted'">
              Tienes el parqueadero
              <span class="font-mono font-semibold">{{ application.spot?.code }}</span>
              <template v-if="application.spot?.location">
                ({{ application.spot.location }})</template
              >
              hasta el {{ formatDate(lottery.periodEndsOn) }}.
            </template>
            <template v-else-if="application.status === 'waiting'">
              Vas en el puesto {{ application.queuePosition }} de la lista de espera.
            </template>
            <template v-else-if="application.status === 'offered'">
              Se liberó el parqueadero
              <span class="font-mono font-semibold">{{ application.spot?.code }}</span
              ><template v-if="application.spot?.location">
                ({{ application.spot.location }})</template
              >. Respóndenos antes del
              <span class="font-medium">{{ formatDateTime(application.offerExpiresAt!) }}</span
              >; si no, pasa al siguiente.
            </template>
            <template v-else-if="application.status === 'pending'">
              Participas en el sorteo. Te avisaremos el resultado por correo.
            </template>
            <template v-else-if="application.status === 'ineligible'">
              {{ application.ineligibleReason }}
            </template>
          </p>
          <p
            v-if="application.drawHash && lottery.seed"
            class="mt-2 break-all font-mono text-xs text-neutral-400"
            :title="PARKING_DRAW_METHOD"
          >
            Código en el sorteo: {{ application.drawHash }}
          </p>
          <div
            v-if="['pending', 'waiting', 'offered'].includes(application.status)"
            class="mt-3 flex flex-wrap justify-end gap-2"
          >
            <template v-if="application.status === 'offered'">
              <UiButton
                variant="ghost"
                color="danger"
                :disabled="saving"
                @click="ask(application, 'decline')"
                >No lo quiero</UiButton
              >
              <UiButton
                color="primary"
                :loading="saving && busyKey === application.id"
                @click="accept(application)"
                >Aceptar parqueadero</UiButton
              >
            </template>
            <UiButton
              v-else
              size="sm"
              variant="ghost"
              color="danger"
              :disabled="saving"
              @click="ask(application, 'withdraw')"
              >Retirar postulación</UiButton
            >
          </div>
        </li>
      </ul>
    </section>

    <!-- Postularse -->
    <section v-if="accepting && options.length" aria-labelledby="apply-title">
      <h2 id="apply-title" class="mb-3 text-lg font-semibold">Postular una unidad</h2>
      <ul class="space-y-3">
        <li
          v-for="row in options"
          :key="row.unit.id"
          class="rounded-2xl border border-neutral-100 bg-white p-4 dark:border-white/10 dark:bg-neutral-900"
        >
          <p class="font-medium">{{ unitLabel(row.unit) }}</p>
          <p v-if="row.vehicles.length" class="text-sm text-neutral-500 dark:text-neutral-300">
            Vehículos: {{ row.vehicles.map((v) => v.plate).join(', ') }}
          </p>
          <ul class="mt-3 space-y-2">
            <li
              v-for="item in row.eligibility"
              :key="item.vehicleType"
              class="flex flex-wrap items-center justify-between gap-2"
            >
              <div class="min-w-0">
                <p class="text-sm">Cupo de {{ typeLabel(item.vehicleType) }}</p>
                <p
                  v-for="message in item.applied ? [] : item.errors"
                  :key="message"
                  class="text-xs text-red-600 dark:text-red-300"
                >
                  {{ message }}
                </p>
              </div>
              <span v-if="item.applied" class="text-sm text-neutral-500">Ya te postulaste</span>
              <UiButton
                v-else
                size="sm"
                color="primary"
                :disabled="item.errors.length > 0 || saving"
                :loading="saving && busyKey === `${row.unit.id}:${item.vehicleType}`"
                @click="apply(row.unit.id, item.vehicleType)"
                >Postularme</UiButton
              >
            </li>
          </ul>
          <RouterLink
            v-if="row.eligibility.some((i) => !i.applied && i.errors.length)"
            :to="{ name: 'unit', params: { id: row.unit.id } }"
            class="mt-2 inline-block text-sm font-medium text-brand-700 hover:underline dark:text-brand-200"
            >Registrar o actualizar vehículos</RouterLink
          >
        </li>
      </ul>
    </section>

    <p v-if="lottery.seed" class="text-xs text-neutral-500 dark:text-neutral-400">
      Sorteo verificable: {{ PARKING_DRAW_METHOD }}. Semilla publicada:
      <span class="break-all font-mono">{{ lottery.seed }}</span>
    </p>
  </div>

  <ConfirmDialog
    v-model="confirmOpen"
    :title="confirming?.action === 'decline' ? 'Rechazar el cupo' : 'Retirar la postulación'"
    :message="
      confirming?.action === 'decline'
        ? 'El parqueadero pasa al siguiente de la lista de espera y sales de ella.'
        : 'Ya no participarás. Puedes volver a postularte mientras las postulaciones sigan abiertas.'
    "
    :confirm-label="confirming?.action === 'decline' ? 'Rechazar' : 'Retirar'"
    :loading="saving"
    @confirm="confirm"
  />
</template>
