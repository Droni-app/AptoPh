<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  UiAlert,
  UiButton,
  UiForm,
  UiInput,
  UiLabel,
  UiModal,
  UiRadio,
  UiSelect,
  UiSwitch,
  UiTextarea,
  useToast,
} from '@aptoph/ui'
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  type Amenity,
  type BookingCreateInput,
  type BookingType,
  type CashAccount,
  type PaymentMethod,
} from '@aptoph/shared'
import UnitPicker, { type PickedUnit } from '@/components/finance/UnitPicker.vue'
import SlotPicker, { type BusySlot, type SlotValue } from '@/components/amenities/SlotPicker.vue'
import { bookingsApi, type BookingDetail, type BookingQuoteResult } from '@/api/amenities'
import { financeApi } from '@/api/finance'
import { errorMessage, fieldErrors } from '@/lib/errors'
import { formatMoney, todayInput } from '@/lib/format'

/**
 * The administration books an area: for a unit, a resident's guest, a third
 * party or a maintenance block. The rules for residents do not apply; the
 * calendar always does.
 */
const props = defineProps<{
  amenities: Amenity[]
  /** Preselected from the calendar */
  initial?: { amenityId?: string; date?: string; hour?: number } | null
}>()
const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ saved: [booking: BookingDetail] }>()
const toast = useToast()

const active = computed(() => props.amenities.filter((a) => a.isActive))
const amenityId = ref('')
const amenity = computed(() => active.value.find((a) => a.id === amenityId.value) ?? null)
const type = ref<BookingType>('resident')
const unit = ref<PickedUnit | null>(null)
const holder = ref({ name: '', document: '', phone: '', email: '' })
const date = ref(todayInput(1))
const slot = ref<SlotValue>(null)
const range = ref<{ from: number | null; to: number | null }>({ from: null, to: null })
const guestsCount = ref('')
const notes = ref('')
const reference = ref('')
const approveNow = ref(true)
const cashAccountId = ref('')
const method = ref<PaymentMethod>('bank_transfer')
const busy = ref<BusySlot[]>([])
const quote = ref<BookingQuoteResult | null>(null)
const quoteError = ref<string | null>(null)
const accounts = ref<CashAccount[]>([])
const errors = ref<Record<string, string>>({})
const error = ref<string | null>(null)
const saving = ref(false)

watch(open, async (isOpen) => {
  if (!isOpen) return
  const init = props.initial
  amenityId.value = init?.amenityId ?? active.value[0]?.id ?? ''
  date.value = init?.date && init.date >= todayInput() ? init.date : todayInput(1)
  type.value = 'resident'
  unit.value = null
  holder.value = { name: '', document: '', phone: '', email: '' }
  guestsCount.value = ''
  notes.value = ''
  reference.value = ''
  approveNow.value = true
  errors.value = {}
  error.value = null
  quote.value = null
  // The hour tapped in the calendar
  if (init?.hour !== undefined && amenity.value?.bookingMode === 'hours') {
    setTimeout(() => (range.value = { from: init.hour! * 60, to: init.hour! * 60 }))
  }
  if (!accounts.value.length) {
    accounts.value = (await financeApi.cashAccounts().catch(() => ({ data: [] }))).data.filter(
      (a) => a.isActive,
    )
    cashAccountId.value =
      accounts.value.find((a) => a.type === 'bank')?.id ?? accounts.value[0]?.id ?? ''
  }
})

const typeOptions = computed(() => {
  const a = amenity.value
  return [
    {
      value: 'resident',
      label: 'Una unidad',
      description: 'A nombre de la unidad; responde por la reserva.',
    },
    ...(a?.allowGuests
      ? [
          {
            value: 'guest',
            label: 'Invitado de una unidad',
            description: 'Alguien de fuera; la unidad responde.',
          },
        ]
      : []),
    ...(a?.allowExternal
      ? [
          {
            value: 'external',
            label: 'Tercero externo',
            description: 'Persona o empresa que alquila la zona. Paga antes.',
          },
        ]
      : []),
    {
      value: 'block',
      label: 'Bloqueo',
      description: 'Mantenimiento, evento del conjunto o cierre. Sin cobro.',
    },
  ]
})
watch(amenity, () => {
  if (!typeOptions.value.some((o) => o.value === type.value)) type.value = 'resident'
})

const needsUnit = computed(() => type.value === 'resident' || type.value === 'guest')
const needsHolder = computed(() => type.value === 'guest' || type.value === 'external')

/** What is taken around the chosen date (the day before, for overnight bookings) */
async function loadBusy() {
  const a = amenity.value
  if (!a || !/^\d{4}-\d{2}-\d{2}$/.test(date.value)) return
  const shift = (days: number) => {
    const d = new Date(`${date.value}T12:00:00Z`)
    d.setUTCDate(d.getUTCDate() + days)
    return d.toISOString().slice(0, 10)
  }
  try {
    const { data } = await bookingsApi.calendar(shift(-1), shift((a.rules.maxDays ?? 1) + 1), a.id)
    busy.value = data
      .filter((b) => b.status === 'pending' || b.status === 'approved')
      .map((b) => ({
        startsAt: b.startsAt,
        blockedUntil: b.blockedUntil,
        isBlock: b.bookingType === 'block',
      }))
  } catch {
    busy.value = []
  }
}
watch([amenityId, date, open], () => open.value && loadBusy())

function input(): BookingCreateInput | null {
  const a = amenity.value
  if (!a || !slot.value) return null
  return {
    amenityId: a.id,
    bookingType: type.value,
    unitId: needsUnit.value ? (unit.value?.id ?? null) : null,
    holder: needsHolder.value
      ? {
          name: holder.value.name,
          document: holder.value.document || null,
          phone: holder.value.phone || null,
          email: holder.value.email || null,
        }
      : null,
    guestsCount: guestsCount.value ? Number(guestsCount.value) : null,
    notes: notes.value || null,
    paymentReference: reference.value || null,
    acceptTerms: true,
    ...slot.value,
  }
}

let timer: ReturnType<typeof setTimeout> | undefined
watch(
  [slot, type, () => unit.value?.id],
  () => {
    clearTimeout(timer)
    quote.value = null
    quoteError.value = null
    const body = input()
    if (!body || type.value === 'block' || (needsUnit.value && !body.unitId)) return
    timer = setTimeout(async () => {
      try {
        quote.value = (await bookingsApi.quote(body)).data
      } catch (e) {
        const fields = fieldErrors(e)
        quoteError.value = Object.values(fields)[0] ?? errorMessage(e)
      }
    }, 300)
  },
  { deep: true },
)

const payNow = computed(() => Number(quote.value?.payNow ?? 0))
/** Approving here records money received: say where it went */
const needsCash = computed(() => approveNow.value && payNow.value > 0)
const approvalNeeded = computed(
  () => type.value !== 'block' && (amenity.value?.requiresApproval || payNow.value > 0),
)

async function submit() {
  const body = input()
  if (!body) {
    error.value = 'Elige el horario de la reserva'
    return
  }
  saving.value = true
  errors.value = {}
  error.value = null
  try {
    const { data } = await bookingsApi.create({
      ...body,
      approve:
        approvalNeeded.value && approveNow.value
          ? needsCash.value
            ? { cashAccountId: cashAccountId.value, method: method.value }
            : {}
          : undefined,
    })
    toast.success(
      data.status === 'approved'
        ? `Reserva #${data.number} confirmada`
        : `Reserva #${data.number} registrada: queda por aprobar`,
    )
    emit('saved', data)
    open.value = false
  } catch (e) {
    errors.value = fieldErrors(e)
    error.value = Object.keys(errors.value).length
      ? Object.values(errors.value).join('. ')
      : errorMessage(e)
  } finally {
    saving.value = false
  }
}

const methodOptions = PAYMENT_METHODS.map((m) => ({ value: m, label: PAYMENT_METHOD_LABELS[m] }))
</script>

<template>
  <UiModal v-model="open" title="Nueva reserva" size="lg" scrollable :persistent="saving">
    <UiForm :loading="saving" @submit="submit">
      <UiAlert v-if="error" color="danger" variant="soft">{{ error }}</UiAlert>
      <UiLabel title="Zona común" required>
        <UiSelect v-model="amenityId" :options="active" item-label="name" item-value="id" block />
      </UiLabel>

      <template v-if="amenity">
        <UiLabel title="Para quién">
          <UiRadio
            v-model="type"
            :options="typeOptions"
            name="bookingType"
            orientation="horizontal"
          />
        </UiLabel>

        <UiLabel v-if="needsUnit" title="Unidad" required :error="errors.unitId">
          <div
            v-if="unit"
            class="flex items-center justify-between gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-sm dark:bg-white/5"
          >
            <span class="font-medium">{{ unit.label }}</span>
            <UiButton size="sm" variant="ghost" @click="unit = null">Cambiar</UiButton>
          </div>
          <UnitPicker v-else @pick="(picked) => (unit = picked)" />
        </UiLabel>

        <div v-if="needsHolder" class="grid gap-3 sm:grid-cols-2">
          <UiLabel
            :title="type === 'external' ? 'Nombre o razón social' : 'Nombre del invitado'"
            required
            :error="errors['holder.name']"
          >
            <UiInput v-model="holder.name" required maxlength="120" />
          </UiLabel>
          <UiLabel title="Documento / NIT" :error="errors['holder.document']">
            <UiInput v-model="holder.document" maxlength="30" />
          </UiLabel>
          <UiLabel title="Celular" :error="errors['holder.phone']">
            <UiInput v-model="holder.phone" type="tel" maxlength="30" />
          </UiLabel>
          <UiLabel
            title="Correo"
            :help-text="type === 'external' ? 'Recibe la confirmación y los avisos' : undefined"
            :error="errors['holder.email']"
          >
            <UiInput v-model="holder.email" type="email" maxlength="254" />
          </UiLabel>
        </div>

        <SlotPicker
          v-model="slot"
          v-model:date="date"
          v-model:range="range"
          :amenity="amenity"
          :busy="busy"
          :min="todayInput()"
        />

        <div class="grid gap-3 sm:grid-cols-2">
          <UiLabel v-if="type !== 'block'" title="Asistentes" :error="errors.guestsCount">
            <UiInput
              v-model="guestsCount"
              type="number"
              min="1"
              :max="amenity.capacity ?? undefined"
              :placeholder="amenity.capacity ? `Aforo ${amenity.capacity}` : ''"
            />
          </UiLabel>
          <UiLabel v-if="type !== 'block' && payNow > 0" title="Referencia del pago">
            <UiInput
              v-model="reference"
              maxlength="120"
              placeholder="N.º de transferencia o recibo"
            />
          </UiLabel>
        </div>
        <UiLabel :title="type === 'block' ? 'Motivo' : 'Notas'" :required="type === 'block'">
          <UiTextarea
            v-model="notes"
            rows="2"
            maxlength="1000"
            block
            :required="type === 'block'"
            :placeholder="type === 'block' ? 'Mantenimiento de la piscina' : ''"
          />
        </UiLabel>

        <!-- Price -->
        <p
          v-if="quoteError"
          class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300"
        >
          {{ quoteError }}
        </p>
        <div
          v-else-if="quote"
          class="grid grid-cols-2 gap-x-4 gap-y-1 rounded-xl bg-neutral-50 p-4 text-sm sm:grid-cols-4 dark:bg-white/5"
        >
          <div>
            <p class="text-neutral-500">Tarifa</p>
            <p class="font-semibold">{{ formatMoney(quote.fee) }}</p>
          </div>
          <div>
            <p class="text-neutral-500">Depósito</p>
            <p class="font-semibold">{{ formatMoney(quote.deposit) }}</p>
          </div>
          <div>
            <p class="text-neutral-500">Se paga antes</p>
            <p class="font-semibold">{{ formatMoney(quote.payNow) }}</p>
          </div>
          <div>
            <p class="text-neutral-500">Al estado de cuenta</p>
            <p class="font-semibold">{{ formatMoney(quote.toStatement) }}</p>
          </div>
        </div>

        <div
          v-if="approvalNeeded"
          class="space-y-3 rounded-xl border border-neutral-200 p-4 dark:border-white/10"
        >
          <UiSwitch
            v-model="approveNow"
            label="Aprobar al registrar"
            :description="
              payNow > 0
                ? 'Registra el pago recibido y confirma la reserva.'
                : 'Sin esto queda por aprobar, como las del portal.'
            "
          />
          <div v-if="needsCash" class="grid gap-3 sm:grid-cols-2">
            <UiLabel title="Entró a" required :error="errors['approve.cashAccountId']">
              <UiSelect
                v-model="cashAccountId"
                :options="accounts"
                item-label="name"
                item-value="id"
                block
              />
            </UiLabel>
            <UiLabel title="Medio de pago">
              <UiSelect v-model="method" :options="methodOptions" block />
            </UiLabel>
          </div>
        </div>
      </template>
      <p v-else class="text-sm text-neutral-500">No hay zonas comunes activas.</p>

      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UiButton variant="ghost" :disabled="saving" @click="open = false">Cancelar</UiButton>
          <UiButton type="submit" color="primary" :loading="saving" :disabled="!slot || !amenity">
            {{ type === 'block' ? 'Bloquear' : 'Reservar' }}
          </UiButton>
        </div>
      </template>
    </UiForm>
  </UiModal>
</template>
