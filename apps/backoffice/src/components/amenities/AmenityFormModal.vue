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
  UiTabs,
  UiTextarea,
  useToast,
} from '@aptoph/ui'
import {
  AMENITY_PAYMENT_MODES,
  AMENITY_PAYMENT_MODE_DESCRIPTIONS,
  AMENITY_PAYMENT_MODE_LABELS,
  BOOKING_MODES,
  BOOKING_MODE_LABELS,
  BOOKING_MODE_UNITS,
  WEEKDAYS,
  WEEKDAY_LABELS,
  type Amenity,
  type AmenityInput,
  type AmenityPaymentMode,
  type AmenityShift,
  type BookingMode,
  type Weekday,
} from '@aptoph/shared'
import { amenitiesApi } from '@/api/amenities'
import { errorMessage, fieldErrors } from '@/lib/errors'

/**
 * Creates or edits a common area: how it is booked, what it costs and its
 * rules. docs/amenities.md
 */
const props = defineProps<{ amenity?: Amenity | null }>()
const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ saved: [amenity: Amenity] }>()
const toast = useToast()

const COLORS = ['#7c3aed', '#2563eb', '#0d9488', '#65a30d', '#ea580c', '#db2777', '#475569']

type Form = {
  name: string
  description: string
  capacity: string
  color: string
  isActive: boolean
  bookingMode: BookingMode
  opensAt: string
  closesAt: string
  slotMinutes: string
  minHours: string
  maxHours: string
  maxDays: string
  shifts: AmenityShift[]
  closedOn: Weekday[]
  bufferMinutes: string
  bookingFee: string
  paymentMode: AmenityPaymentMode
  depositAmount: string
  allowExternal: boolean
  externalFee: string
  requiresApproval: boolean
  allowDelinquent: boolean
  allowGuests: boolean
  minNoticeHours: string
  maxDaysAhead: string
  maxActivePerUnit: string
  maxPerMonthPerUnit: string
  cancelHours: string
  terms: string
}

const text = (value: number | string | null | undefined) =>
  value === null || value === undefined ? '' : String(Number(value))
const shiftId = () => Math.random().toString(36).slice(2, 10)

const empty = (): Form => ({
  name: '',
  description: '',
  capacity: '',
  color: COLORS[0]!,
  isActive: true,
  bookingMode: 'hours',
  opensAt: '08:00',
  closesAt: '22:00',
  slotMinutes: '60',
  minHours: '',
  maxHours: '4',
  maxDays: '1',
  shifts: [
    { id: shiftId(), name: 'Mañana', startsAt: '08:00', endsAt: '13:00' },
    { id: shiftId(), name: 'Tarde', startsAt: '13:00', endsAt: '18:00' },
    { id: shiftId(), name: 'Noche', startsAt: '18:00', endsAt: '23:00' },
  ],
  closedOn: [],
  bufferMinutes: '',
  bookingFee: '',
  paymentMode: 'statement',
  depositAmount: '',
  allowExternal: false,
  externalFee: '',
  requiresApproval: true,
  allowDelinquent: true,
  allowGuests: false,
  minNoticeHours: '',
  maxDaysAhead: '90',
  maxActivePerUnit: '',
  maxPerMonthPerUnit: '',
  cancelHours: '',
  terms: '',
})

const form = ref<Form>(empty())
const tab = ref('general')
const errors = ref<Record<string, string>>({})
const error = ref<string | null>(null)
const saving = ref(false)

watch(open, (isOpen) => {
  if (!isOpen) return
  const a = props.amenity
  const base = empty()
  form.value = a
    ? {
        ...base,
        name: a.name,
        description: a.description ?? '',
        capacity: text(a.capacity),
        color: a.color ?? base.color,
        isActive: a.isActive,
        bookingMode: a.bookingMode,
        opensAt: a.rules.opensAt ?? '',
        closesAt: a.rules.closesAt ?? '',
        slotMinutes: String(a.rules.slotMinutes ?? 60),
        minHours: text(a.rules.minHours),
        maxHours: text(a.rules.maxHours),
        maxDays: text(a.rules.maxDays ?? 1),
        shifts: a.rules.shifts?.length ? a.rules.shifts.map((s) => ({ ...s })) : base.shifts,
        closedOn: [...(a.rules.closedOn ?? [])],
        bufferMinutes: text(a.rules.bufferMinutes),
        bookingFee: text(a.bookingFee),
        paymentMode: a.paymentMode,
        depositAmount: text(a.depositAmount),
        allowExternal: a.allowExternal,
        externalFee: text(a.externalFee),
        requiresApproval: a.requiresApproval,
        allowDelinquent: a.allowDelinquent,
        allowGuests: a.allowGuests,
        minNoticeHours: text(a.rules.minNoticeHours),
        maxDaysAhead: text(a.rules.maxDaysAhead ?? 90),
        maxActivePerUnit: text(a.rules.maxActivePerUnit),
        maxPerMonthPerUnit: text(a.rules.maxPerMonthPerUnit),
        cancelHours: text(a.rules.cancelHours),
        terms: a.terms ?? '',
      }
    : base
  tab.value = 'general'
  errors.value = {}
  error.value = null
})

const tabs = computed(() => {
  const has = (...keys: string[]) =>
    Object.keys(errors.value).some((key) => keys.some((k) => key.startsWith(k)))
  const flag = (bad: boolean) => (bad ? '!' : undefined)
  return [
    { label: 'General', value: 'general', badge: flag(has('name', 'description', 'capacity')) },
    {
      label: 'Agenda',
      value: 'schedule',
      badge: flag(
        has(
          'bookingMode',
          'rules.opensAt',
          'rules.closesAt',
          'rules.shifts',
          'rules.maxHours',
          'rules.minHours',
          'rules.maxDays',
          'rules.buffer',
        ),
      ),
    },
    {
      label: 'Tarifas y pago',
      value: 'pricing',
      badge: flag(has('bookingFee', 'externalFee', 'depositAmount', 'paymentMode')),
    },
    { label: 'Reglas', value: 'rules', badge: flag(has('rules.min', 'rules.max', 'rules.cancel')) },
    { label: 'Reglamento', value: 'terms', badge: flag(has('terms')) },
  ]
})

const unit = computed(() => BOOKING_MODE_UNITS[form.value.bookingMode][0])
/** Money received in advance is always reviewed */
const approvalForced = computed(
  () => form.value.paymentMode === 'prepaid' || Number(form.value.depositAmount || 0) > 0,
)
watch(approvalForced, (forced) => {
  if (forced) form.value.requiresApproval = true
})

const modeOptions = BOOKING_MODES.map((mode) => ({
  value: mode,
  label: BOOKING_MODE_LABELS[mode],
  description: {
    hours: 'Eligen hora de inicio y de fin (gimnasio, BBQ, cancha).',
    days: 'Días completos, del horario de entrega al de devolución (kiosko, finca).',
    shifts: 'Bloques fijos que defines: mañana, tarde, noche (salón social).',
  }[mode],
}))
const paymentOptions = AMENITY_PAYMENT_MODES.map((mode) => ({
  value: mode,
  label: AMENITY_PAYMENT_MODE_LABELS[mode],
  description: AMENITY_PAYMENT_MODE_DESCRIPTIONS[mode],
}))

function toggleDay(day: Weekday) {
  const days = form.value.closedOn
  form.value.closedOn = days.includes(day) ? days.filter((d) => d !== day) : [...days, day]
}
function addShift() {
  const last = form.value.shifts[form.value.shifts.length - 1]
  form.value.shifts.push({
    id: shiftId(),
    name: '',
    startsAt: last?.endsAt && last.endsAt !== '24:00' ? last.endsAt : '08:00',
    endsAt: '',
  })
}

const num = (value: string) => (value.trim() === '' ? undefined : Number(value))

function payload(): AmenityInput {
  const f = form.value
  const mode = f.bookingMode
  return {
    name: f.name,
    description: f.description || null,
    capacity: num(f.capacity) ?? null,
    bookingMode: mode,
    bookingFee: num(f.bookingFee) ?? null,
    externalFee: f.allowExternal ? (num(f.externalFee) ?? null) : null,
    depositAmount: num(f.depositAmount) ?? null,
    paymentMode: f.paymentMode,
    requiresApproval: f.requiresApproval,
    allowDelinquent: f.allowDelinquent,
    allowGuests: f.allowGuests,
    allowExternal: f.allowExternal,
    terms: f.terms || null,
    color: f.color,
    isActive: f.isActive,
    rules: {
      opensAt: mode !== 'shifts' ? f.opensAt || undefined : undefined,
      closesAt: mode !== 'shifts' ? f.closesAt || undefined : undefined,
      closedOn: f.closedOn.length ? f.closedOn : undefined,
      slotMinutes: mode === 'hours' ? (Number(f.slotMinutes) as 30 | 60) : undefined,
      minHours: mode === 'hours' ? num(f.minHours) : undefined,
      maxHours: mode === 'hours' ? num(f.maxHours) : undefined,
      maxDays: mode === 'days' ? num(f.maxDays) : undefined,
      shifts: mode === 'shifts' ? f.shifts : undefined,
      bufferMinutes: num(f.bufferMinutes),
      minNoticeHours: num(f.minNoticeHours),
      maxDaysAhead: num(f.maxDaysAhead),
      maxActivePerUnit: num(f.maxActivePerUnit),
      maxPerMonthPerUnit: num(f.maxPerMonthPerUnit),
      cancelHours: num(f.cancelHours),
    },
  }
}

/** The first tab with an error, so the person sees it */
function showErrors() {
  const keys = Object.keys(errors.value)
  const owner = tabs.value.find((t) => t.badge)
  if (owner) tab.value = owner.value
  else if (keys.length) tab.value = 'general'
}

async function submit() {
  saving.value = true
  errors.value = {}
  error.value = null
  try {
    const body = payload()
    const { data } = props.amenity
      ? await amenitiesApi.update(props.amenity.id, body)
      : await amenitiesApi.create(body)
    toast.success(props.amenity ? 'Zona común actualizada' : 'Zona común creada')
    emit('saved', data)
    open.value = false
  } catch (e) {
    errors.value = fieldErrors(e)
    error.value = Object.keys(errors.value).length ? null : errorMessage(e)
    showErrors()
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UiModal
    v-model="open"
    :title="amenity ? amenity.name : 'Nueva zona común'"
    size="lg"
    scrollable
    :persistent="saving"
  >
    <UiForm :loading="saving" @submit="submit">
      <UiTabs v-model="tab" :tabs="tabs" variant="underline" size="sm" aria-label="Secciones" />
      <UiAlert v-if="error" color="danger" variant="soft">{{ error }}</UiAlert>

      <!-- General -->
      <div v-show="tab === 'general'" class="space-y-4">
        <UiLabel title="Nombre" required :error="errors.name">
          <UiInput v-model="form.name" required maxlength="100" placeholder="Salón social" />
        </UiLabel>
        <UiLabel
          title="Descripción"
          help-text="Lo que incluye: mobiliario, cocina, sonido…"
          :error="errors.description"
        >
          <UiTextarea v-model="form.description" rows="2" maxlength="2000" block />
        </UiLabel>
        <div class="grid gap-4 sm:grid-cols-2">
          <UiLabel
            title="Aforo"
            help-text="Máximo de personas por reserva"
            :error="errors.capacity"
          >
            <UiInput v-model="form.capacity" type="number" min="1" placeholder="Sin límite" />
          </UiLabel>
          <UiLabel title="Color en el calendario">
            <div class="flex flex-wrap gap-2 pt-1">
              <button
                v-for="color in COLORS"
                :key="color"
                type="button"
                class="size-7 rounded-full ring-offset-2 transition dark:ring-offset-neutral-900"
                :class="form.color === color ? 'ring-2 ring-neutral-900 dark:ring-white' : ''"
                :style="{ background: color }"
                :aria-label="`Color ${color}`"
                :aria-pressed="form.color === color"
                @click="form.color = color"
              />
            </div>
          </UiLabel>
        </div>
        <UiSwitch
          v-if="amenity"
          v-model="form.isActive"
          label="Disponible para reservar"
          description="Inactiva, no aparece en el portal; sus reservas siguen en el historial."
        />
      </div>

      <!-- Agenda -->
      <div v-show="tab === 'schedule'" class="space-y-5">
        <UiLabel title="Cómo se agenda" :error="errors.bookingMode">
          <UiRadio v-model="form.bookingMode" :options="modeOptions" name="bookingMode" />
        </UiLabel>

        <div v-if="form.bookingMode !== 'shifts'" class="grid gap-4 sm:grid-cols-2">
          <UiLabel
            :title="form.bookingMode === 'days' ? 'Hora de entrega' : 'Abre'"
            :error="errors['rules.opensAt']"
          >
            <UiInput v-model="form.opensAt" type="time" />
          </UiLabel>
          <UiLabel
            :title="form.bookingMode === 'days' ? 'Hora de devolución' : 'Cierra'"
            :error="errors['rules.closesAt']"
          >
            <UiInput v-model="form.closesAt" type="time" />
          </UiLabel>
        </div>

        <div v-if="form.bookingMode === 'hours'" class="grid gap-4 sm:grid-cols-3">
          <UiLabel title="Bloques de" :error="errors['rules.slotMinutes']">
            <UiSelect
              v-model="form.slotMinutes"
              :options="[
                { label: '1 hora', value: '60' },
                { label: '30 minutos', value: '30' },
              ]"
              block
            />
          </UiLabel>
          <UiLabel title="Mínimo (horas)" :error="errors['rules.minHours']">
            <UiInput v-model="form.minHours" type="number" min="0.5" step="0.5" placeholder="—" />
          </UiLabel>
          <UiLabel title="Máximo (horas)" :error="errors['rules.maxHours']">
            <UiInput v-model="form.maxHours" type="number" min="0.5" step="0.5" placeholder="—" />
          </UiLabel>
        </div>

        <UiLabel
          v-if="form.bookingMode === 'days'"
          title="Máximo de días seguidos"
          :error="errors['rules.maxDays']"
        >
          <UiInput v-model="form.maxDays" type="number" min="1" max="30" />
        </UiLabel>

        <div v-if="form.bookingMode === 'shifts'" class="space-y-2">
          <p class="text-sm font-medium">Turnos</p>
          <p class="text-xs text-neutral-500">
            Pueden reservar uno o varios turnos seguidos. Un turno que termina después de medianoche
            (p. ej. 20:00 a 02:00) cuenta para el día en que empieza.
          </p>
          <div
            v-for="(shift, i) in form.shifts"
            :key="shift.id"
            class="grid grid-cols-[1fr_8.5rem_8.5rem_auto] items-center gap-2"
          >
            <UiInput
              v-model="shift.name"
              placeholder="Nombre"
              maxlength="40"
              :aria-label="`Nombre del turno ${i + 1}`"
            />
            <UiInput
              v-model="shift.startsAt"
              type="time"
              :aria-label="`Inicio del turno ${i + 1}`"
            />
            <UiInput v-model="shift.endsAt" type="time" :aria-label="`Fin del turno ${i + 1}`" />
            <UiButton
              variant="ghost"
              icon="mdi-close"
              :aria-label="`Quitar el turno ${shift.name || i + 1}`"
              :disabled="form.shifts.length === 1"
              @click="form.shifts.splice(i, 1)"
            />
          </div>
          <p v-if="errors['rules.shifts']" class="text-sm text-red-600">
            {{ errors['rules.shifts'] }}
          </p>
          <UiButton variant="outline" size="sm" icon="mdi-plus" @click="addShift"
            >Agregar turno</UiButton
          >
        </div>

        <UiLabel title="Días cerrada" help-text="No se puede reservar esos días">
          <div class="flex flex-wrap gap-1.5 pt-1">
            <button
              v-for="day in WEEKDAYS"
              :key="day"
              type="button"
              class="rounded-full px-3 py-1 text-xs font-medium ring-1 transition"
              :class="
                form.closedOn.includes(day)
                  ? 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/15 dark:text-red-300 dark:ring-red-500/30'
                  : 'text-neutral-600 ring-neutral-200 hover:bg-neutral-50 dark:text-neutral-300 dark:ring-white/10 dark:hover:bg-white/5'
              "
              :aria-pressed="form.closedOn.includes(day)"
              @click="toggleDay(day)"
            >
              {{ WEEKDAY_LABELS[day] }}
            </button>
          </div>
        </UiLabel>

        <UiLabel
          title="Tiempo de aseo entre reservas (minutos)"
          help-text="Después de cada reserva la zona queda bloqueada este tiempo"
          :error="errors['rules.bufferMinutes']"
        >
          <UiInput
            v-model="form.bufferMinutes"
            type="number"
            min="5"
            max="720"
            placeholder="Sin margen"
          />
        </UiLabel>
      </div>

      <!-- Pricing -->
      <div v-show="tab === 'pricing'" class="space-y-5">
        <UiLabel
          :title="`Tarifa para residentes, por ${unit}`"
          help-text="Vacía o en cero: sin costo"
          :error="errors.bookingFee"
        >
          <UiInput v-model="form.bookingFee" type="number" min="0" step="1000" placeholder="0" />
        </UiLabel>
        <UiLabel title="Cómo pagan los residentes" :error="errors.paymentMode">
          <UiRadio v-model="form.paymentMode" :options="paymentOptions" name="paymentMode" />
        </UiLabel>
        <UiLabel
          title="Depósito de garantía"
          help-text="Se paga antes con el soporte y se devuelve después del evento, completo o con el descuento por daños"
          :error="errors.depositAmount"
        >
          <UiInput
            v-model="form.depositAmount"
            type="number"
            min="0"
            step="1000"
            placeholder="Sin depósito"
          />
        </UiLabel>
        <div class="rounded-xl border border-neutral-200 p-4 dark:border-white/10">
          <UiSwitch
            v-model="form.allowExternal"
            label="Se alquila a terceros externos"
            description="Personas o empresas que no viven en el conjunto. La administración registra la reserva y el pago."
          />
          <UiLabel
            v-if="form.allowExternal"
            class="mt-4"
            :title="`Tarifa para terceros, por ${unit}`"
            help-text="Vacía: la misma de los residentes"
            :error="errors.externalFee"
          >
            <UiInput v-model="form.externalFee" type="number" min="0" step="1000" />
          </UiLabel>
        </div>
      </div>

      <!-- Rules -->
      <div v-show="tab === 'rules'" class="space-y-4">
        <UiSwitch
          v-model="form.requiresApproval"
          :disabled="approvalForced"
          label="La administración aprueba cada reserva"
          :description="
            approvalForced
              ? 'Obligatorio: hay dinero que se paga antes (tarifa anticipada o depósito) y alguien debe verificarlo.'
              : 'Sin aprobación, las reservas sin pago anticipado quedan confirmadas al instante.'
          "
        />
        <UiSwitch
          v-model="form.allowDelinquent"
          label="Pueden reservar unidades en mora"
          description="Apagado: una unidad con saldo vencido no puede reservar desde el portal."
        />
        <UiSwitch
          v-model="form.allowGuests"
          label="Se puede reservar a nombre de un invitado"
          description="Un residente reserva para alguien que no vive en el conjunto; la unidad responde por la reserva."
        />
        <div class="grid gap-4 pt-2 sm:grid-cols-2">
          <UiLabel title="Anticipación mínima (horas)" :error="errors['rules.minNoticeHours']">
            <UiInput v-model="form.minNoticeHours" type="number" min="1" placeholder="Sin mínimo" />
          </UiLabel>
          <UiLabel title="Reservar hasta con (días)" :error="errors['rules.maxDaysAhead']">
            <UiInput v-model="form.maxDaysAhead" type="number" min="1" max="365" />
          </UiLabel>
          <UiLabel
            title="Reservas futuras por unidad"
            help-text="Activas al mismo tiempo"
            :error="errors['rules.maxActivePerUnit']"
          >
            <UiInput
              v-model="form.maxActivePerUnit"
              type="number"
              min="1"
              placeholder="Sin límite"
            />
          </UiLabel>
          <UiLabel title="Reservas por unidad al mes" :error="errors['rules.maxPerMonthPerUnit']">
            <UiInput
              v-model="form.maxPerMonthPerUnit"
              type="number"
              min="1"
              placeholder="Sin límite"
            />
          </UiLabel>
          <UiLabel
            title="Cancelación desde el portal"
            help-text="Horas antes del inicio. Después, solo la administración cancela."
            :error="errors['rules.cancelHours']"
          >
            <UiInput
              v-model="form.cancelHours"
              type="number"
              min="1"
              placeholder="Hasta que empiece"
            />
          </UiLabel>
        </div>
        <p class="text-xs text-neutral-500">
          La administración puede reservar sin estas restricciones; el calendario y el aseo entre
          reservas aplican siempre.
        </p>
      </div>

      <!-- Terms -->
      <div v-show="tab === 'terms'" class="space-y-2">
        <UiLabel
          title="Reglamento de uso"
          help-text="Si lo escribes, el residente debe aceptarlo al reservar"
          :error="errors.terms"
        >
          <UiTextarea
            v-model="form.terms"
            rows="10"
            maxlength="10000"
            block
            placeholder="Horario de música, aseo al entregar, número de invitados, uso de la cocina…"
          />
        </UiLabel>
      </div>

      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UiButton variant="ghost" :disabled="saving" @click="open = false">Cancelar</UiButton>
          <UiButton type="submit" color="primary" :loading="saving">
            {{ amenity ? 'Guardar' : 'Crear zona' }}
          </UiButton>
        </div>
      </template>
    </UiForm>
  </UiModal>
</template>
