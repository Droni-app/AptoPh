<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { DuiAlert, DuiBadge, DuiButton, DuiSkeleton, useToast } from '@dronico/droni-kit'
import {
  BOOKING_STATUS_LABELS,
  type BookingStatus,
  type ResidentAmenity,
  type ResidentBooking,
} from '@apartadock/shared'
import BookingFormModal from '@/components/BookingFormModal.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import PageHeader from '@/components/PageHeader.vue'
import { residentApi } from '@/api/resident'
import { useSubmit } from '@/composables/useSubmit'
import { describeRules } from '@/lib/amenities'
import { errorMessage } from '@/lib/errors'
import { formatDateTime, formatMoney, formatTime, unitName } from '@/lib/format'
import { useTenantStore } from '@/stores/tenant'
import { useUnitsStore } from '@/stores/units'

const tenant = useTenantStore()
const units = useUnitsStore()
const toast = useToast()

const amenities = ref<ResidentAmenity[] | null>(null)
const bookings = ref<ResidentBooking[] | null>(null)
const error = ref<string | null>(null)
const formOpen = ref(false)
const selectedAmenity = ref<string | null>(null)

const STATUS_COLORS: Record<BookingStatus, 'warning' | 'success' | 'danger' | 'neutral'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  cancelled: 'neutral',
}

const now = Date.now()
const upcoming = computed(() =>
  (bookings.value ?? [])
    .filter((b) => new Date(b.endsAt).getTime() >= now)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
)
const past = computed(() => (bookings.value ?? []).filter((b) => new Date(b.endsAt).getTime() < now))
const showUnit = computed(() => (units.home?.units.length ?? 0) > 1)
const money = (amount: string) => formatMoney(amount, tenant.current?.currency)

async function load() {
  error.value = null
  try {
    const [a, b] = await Promise.all([residentApi.amenities(), residentApi.bookings.list(), units.load()])
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

function onSaved(booking: ResidentBooking) {
  toast.success(
    booking.status === 'pending'
      ? 'Solicitud enviada. Te avisaremos cuando la administración la apruebe.'
      : 'Reserva confirmada',
  )
  load()
}

const cancelling = ref<ResidentBooking | null>(null)
const cancelOpen = ref(false)
const { saving: cancelBusy, run } = useSubmit()
function askCancel(booking: ResidentBooking) {
  cancelling.value = booking
  cancelOpen.value = true
}
async function confirmCancel() {
  const booking = cancelling.value
  if (booking && (await run(() => residentApi.bookings.cancel(booking.id), 'Reserva cancelada'))) {
    cancelOpen.value = false
    await load()
  }
}

onMounted(load)
</script>

<template>
  <PageHeader title="Reservas" subtitle="Zonas comunes de tu conjunto">
    <template #actions>
      <DuiButton color="primary" :disabled="!amenities?.length" @click="book(null)">
        <span class="mr-1" aria-hidden="true"><i class="mdi mdi-calendar-plus" /></span>Nueva reserva
      </DuiButton>
    </template>
  </PageHeader>

  <div v-if="error" class="flex flex-col items-start gap-4">
    <DuiAlert color="danger" variant="soft" class="w-full">{{ error }}</DuiAlert>
    <DuiButton variant="outline" @click="load">Reintentar</DuiButton>
  </div>

  <div v-else-if="!amenities || !bookings" class="grid gap-3 sm:grid-cols-2" aria-busy="true">
    <DuiSkeleton v-for="n in 4" :key="n" height="7rem" variant="rounded" />
  </div>

  <template v-else>
    <section aria-labelledby="mine-title" class="mb-10">
      <h2 id="mine-title" class="mb-3 text-lg font-semibold">Mis reservas</h2>
      <p v-if="upcoming.length === 0" class="rounded-2xl border border-dashed border-navy-200 p-6 text-center text-sm text-navy-500 dark:border-white/10 dark:text-navy-300">
        No tienes reservas próximas.
      </p>
      <ul v-else class="divide-y divide-navy-100 overflow-hidden rounded-2xl border border-navy-100 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-navy-900">
        <li v-for="booking in upcoming" :key="booking.id" class="flex flex-wrap items-center justify-between gap-3 p-4">
          <div class="min-w-0">
            <p class="font-medium">{{ booking.amenity.name }}</p>
            <p class="text-sm text-navy-500 dark:text-navy-300">
              {{ formatDateTime(booking.startsAt) }} – {{ formatTime(booking.endsAt) }}
              <template v-if="booking.guestsCount"> · {{ booking.guestsCount }} personas</template>
              <template v-if="showUnit"> · {{ unitName(booking.unit) }}</template>
            </p>
            <p v-if="booking.bookingFee && booking.status !== 'cancelled' && booking.status !== 'rejected'" class="text-xs text-navy-500 dark:text-navy-300">
              Tarifa {{ money(booking.bookingFee) }}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <DuiBadge :label="BOOKING_STATUS_LABELS[booking.status]" :color="STATUS_COLORS[booking.status]" variant="soft" size="sm" />
            <DuiButton v-if="booking.canCancel" size="sm" variant="ghost" color="danger" @click="askCancel(booking)">Cancelar</DuiButton>
          </div>
        </li>
      </ul>
      <details v-if="past.length" class="mt-3 text-sm">
        <summary class="cursor-pointer text-navy-500 dark:text-navy-300">Reservas anteriores ({{ past.length }})</summary>
        <ul class="mt-2 space-y-1 text-navy-600 dark:text-navy-200">
          <li v-for="booking in past" :key="booking.id">
            {{ booking.amenity.name }} · {{ formatDateTime(booking.startsAt) }} · {{ BOOKING_STATUS_LABELS[booking.status] }}
          </li>
        </ul>
      </details>
    </section>

    <section aria-labelledby="amenities-title">
      <h2 id="amenities-title" class="mb-3 text-lg font-semibold">Zonas comunes</h2>
      <p v-if="amenities.length === 0" class="text-sm text-navy-500">El conjunto aún no tiene zonas comunes para reservar.</p>
      <ul class="grid gap-4 sm:grid-cols-2">
        <li
          v-for="amenity in amenities"
          :key="amenity.id"
          class="flex flex-col rounded-2xl border border-navy-100 bg-white p-5 dark:border-white/10 dark:bg-navy-900"
        >
          <div class="flex items-start justify-between gap-3">
            <h3 class="text-lg font-semibold">{{ amenity.name }}</h3>
            <span class="shrink-0 text-sm font-medium text-teal-700 dark:text-teal-300">
              {{ amenity.bookingFee ? money(amenity.bookingFee) : 'Sin costo' }}
            </span>
          </div>
          <p v-if="amenity.description" class="mt-1 text-sm text-navy-600 dark:text-navy-200">{{ amenity.description }}</p>
          <p class="mt-2 text-xs text-navy-500 dark:text-navy-300">
            {{ [describeRules(amenity.rules), amenity.capacity ? `aforo ${amenity.capacity}` : '', amenity.requiresApproval ? 'requiere aprobación' : ''].filter(Boolean).join(' · ') }}
          </p>
          <DuiButton class="mt-4 self-start" size="sm" variant="outline" @click="book(amenity.id)">Reservar</DuiButton>
        </li>
      </ul>
    </section>

    <BookingFormModal v-model="formOpen" :amenities="amenities" :amenity-id="selectedAmenity" @saved="onSaved" />
  </template>

  <ConfirmDialog
    v-model="cancelOpen"
    title="Cancelar reserva"
    :message="`¿Cancelar la reserva de ${cancelling?.amenity.name}? El horario quedará libre para otros residentes.`"
    confirm-label="Cancelar reserva"
    :loading="cancelBusy"
    @confirm="confirmCancel"
  />
</template>
