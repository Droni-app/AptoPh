<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  UiAlert,
  UiButton,
  UiLabel,
  UiModal,
  UiRadio,
  UiSelect,
  UiSkeleton,
  UiTextarea,
  useToast,
} from '@aptoph/ui'
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  type BankStatementDetail,
  type BankStatementLine,
  type FinancePayment,
  type PaymentMethod,
  type ReconcileLineInput,
  type VendorPayment,
} from '@aptoph/shared'
import UnitPicker, { type PickedUnit } from '@/components/finance/UnitPicker.vue'
import { financeApi } from '@/api/finance'
import { errorMessage } from '@/lib/errors'
import { formatDate, formatDateTime, formatMoney, unitLabel } from '@/lib/format'

/**
 * Reconciles a movement by hand: money in → a new payment of a unit, an
 * existing receipt or a resident's report; money out → an egreso. Or ignore it
 * with a note (bank fees, interest, transfers between accounts…).
 */
const props = defineProps<{ line: BankStatementLine | null; cashAccountId: string | null }>()
const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ saved: [statement: BankStatementDetail] }>()
const toast = useToast()

type Mode = 'register' | 'payment' | 'egreso' | 'ignore'
const mode = ref<Mode>('register')
const unit = ref<PickedUnit | null>(null)
const method = ref<PaymentMethod>('bank_transfer')
const notes = ref('')
const note = ref('')
const candidates = ref<FinancePayment[] | null>(null)
const egresos = ref<VendorPayment[] | null>(null)
const picked = ref('')
const saving = ref(false)
const error = ref<string | null>(null)

const incoming = computed(() => Number(props.line?.amount ?? 0) > 0)
const modes = computed(() =>
  incoming.value
    ? [
        { value: 'register', label: 'Registrar el pago de una unidad' },
        { value: 'payment', label: 'Un recibo o un pago reportado que ya existe' },
        { value: 'ignore', label: 'No es un pago (ignorar con una nota)' },
      ]
    : [
        { value: 'egreso', label: 'Un comprobante de egreso' },
        { value: 'ignore', label: 'Comisión, impuesto u otro (ignorar con una nota)' },
      ],
)
const methodOptions = PAYMENT_METHODS.map((value) => ({
  value,
  label: PAYMENT_METHOD_LABELS[value],
}))

/** ±30 days around the movement */
function around(iso: string) {
  const date = new Date(`${iso}T12:00:00Z`)
  const shift = (days: number) =>
    new Date(date.getTime() + days * 86_400_000).toISOString().slice(0, 10)
  return { from: shift(-30), to: shift(30) }
}

async function loadCandidates() {
  const line = props.line
  if (!line) return
  const cents = Math.round(Math.abs(Number(line.amount)) * 100)
  const same = (amount: string) => Math.round(Number(amount) * 100) === cents
  try {
    if (incoming.value) {
      candidates.value = null
      const page = await financeApi.payments({ ...around(line.postedOn), perPage: 100, page: 1 })
      candidates.value = page.data.filter(
        (payment) =>
          same(payment.amount) &&
          (payment.status === 'pending_review' ||
            (payment.status === 'confirmed' && payment.cashAccount?.id === props.cashAccountId)),
      )
    } else {
      egresos.value = null
      const page = await financeApi.vendorPayments({ status: 'confirmed', page: 1 })
      egresos.value = page.data.filter(
        (egreso) => same(egreso.amount) && egreso.cashAccount?.id === props.cashAccountId,
      )
    }
  } catch (e) {
    error.value = errorMessage(e)
  }
}

watch(open, (isOpen) => {
  if (!isOpen) return
  mode.value = incoming.value ? 'register' : 'egreso'
  unit.value = null
  method.value = 'bank_transfer'
  notes.value = ''
  note.value = ''
  picked.value = ''
  error.value = null
  loadCandidates()
})
watch(mode, () => (picked.value = ''))

const input = computed<ReconcileLineInput | null>(() => {
  if (mode.value === 'register')
    return unit.value
      ? { action: 'register', unitId: unit.value.id, method: method.value, notes: notes.value || null }
      : null
  if (mode.value === 'payment') {
    const payment = candidates.value?.find((p) => p.id === picked.value)
    if (!payment) return null
    return {
      action: payment.status === 'pending_review' ? 'confirm' : 'link',
      paymentId: payment.id,
    }
  }
  if (mode.value === 'egreso')
    return picked.value ? { action: 'link_vendor_payment', vendorPaymentId: picked.value } : null
  return note.value.trim().length >= 3 ? { action: 'ignore', note: note.value.trim() } : null
})

async function save() {
  if (!props.line || !input.value) return
  saving.value = true
  error.value = null
  try {
    const result = (await financeApi.reconcileLine(props.line.id, input.value)).data
    toast.success(
      input.value.action === 'ignore' ? 'Movimiento ignorado' : 'Movimiento conciliado',
    )
    emit('saved', result.statement)
    open.value = false
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UiModal v-model="open" title="Conciliar movimiento" size="lg" scrollable>
    <div v-if="line" class="flex flex-col gap-5 text-sm">
      <div class="flex items-start justify-between gap-4 rounded-xl bg-neutral-50 p-4 dark:bg-white/5">
        <div>
          <p class="font-medium">{{ line.description || 'Sin descripción' }}</p>
          <p class="text-neutral-500">
            {{ formatDate(line.postedOn) }}
            <template v-if="line.reference"> · Ref. {{ line.reference }}</template>
          </p>
        </div>
        <p
          :class="[
            'text-xl font-bold tabular-nums',
            incoming ? 'text-mint-700 dark:text-mint-300' : 'text-coral-700 dark:text-coral-300',
          ]"
        >
          {{ formatMoney(line.amount) }}
        </p>
      </div>

      <UiRadio v-model="mode" :options="modes" name="reconcileMode" />

      <template v-if="mode === 'register'">
        <UiLabel title="Unidad">
          <p v-if="unit" class="flex items-center justify-between gap-2">
            <span class="font-medium">{{ unit.label }}</span>
            <UiButton size="sm" variant="ghost" @click="unit = null">Cambiar</UiButton>
          </p>
          <UnitPicker v-else autofocus @pick="unit = $event" />
        </UiLabel>
        <UiLabel title="Medio de pago">
          <UiSelect v-model="method" :options="methodOptions" block />
        </UiLabel>
        <UiLabel title="Observaciones (opcional)">
          <UiTextarea v-model="notes" :rows="2" maxlength="255" />
        </UiLabel>
        <p class="text-neutral-500">
          Se crea el recibo de caja con la fecha del extracto, entra a esta cuenta y se aplica a
          los cobros de la unidad. El residente recibe la notificación.
        </p>
      </template>

      <template v-else-if="mode === 'payment'">
        <UiSkeleton v-if="candidates === null" class="h-24 rounded-xl" />
        <p v-else-if="!candidates.length" class="text-neutral-500">
          No hay recibos de esta cuenta ni pagos reportados por
          {{ formatMoney(line.amount) }} cerca de esa fecha.
        </p>
        <UiRadio
          v-else
          v-model="picked"
          name="reconcilePayment"
          :options="
            candidates.map((payment) => ({
              value: payment.id,
              label: `${payment.number ? `Recibo ${payment.number}` : 'Pago reportado'} · ${unitLabel(payment.unit)} · ${formatDateTime(payment.paidAt)}${payment.reference ? ` · Ref. ${payment.reference}` : ''} (${PAYMENT_STATUS_LABELS[payment.status]})`,
            }))
          "
        />
        <p class="text-neutral-500">
          Un pago reportado por el residente se confirma con esta cuenta al conciliarlo.
        </p>
      </template>

      <template v-else-if="mode === 'egreso'">
        <UiSkeleton v-if="egresos === null" class="h-24 rounded-xl" />
        <p v-else-if="!egresos.length" class="text-neutral-500">
          No hay egresos de esta cuenta por {{ formatMoney(String(-Number(line.amount))) }}.
        </p>
        <UiRadio
          v-else
          v-model="picked"
          name="reconcileEgreso"
          :options="
            egresos.map((egreso) => ({
              value: egreso.id,
              label: `Egreso ${egreso.number} · ${egreso.vendor?.name ?? ''} · ${formatDate(egreso.paidOn)}`,
            }))
          "
        />
      </template>

      <UiLabel v-else title="Nota">
        <UiTextarea
          v-model="note"
          :rows="2"
          maxlength="255"
          placeholder="Comisión de manejo de la cuenta"
        />
      </UiLabel>

      <UiAlert v-if="error" color="danger" variant="soft">{{ error }}</UiAlert>
    </div>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UiButton variant="ghost" @click="open = false">Cancelar</UiButton>
        <UiButton color="primary" :loading="saving" :disabled="!input" @click="save"
          >Conciliar</UiButton
        >
      </div>
    </template>
  </UiModal>
</template>
