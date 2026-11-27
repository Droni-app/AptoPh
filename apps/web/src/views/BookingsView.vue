<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { UiAlert, UiBadge, UiButton, UiModal, UiSkeleton, useToast } from '@aptoph/ui'
import {
  BOOKING_STATUS_LABELS,
  BOOKING_TYPE_LABELS,
  DEPOSIT_STATUS_LABELS,
  type Amenity,
  type Booking,
} from '@aptoph/shared'
import BookingFormModal from '@/components/amenities/BookingFormModal.vue'
import ReceiptPicker from '@/components/payments/ReceiptPicker.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import { residentApi, type ResidentBookingDetail } from '@/api/resident'
import { useSubmit } from '@/composables/useSubmit'
import { STATUS_COLORS, feeLabel, formatRange, paidUpfront, scheduleLabel } from '@/lib/amenities'
import { openSigned } from '@/lib/attachments'
import { errorMessage } from '@/lib/errors'
import { formatMoney, unitName } from '@/lib/format'
import { useTenantStore } from '@/stores/tenant'
import { useUnitsStore } from '@/stores/units'

const tenant = useTenantStore()
const units = useUnitsStore()
const toast = useToast()
const route = useRoute()
const router = useRouter()

const amenities = ref<Amenity[] | null>(null)
const bookings = ref<Booking[] | null>(null)
const error = ref<string | null>(null)
const formOpen = ref(false)
const selectedAmenity = ref<string | null>(null)

const now = Date.now()
const upcoming = computed(() =>
  (bookings.value ?? [])
    .filter((b) => new Date(b.endsAt).getTime() >= now)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
)
const past = computed(() =>
  (bookings.value ?? []).filter((b) => new Date(b.endsAt).getTime() < now),
)
const showUnit = computed(() => (units.home?.units.length ?? 0) > 1)
const money = (amount: string | number) => formatMoney(amount, tenant.current?.currency)
/** Waiting for the payment receipt */
const needsReceipt = (b: Booking) =>
  b.status === 'pending' && paidUpfront(b) > 0 && b.attachmentCount === 0

async function load() {
  error.value = null
  try {
    const [a, b] = await Promise.all([
      residentApi.amenities(),
      residentApi.bookings.list(),
      units.load(),
    ])
    amenities.value = a.data
    bookings.value = b.data
  } catch (e) {
    error.value = errorMessage(e, 'No pudimos cargar las reservas')
  }
}

function book(amenityId: string | null) {
  selectedAmenity.value = amenityId
  formOpen.value = true
}

function onSaved(booking: ResidentBookingDetail, failed: string[]) {
  toast.success(
    booking.status === 'pending'
      ? 'Solicitud enviada. Te avisaremos cuando la administración la revise.'
      : 'Reserva confirmada',
  )
  for (const message of failed) toast.error(`No se adjuntó ${message}`)
  load()
}

/* ---------- Detail ---------- */
const detail = ref<ResidentBookingDetail | null>(null)
const detailOpen = computed({
  get: () => !!route.query.reserva,
  set: (value) => {
    if (value) return
    const query = { ...route.query }
    delete query.reserva
    router.replace({ query })
  },
})
const open = (booking: Booking) => router.push({ query: { reserva: booking.id } })
watch(
  () => route.query.reserva,
  async (id) => {
    detail.value = null
    files.value = []
    if (!id) return
    try {
      detail.value = (await residentApi.bookings.show(String(id))).data
    } catch (e) {
      toast.error(errorMessage(e))
      detailOpen.value = false
    }
  },
  { immediate: true },
)

const files = ref<File[]>([])
const { saving: uploading, run: runUpload } = useSubmit()
async function upload() {
  const booking = detail.value
  if (!booking) return
  const ok = await runUpload(async () => {
    for (const file of files.value) await residentApi.bookings.attach(booking.id, file)
  }, 'Soporte enviado a la administración')
  if (ok) {
    files.value = []
    detail.value = (await residentApi.bookings.show(booking.id)).data
    load()
  }
}

/* ---------- Cancel ---------- */
const cancelling = ref<Booking | null>(null)
const cancelOpen = ref(false)
const { saving: cancelBusy, run } = useSubmit()
function askCancel(booking: Booking) {
  cancelling.value = booking
  cancelOpen.value = true
}
async function confirmCancel() {
  const booking = cancelling.value
  if (booking && (await run(() => residentApi.bookings.cancel(booking.id), 'Reserva cancelada'))) {
    cancelOpen.value = false
    detailOpen.value = false
    await load()
  }
}
const cancelMessage = computed(() => {
  const b = cancelling.value
  if (!b) return ''
  const paid = b.status === 'approved' && paidUpfront(b) > 0
  return `¿Cancelar la reserva de ${b.amenity.name}? El horario quedará libre.${
    paid ? ' La administración gestiona la devolución de lo que pagaste.' : ''
  }`
})

onMounted(load)
</script>

<template>
  <PageHeader title="Reservas" subtitle="Zonas comunes de tu conjunto" art="reservas">
    <template #actions>
      <UiButton color="primary" :disabled="!amenities?.length" @click="book(null)">
        <span class="mr-1" aria-hidden="true"><i class="mdi mdi-calendar-plus" /></span>Nueva
        reserva
      </UiButton>
    </template>
  </PageHeader>

  <div v-if="error" class="flex flex-col items-start gap-4">
    <UiAlert color="danger" variant="soft" class="w-full">{{ error }}</UiAlert>
    <UiButton variant="outline" @click="load">Reintentar</UiButton>
  </div>

  <div v-else-if="!amenities || !bookings" class="grid gap-3 sm:grid-cols-2" aria-busy="true">
    <UiSkeleton v-for="n in 4" :key="n" height="7rem" variant="rounded" />
  </div>

  <template v-else>
    <section aria-labelledby="mine-title" class="mb-10">
      <h2 id="mine-title" class="mb-3 text-lg font-semibold">Mis reservas</h2>
      <EmptyState
        v-if="upcoming.length === 0"
        class="rounded-2xl border border-neutral-100 bg-white dark:border-white/10 dark:bg-neutral-900"
        title="No tienes reservas próximas"
        description="Elige una zona común abajo y aparta tu horario."
      />
      <ul
        v-else
        class="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-100 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-neutral-900"
      >
        <li v-for="booking in upcoming" :key="booking.id">
          <button
            type="button"
            class="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left hover:bg-neutral-50 dark:hover:bg-white/5"
            @click="open(booking)"
          >
            <span class="flex min-w-0 items-start gap-3">
              <span
                class="mt-1.5 size-2.5 shrink-0 rounded-full"
                :style="{ background: booking.amenity.color ?? '#64748b' }"
                aria-hidden="true"
              />
              <span class="min-w-0">
                <span class="block font-medium">{{ booking.amenity.name }}</span>
                <span
                  class="block text-sm text-neutral-500 first-letter:uppercase dark:text-neutral-300"
                >
                  {{ formatRange(booking) }}
                </span>
                <span class="block text-xs text-neutral-500 dark:text-neutral-300">
                  <template v-if="booking.bookingType === 'guest'">
                    Invitado: {{ booking.holder?.name }} ·
                  </template>
                  <template v-if="showUnit">{{ unitName(booking.unit!) }} · </template>
                  <template v-if="Number(booking.feeAmount) > 0">{{
                    money(booking.feeAmount)
                  }}</template>
                  <template v-else>Sin costo</template>
                </span>
              </span>
            </span>
            <span class="flex flex-wrap items-center gap-2">
              <UiBadge
                v-if="needsReceipt(booking)"
                label="Falta el soporte"
                color="danger"
                icon="mdi-paperclip"
                variant="soft"
                size="sm"
              />
              <UiBadge
                :label="BOOKING_STATUS_LABELS[booking.status]"
                :color="STATUS_COLORS[booking.status]"
                variant="soft"
                size="sm"
              />
            </span>
          </button>
        </li>
      </ul>
      <details v-if="past.length" class="mt-3 text-sm">
        <summary class="cursor-pointer text-neutral-500 dark:text-neutral-300">
          Reservas anteriores ({{ past.length }})
        </summary>
        <ul class="mt-2 space-y-1 text-neutral-600 dark:text-neutral-200">
          <li v-for="booking in past" :key="booking.id">
            <button type="button" class="text-left hover:underline" @click="open(booking)">
              {{ booking.amenity.name }} · {{ formatRange(booking) }} ·
              {{ BOOKING_STATUS_LABELS[booking.status] }}
              <template v-if="booking.depositStatus">
                · depósito {{ DEPOSIT_STATUS_LABELS[booking.depositStatus].toLowerCase() }}
              </template>
            </button>
          </li>
        </ul>
      </details>
    </section>

    <section aria-labelledby="amenities-title">
      <h2 id="amenities-title" class="mb-3 text-lg font-semibold">Zonas comunes</h2>
      <p v-if="amenities.length === 0" class="text-sm text-neutral-500">
        El conjunto aún no tiene zonas comunes para reservar.
      </p>
      <ul class="grid gap-4 sm:grid-cols-2">
        <li
          v-for="amenity in amenities"
          :key="amenity.id"
          class="flex flex-col rounded-2xl border border-neutral-100 bg-white p-5 dark:border-white/10 dark:bg-neutral-900"
        >
          <div class="flex items-start justify-between gap-3">
            <h3 class="flex items-center gap-2 text-lg font-semibold">
              <span
                class="size-2.5 rounded-full"
                :style="{ background: amenity.color ?? '#64748b' }"
                aria-hidden="true"
              />
              {{ amenity.name }}
            </h3>
            <span class="shrink-0 text-sm font-medium text-mint-700 dark:text-mint-300">
              {{ feeLabel(amenity, tenant.current?.currency) }}
            </span>
          </div>
          <p v-if="amenity.description" class="mt-1 text-sm text-neutral-600 dark:text-neutral-200">
            {{ amenity.description }}
          </p>
          <p class="mt-2 text-xs text-neutral-500 dark:text-neutral-300">
            {{
              [
                scheduleLabel(amenity),
                amenity.capacity ? `aforo ${amenity.capacity}` : '',
                amenity.depositAmount ? `depósito ${money(amenity.depositAmount)}` : '',
                amenity.requiresApproval ? 'requiere aprobación' : 'confirmación inmediata',
              ]
                .filter(Boolean)
                .join(' · ')
            }}
          </p>
          <UiButton class="mt-4 self-start" size="sm" variant="outline" @click="book(amenity.id)">
            Reservar
          </UiButton>
        </li>
      </ul>
    </section>

    <BookingFormModal
      v-model="formOpen"
      :amenities="amenities"
      :amenity-id="selectedAmenity"
      @saved="onSaved"
    />
  </template>

  <UiModal
    v-model="detailOpen"
    :title="detail ? `${detail.amenity.name} · reserva #${detail.number}` : 'Reserva'"
    size="md"
    scrollable
  >
    <div v-if="!detail" class="space-y-3">
      <UiSkeleton height="1.5rem" width="60%" />
      <UiSkeleton height="6rem" variant="rounded" />
    </div>
    <div v-else class="space-y-4 text-sm">
      <div class="flex flex-wrap gap-2">
        <UiBadge
          :label="BOOKING_STATUS_LABELS[detail.status]"
          :color="STATUS_COLORS[detail.status]"
          variant="soft"
        />
        <UiBadge
          v-if="detail.bookingType === 'guest'"
          :label="BOOKING_TYPE_LABELS.guest"
          variant="outline"
        />
        <UiBadge
          v-if="detail.depositStatus"
          :label="`Depósito ${DEPOSIT_STATUS_LABELS[detail.depositStatus].toLowerCase()}`"
          variant="soft"
        />
      </div>
      <p class="text-base font-medium first-letter:uppercase">{{ formatRange(detail) }}</p>
      <dl class="grid grid-cols-2 gap-x-4 gap-y-2">
        <template v-if="detail.holder">
          <dt class="text-neutral-500">Invitado</dt>
          <dd>{{ detail.holder.name }}</dd>
        </template>
        <template v-if="detail.guestsCount">
          <dt class="text-neutral-500">Asistentes</dt>
          <dd>{{ detail.guestsCount }}</dd>
        </template>
        <template v-if="Number(detail.feeAmount) > 0">
          <dt class="text-neutral-500">Tarifa</dt>
          <dd>
            {{ money(detail.feeAmount) }}
            <span class="text-neutral-500">
              ·
              {{ detail.paymentMode === 'prepaid' ? 'pago anticipado' : 'al estado de cuenta' }}
            </span>
          </dd>
        </template>
        <template v-if="Number(detail.depositAmount) > 0">
          <dt class="text-neutral-500">Depósito</dt>
          <dd>{{ money(detail.depositAmount) }}</dd>
        </template>
      </dl>
      <UiAlert
        v-if="detail.status === 'rejected' && detail.reviewNote"
        color="danger"
        variant="soft"
      >
        La administración la rechazó: {{ detail.reviewNote }}
      </UiAlert>
      <UiAlert
        v-else-if="detail.status === 'approved' && detail.reviewNote"
        color="success"
        variant="soft"
      >
        {{ detail.reviewNote }}
      </UiAlert>
      <UiAlert v-if="detail.status === 'cancelled'" color="neutral" variant="soft">
        Cancelada{{ detail.cancellationReason ? `: ${detail.cancellationReason}` : '' }}
      </UiAlert>
      <UiAlert v-if="detail.depositStatus === 'retained'" color="warning" variant="soft">
        Se descontaron {{ money(detail.depositRetained ?? 0) }} del depósito{{
          detail.depositNote ? `: ${detail.depositNote}` : ''
        }}
      </UiAlert>

      <div v-if="detail.attachments.length">
        <p class="mb-1 font-semibold">Soporte de pago</p>
        <ul class="space-y-1">
          <li v-for="file in detail.attachments" :key="file.id">
            <button
              type="button"
              class="text-mint-700 hover:underline dark:text-mint-300"
              @click="openSigned(() => residentApi.bookings.attachmentUrl(file.id))"
            >
              <i class="mdi mdi-paperclip" aria-hidden="true" /> {{ file.fileName }}
            </button>
          </li>
        </ul>
      </div>
      <template v-if="detail.status === 'pending' && paidUpfront(detail) > 0">
        <UiAlert v-if="!detail.attachments.length" color="warning" variant="soft">
          Paga {{ money(paidUpfront(detail)) }} a la cuenta del conjunto y adjunta el soporte para
          que la administración apruebe la reserva.
        </UiAlert>
        <ReceiptPicker
          v-if="detail.attachments.length < 3"
          v-model="files"
          :disabled="uploading"
          :max="3 - detail.attachments.length"
        />
        <UiButton
          v-if="files.length"
          color="primary"
          size="sm"
          :loading="uploading"
          @click="upload"
        >
          Enviar soporte
        </UiButton>
      </template>
    </div>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UiButton
          v-if="detail?.canCancel"
          variant="ghost"
          color="danger"
          @click="askCancel(detail)"
        >
          Cancelar reserva
        </UiButton>
        <UiButton variant="outline" @click="detailOpen = false">Cerrar</UiButton>
      </div>
    </template>
  </UiModal>

  <ConfirmDialog
    v-model="cancelOpen"
    title="Cancelar reserva"
    :message="cancelMessage"
    confirm-label="Cancelar reserva"
    :loading="cancelBusy"
    @confirm="confirmCancel"
  />
</template>
