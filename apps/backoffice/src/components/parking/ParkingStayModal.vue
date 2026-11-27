<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  UiAlert,
  UiBadge,
  UiButton,
  UiInput,
  UiLabel,
  UiModal,
  UiRadio,
  UiSelect,
  UiSkeleton,
  UiSwitch,
  UiTextarea,
  useToast,
} from '@aptoph/ui'
import {
  PARKING_AUTHORIZATION_LABELS,
  PARKING_GATE_METHODS,
  PARKING_SETTLEMENT_LABELS,
  PAYMENT_METHOD_LABELS,
  VEHICLE_TYPE_ICONS,
  VEHICLE_TYPE_LABELS,
  formatMinutes,
  type ParkingGateMethod,
  type ParkingPaymentMode,
  type ParkingStay,
} from '@aptoph/shared'
import { visitorParkingApi } from '@/api/visitorParking'
import { errorMessage, fieldErrors } from '@/lib/errors'
import { formatDateTime, formatMoney } from '@/lib/format'

const props = defineProps<{ stayId: string | null; paymentMode: ParkingPaymentMode }>()
const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ changed: [] }>()
const toast = useToast()

const stay = ref<ParkingStay | null>(null)
const error = ref<string | null>(null)
const errors = ref<Record<string, string>>({})
const busy = ref(false)

const exempt = ref(false)
const exemptReason = ref('')
const chargeTo = ref<'gate' | 'unit'>('gate')
const method = ref<ParkingGateMethod>('cash')
const sendReceipt = ref(false)
const email = ref('')

async function load() {
  if (!props.stayId) return
  error.value = null
  try {
    stay.value = (await visitorParkingApi.stay(props.stayId)).data
  } catch (e) {
    error.value = errorMessage(e)
  }
}
watch(open, (isOpen) => {
  if (!isOpen) return
  stay.value = null
  errors.value = {}
  exempt.value = false
  exemptReason.value = ''
  chargeTo.value = props.paymentMode === 'unit' ? 'unit' : 'gate'
  method.value = 'cash'
  sendReceipt.value = false
  email.value = ''
  load()
})

const inside = computed(() => stay.value?.status === 'inside')
const total = computed(() => (exempt.value ? 0 : (stay.value?.quote.total ?? 0)))
const settlementColor = (value: ParkingStay['settlement']) =>
  value === 'gate'
    ? 'success'
    : value === 'unit'
      ? 'primary'
      : value === 'exempt'
        ? 'warning'
        : 'neutral'
const methodOptions = PARKING_GATE_METHODS.map((value) => ({
  value,
  label: PAYMENT_METHOD_LABELS[value],
}))
const chargeOptions = [
  { value: 'gate', label: 'Paga en portería' },
  { value: 'unit', label: 'Cargar a la unidad' },
]
const unitLabel = computed(() => {
  const unit = stay.value?.unit
  return unit ? [unit.building?.name, unit.code].filter(Boolean).join(' · ') : ''
})

async function exit() {
  if (!stay.value) return
  busy.value = true
  errors.value = {}
  try {
    const { data } = await visitorParkingApi.exit(stay.value.id, {
      exempt: exempt.value || undefined,
      exemptReason: exempt.value ? exemptReason.value : null,
      paymentMode: props.paymentMode === 'ask' && total.value > 0 ? chargeTo.value : undefined,
      paymentMethod:
        total.value > 0 &&
        !exempt.value &&
        (props.paymentMode === 'gate' || chargeTo.value === 'gate')
          ? method.value
          : undefined,
      receiptEmail: sendReceipt.value ? email.value : null,
    })
    stay.value = data
    toast.success(
      data.receiptSentAt
        ? `Salida registrada. Comprobante enviado a ${data.receiptEmail}`
        : 'Salida registrada',
    )
    emit('changed')
  } catch (e) {
    errors.value = fieldErrors(e)
    toast.error(errorMessage(e))
    await load()
  } finally {
    busy.value = false
  }
}

async function resend() {
  if (!stay.value || !email.value) return
  busy.value = true
  errors.value = {}
  try {
    stay.value = (await visitorParkingApi.sendReceipt(stay.value.id, email.value)).data
    toast.success(`Comprobante enviado a ${email.value}`)
    email.value = ''
  } catch (e) {
    errors.value = fieldErrors(e)
    toast.error(errorMessage(e))
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <UiModal
    v-model="open"
    :title="
      stay
        ? inside
          ? `Dar salida · ${stay.plate ?? VEHICLE_TYPE_LABELS[stay.vehicleType]}`
          : `Comprobante N.º ${stay.number}`
        : 'Vehículo'
    "
    size="lg"
    scrollable
    :persistent="busy"
  >
    <UiAlert v-if="error" color="danger" variant="soft">{{ error }}</UiAlert>
    <UiSkeleton v-else-if="!stay" class="h-72 rounded-xl" />
    <div v-else class="flex flex-col gap-5 text-sm">
      <!-- Vehicle and visit -->
      <div class="flex items-start gap-3">
        <span
          class="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-50 text-2xl text-brand-700 dark:bg-brand-400/15 dark:text-brand-200"
        >
          <i class="mdi" :class="VEHICLE_TYPE_ICONS[stay.vehicleType]" aria-hidden="true" />
        </span>
        <div class="min-w-0 flex-1">
          <p class="flex flex-wrap items-center gap-2">
            <span class="font-mono text-lg font-bold">{{
              stay.plate ?? stay.vehicleDescription
            }}</span>
            <span v-if="stay.plate && stay.vehicleDescription" class="text-neutral-500">{{
              stay.vehicleDescription
            }}</span>
            <UiBadge v-if="stay.isOverstay" label="Excedido" color="danger" size="sm" />
            <UiBadge v-if="stay.overCapacity" label="Sin cupo" color="warning" size="sm" />
            <UiBadge
              v-if="stay.settlement"
              :label="PARKING_SETTLEMENT_LABELS[stay.settlement]"
              :color="settlementColor(stay.settlement)"
              size="sm"
            />
          </p>
          <p class="text-neutral-500">
            {{ stay.visitorName
            }}<template v-if="stay.visitorDocument"> · {{ stay.visitorDocument }}</template> ·
            visita {{ unitLabel }}
          </p>
        </div>
      </div>

      <dl
        class="grid grid-cols-1 gap-3 rounded-xl bg-neutral-50 p-4 sm:grid-cols-2 dark:bg-white/5"
      >
        <div>
          <dt class="text-xs text-neutral-500">Ingreso</dt>
          <dd class="font-medium">{{ formatDateTime(stay.enteredAt) }}</dd>
          <dd class="text-xs text-neutral-500">Registró {{ stay.enteredBy?.fullName ?? '—' }}</dd>
        </div>
        <div>
          <dt class="text-xs text-neutral-500">Salida</dt>
          <dd class="font-medium">
            {{ stay.exitedAt ? formatDateTime(stay.exitedAt) : 'Adentro' }}
          </dd>
          <dd v-if="stay.exitedBy" class="text-xs text-neutral-500">
            Registró {{ stay.exitedBy.fullName }}
          </dd>
        </div>
        <div class="sm:col-span-2">
          <dt class="text-xs text-neutral-500">Autorización</dt>
          <dd class="font-medium">
            {{ PARKING_AUTHORIZATION_LABELS[stay.authorization]
            }}<template v-if="stay.authorizedByName"> · {{ stay.authorizedByName }}</template>
          </dd>
          <dd v-if="stay.authorizationNotes" class="text-xs whitespace-pre-line text-neutral-500">
            {{ stay.authorizationNotes }}
          </dd>
        </div>
      </dl>

      <!-- Price -->
      <section aria-label="Cobro">
        <h3 class="mb-2 font-semibold">{{ inside ? 'Si sale ahora' : 'Cobro' }}</h3>
        <table class="w-full">
          <tbody class="divide-y divide-neutral-100 dark:divide-white/10">
            <tr v-for="day in stay.quote.days" :key="day.date">
              <td class="py-1.5 text-neutral-500">{{ day.date }}</td>
              <td class="py-1.5 text-right tabular-nums">{{ formatMinutes(day.minutes) }}</td>
              <td class="py-1.5 text-right text-neutral-500 tabular-nums">
                <template v-if="day.graceMinutes"
                  >−{{ formatMinutes(day.graceMinutes) }} gratis</template
                >
              </td>
              <td class="py-1.5 text-right tabular-nums">{{ formatMinutes(day.billedMinutes) }}</td>
              <td class="py-1.5 text-right font-medium tabular-nums">
                {{ formatMoney(day.amount) }}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr v-if="stay.quote.vat > 0">
              <td colspan="4" class="pt-2 text-right text-neutral-500">
                Base {{ formatMoney(stay.quote.base) }} · IVA {{ stay.tariff.vatRate }} %
              </td>
              <td class="pt-2 text-right text-neutral-500 tabular-nums">
                {{ formatMoney(stay.quote.vat) }}
              </td>
            </tr>
            <tr>
              <td colspan="4" class="pt-2 text-right font-semibold">Total</td>
              <td class="pt-2 text-right text-lg font-bold tabular-nums">
                {{ formatMoney(inside ? total : stay.quote.total) }}
              </td>
            </tr>
          </tfoot>
        </table>
        <p class="mt-1 text-xs text-neutral-500">
          Tarifa {{ formatMoney(stay.tariff.hourlyRate) }}/h, fracción de
          {{ stay.tariff.fractionMinutes }} min,
          {{ formatMinutes(stay.tariff.graceMinutes) }} gratis por día<template
            v-if="stay.tariff.dailyCap !== null"
            >, tope {{ formatMoney(stay.tariff.dailyCap) }}/día</template
          >.
        </p>
        <p v-if="!inside && stay.paymentMethod" class="mt-1 text-xs text-neutral-500">
          Medio de pago: {{ PAYMENT_METHOD_LABELS[stay.paymentMethod] }}
        </p>
        <p v-if="stay.exemptReason" class="mt-1 text-xs text-neutral-500">
          Exento: {{ stay.exemptReason }}
        </p>
      </section>

      <!-- Exit -->
      <section v-if="inside" class="flex flex-col gap-4" aria-label="Salida">
        <UiSwitch
          v-model="exempt"
          label="Exento de cobro"
          description="Queda registrado con el motivo."
        />
        <UiLabel v-if="exempt" title="Motivo" required :error="errors.exemptReason">
          <UiTextarea v-model="exemptReason" rows="2" maxlength="300" block />
        </UiLabel>
        <template v-if="total > 0">
          <UiLabel v-if="paymentMode === 'ask'" title="¿Quién paga?" :error="errors.paymentMode">
            <UiRadio
              v-model="chargeTo"
              :options="chargeOptions"
              orientation="horizontal"
              name="chargeTo"
            />
          </UiLabel>
          <UiAlert
            v-if="paymentMode === 'unit' || chargeTo === 'unit'"
            color="primary"
            variant="soft"
          >
            Se cargará {{ formatMoney(total) }} a la cuenta de {{ unitLabel }}.
          </UiAlert>
          <UiLabel v-else title="Medio de pago" :error="errors.paymentMethod" class="max-w-xs">
            <UiSelect v-model="method" :options="methodOptions" block />
          </UiLabel>
        </template>
        <UiSwitch v-model="sendReceipt" label="Enviar comprobante por correo" />
        <UiLabel v-if="sendReceipt" title="Correo del visitante" :error="errors.receiptEmail">
          <UiInput v-model="email" type="email" maxlength="254" placeholder="correo@ejemplo.com" />
        </UiLabel>
      </section>

      <!-- Receipt -->
      <section v-else class="flex flex-col gap-2" aria-label="Comprobante">
        <p v-if="stay.receiptSentAt" class="text-neutral-500">
          Comprobante enviado a {{ stay.receiptEmail }} el {{ formatDateTime(stay.receiptSentAt) }}.
        </p>
        <form class="flex flex-wrap items-end gap-2" @submit.prevent="resend">
          <UiLabel
            :title="stay.receiptSentAt ? 'Reenviar comprobante' : 'Enviar comprobante'"
            :error="errors.email"
            class="min-w-60 flex-1"
          >
            <UiInput v-model="email" type="email" required placeholder="correo@ejemplo.com" />
          </UiLabel>
          <UiButton type="submit" variant="outline" :loading="busy">Enviar</UiButton>
        </form>
      </section>
    </div>

    <template v-if="stay && inside" #footer>
      <div class="flex w-full justify-end gap-2">
        <UiButton variant="ghost" :disabled="busy" @click="open = false">Cancelar</UiButton>
        <UiButton color="primary" :loading="busy" @click="exit">
          Dar salida{{ total > 0 ? ` · ${formatMoney(total)}` : '' }}
        </UiButton>
      </div>
    </template>
  </UiModal>
</template>
