<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  UiAlert,
  UiButton,
  UiCheckbox,
  UiForm,
  UiInput,
  UiLabel,
  UiModal,
  UiSelect,
  UiTextarea,
} from '@aptoph/ui'
import type { Amenity, BookingCreateInput, BookingQuote } from '@aptoph/shared'
import UnitPicker from '@/components/UnitPicker.vue'
import ReceiptPicker from '@/components/payments/ReceiptPicker.vue'
import SlotPicker, { type BusySlot, type SlotValue } from '@/components/amenities/SlotPicker.vue'
import { residentApi, type ResidentBookingDetail } from '@/api/resident'
import { useSubmit } from '@/composables/useSubmit'
import { bogotaToday, feeLabel, scheduleLabel } from '@/lib/amenities'
import { errorMessage, fieldErrors } from '@/lib/errors'
import { formatMoney } from '@/lib/format'
import { useTenantStore } from '@/stores/tenant'
import { useUnitsStore } from '@/stores/units'

/**
 * A resident books a common area: the area's mode decides how the time is
 * chosen; what is taken is disabled; the price comes from the API.
 */
const props = defineProps<{ amenities: Amenity[]; amenityId?: string | null }>()
const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ saved: [booking: ResidentBookingDetail, failed: string[]] }>()

const units = useUnitsStore()
const tenant = useTenantStore()
const { saving, errors, error, run, reset } = useSubmit()
const money = (amount: string | number) => formatMoney(amount, tenant.current?.currency)

const zoneId = ref('')
const unitId = ref('')
const forGuest = ref(false)
const guest = ref({ name: '', phone: '' })
const date = ref(bogotaToday(1))
const slot = ref<SlotValue>(null)
const range = ref<{ from: number | null; to: number | null }>({ from: null, to: null })
const guestsCount = ref('')
const notes = ref('')
const reference = ref('')
const files = ref<File[]>([])
const acceptTerms = ref(false)
const busy = ref<BusySlot[]>([])
const quote = ref<(BookingQuote & { startsAt: string; endsAt: string }) | null>(null)
const quoteError = ref<string | null>(null)

const amenity = computed(() => props.amenities.find((a) => a.id === zoneId.value) ?? null)
const amenityOptions = computed(() => props.amenities.map((a) => ({ value: a.id, label: a.name })))
const maxDate = computed(() => bogotaToday(amenity.value?.rules.maxDaysAhead ?? 90))

watch(open, (isOpen) => {
  if (!isOpen) return
  reset()
  zoneId.value = props.amenityId ?? props.amenities[0]?.id ?? ''
  unitId.value = units.home?.units[0]?.id ?? ''
  forGuest.value = false
  guest.value = { name: '', phone: '' }
  date.value = bogotaToday(1)
  guestsCount.value = ''
  notes.value = ''
  reference.value = ''
  files.value = []
  acceptTerms.value = false
  quote.value = null
})
watch(amenity, (a) => {
  if (!a?.allowGuests) forGuest.value = false
  acceptTerms.value = false
})

/** What is taken around the date (the day before, for overnight shifts) */
async function loadBusy() {
  const a = amenity.value
  if (!a || !open.value || !/^\d{4}-\d{2}-\d{2}$/.test(date.value)) return
  const shift = (days: number) => {
    const d = new Date(`${date.value}T12:00:00Z`)
    d.setUTCDate(d.getUTCDate() + days)
    return d.toISOString().slice(0, 10)
  }
  try {
    const { data } = await residentApi.availability(
      a.id,
      shift(-1),
      shift((a.rules.maxDays ?? 1) + 1),
    )
    busy.value = data.busy
  } catch {
    busy.value = []
  }
}
watch([zoneId, date, open], loadBusy)

function input(): BookingCreateInput | null {
  const a = amenity.value
  if (!a || !slot.value) return null
  return {
    amenityId: a.id,
    bookingType: forGuest.value ? 'guest' : 'resident',
    unitId: unitId.value,
    holder: forGuest.value
      ? { name: guest.value.name, phone: guest.value.phone || null, document: null, email: null }
      : null,
    guestsCount: guestsCount.value ? Number(guestsCount.value) : null,
    notes: notes.value || null,
    paymentReference: reference.value || null,
    acceptTerms: acceptTerms.value,
    ...slot.value,
  }
}

let timer: ReturnType<typeof setTimeout> | undefined
watch(
  [slot, forGuest, unitId],
  () => {
    clearTimeout(timer)
    quote.value = null
    quoteError.value = null
    const body = input()
    if (!body) return
    timer = setTimeout(async () => {
      try {
        quote.value = (await residentApi.bookings.quote(body)).data
      } catch (e) {
        quoteError.value = Object.values(fieldErrors(e))[0] ?? errorMessage(e)
      }
    }, 300)
  },
  { deep: true },
)

const payNow = computed(() => Number(quote.value?.payNow ?? 0))
const needsTerms = computed(() => !!amenity.value?.terms)
const ready = computed(
  () =>
    !!slot.value &&
    !quoteError.value &&
    (!needsTerms.value || acceptTerms.value) &&
    (payNow.value === 0 || files.value.length > 0),
)

async function submit() {
  const body = input()
  if (!body) return
  let booking: ResidentBookingDetail | null = null
  const failed: string[] = []
  const ok = await run(async () => {
    booking = (await residentApi.bookings.create(body)).data
    for (const file of files.value) {
      try {
        await residentApi.bookings.attach(booking.id, file)
      } catch (e) {
        failed.push(`${file.name}: ${errorMessage(e)}`)
      }
    }
  })
  if (ok && booking) {
    emit('saved', booking, failed)
    open.value = false
  }
}
</script>

<template>
  <UiModal v-model="open" title="Reservar zona común" size="lg" scrollable :persistent="saving">
    <UiForm :loading="saving" @submit="submit">
      <UiAlert v-if="error" color="danger" variant="soft">{{ error }}</UiAlert>
      <UiAlert v-else-if="Object.keys(errors).length" color="danger" variant="soft">
        {{ Object.values(errors).join('. ') }}
      </UiAlert>

      <UiLabel title="Zona común" required>
        <UiSelect v-model="zoneId" :options="amenityOptions" />
      </UiLabel>
      <template v-if="amenity">
        <p class="-mt-2 text-xs text-neutral-500 dark:text-neutral-300">
          {{ feeLabel(amenity, tenant.current?.currency) }} · {{ scheduleLabel(amenity) }}
          <template v-if="amenity.capacity"> · aforo {{ amenity.capacity }}</template>
        </p>

        <UnitPicker v-model="unitId" :error="errors.unitId" />

        <div
          v-if="amenity.allowGuests"
          class="flex gap-2"
          role="radiogroup"
          aria-label="A nombre de quién"
        >
          <button
            v-for="option in [
              { value: false, label: 'Para mi hogar' },
              { value: true, label: 'Para un invitado' },
            ]"
            :key="option.label"
            type="button"
            role="radio"
            :aria-checked="forGuest === option.value"
            class="flex-1 rounded-xl px-3 py-2 text-sm font-medium ring-1 transition"
            :class="
              forGuest === option.value
                ? 'bg-brand-700 text-white ring-brand-700'
                : 'ring-neutral-200 hover:bg-neutral-50 dark:ring-white/10 dark:hover:bg-white/5'
            "
            @click="forGuest = option.value"
          >
            {{ option.label }}
          </button>
        </div>
        <div v-if="forGuest" class="grid gap-3 sm:grid-cols-2">
          <UiLabel title="Nombre del invitado" required :error="errors['holder.name']">
            <UiInput v-model="guest.name" required maxlength="120" />
          </UiLabel>
          <UiLabel title="Celular" :error="errors['holder.phone']">
            <UiInput v-model="guest.phone" type="tel" maxlength="30" />
          </UiLabel>
          <p class="text-xs text-neutral-500 sm:col-span-2 dark:text-neutral-300">
            Tu unidad responde por la reserva y por el uso de la zona.
          </p>
        </div>

        <SlotPicker
          v-model="slot"
          v-model:date="date"
          v-model:range="range"
          :amenity="amenity"
          :busy="busy"
          :min="bogotaToday()"
          :max="maxDate"
        />

        <UiLabel title="Asistentes" :error="errors.guestsCount">
          <UiInput
            v-model="guestsCount"
            type="number"
            min="1"
            :max="amenity.capacity ?? undefined"
            :placeholder="amenity.capacity ? `Máximo ${amenity.capacity}` : ''"
          />
        </UiLabel>
        <UiLabel title="Notas para la administración">
          <UiTextarea v-model="notes" rows="2" maxlength="1000" block />
        </UiLabel>

        <!-- Price -->
        <p
          v-if="quoteError"
          class="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300"
          role="alert"
        >
          {{ quoteError }}
        </p>
        <div
          v-else-if="quote && (Number(quote.fee) > 0 || Number(quote.deposit) > 0)"
          class="space-y-1 rounded-2xl bg-neutral-50 p-4 text-sm dark:bg-white/5"
        >
          <div class="flex justify-between">
            <span>Tarifa ({{ quote.quantity }} × {{ money(quote.unitFee) }})</span>
            <span class="font-medium tabular-nums">{{ money(quote.fee) }}</span>
          </div>
          <div v-if="Number(quote.deposit) > 0" class="flex justify-between">
            <span>Depósito de garantía (se devuelve)</span>
            <span class="font-medium tabular-nums">{{ money(quote.deposit) }}</span>
          </div>
          <div
            v-if="payNow > 0"
            class="flex justify-between border-t border-neutral-200 pt-1 font-semibold dark:border-white/10"
          >
            <span>Paga antes y adjunta el soporte</span>
            <span class="tabular-nums">{{ money(quote.payNow) }}</span>
          </div>
          <p
            v-if="Number(quote.toStatement) > 0"
            class="text-xs text-neutral-500 dark:text-neutral-300"
          >
            {{ money(quote.toStatement) }} se cargan al estado de cuenta de tu unidad cuando la
            administración apruebe la reserva.
          </p>
        </div>
        <p v-else-if="quote" class="text-sm text-mint-700 dark:text-mint-300">Sin costo.</p>

        <template v-if="payNow > 0">
          <UiLabel
            title="Referencia del pago"
            help-text="Número de la transferencia o consignación"
          >
            <UiInput v-model="reference" maxlength="120" />
          </UiLabel>
          <ReceiptPicker v-model="files" :disabled="saving" :max="3" />
        </template>

        <div
          v-if="needsTerms"
          class="space-y-2 rounded-2xl border border-neutral-200 p-4 dark:border-white/10"
        >
          <p class="text-sm font-semibold">Reglamento de uso</p>
          <p
            class="max-h-40 overflow-y-auto text-sm whitespace-pre-line text-neutral-600 dark:text-neutral-200"
          >
            {{ amenity.terms }}
          </p>
          <UiCheckbox v-model="acceptTerms" label="Leí y acepto el reglamento" />
        </div>

        <p v-if="amenity.requiresApproval" class="text-xs text-neutral-500 dark:text-neutral-300">
          La administración revisa la solicitud; te avisaremos cuando la apruebe.
        </p>
      </template>

      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UiButton variant="ghost" :disabled="saving" @click="open = false">Cancelar</UiButton>
          <UiButton type="submit" color="primary" :loading="saving" :disabled="!ready">
            {{ amenity?.requiresApproval || payNow > 0 ? 'Enviar solicitud' : 'Reservar' }}
          </UiButton>
        </div>
      </template>
    </UiForm>
  </UiModal>
</template>
