<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  DuiAlert,
  DuiButton,
  DuiInput,
  DuiLabel,
  DuiModal,
  DuiSkeleton,
  useToast,
} from '@dronico/droni-kit'
import {
  CHARGE_ADJUSTMENT_TYPE_LABELS,
  CHARGE_SOURCE_LABELS,
  PAYMENT_METHOD_LABELS,
  type FinanceChargeDetail,
} from '@aptoph/shared'
import StatusBadge from '@/components/finance/StatusBadge.vue'
import ReasonDialog from '@/components/finance/ReasonDialog.vue'
import { financeApi } from '@/api/finance'
import { errorMessage } from '@/lib/errors'
import {
  formatDate,
  formatDateTime,
  formatMoney,
  formatPeriod,
  parseAmount,
  unitLabel,
} from '@/lib/format'
import { useTenantStore } from '@/stores/tenant'

const props = defineProps<{ chargeId: string | null }>()
const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ changed: [] }>()
const tenant = useTenantStore()
const toast = useToast()

const charge = ref<FinanceChargeDetail | null>(null)
const error = ref<string | null>(null)
const cancelOpen = ref(false)
const noteOpen = ref(false)
const noteAmount = ref('')
const busy = ref(false)

async function load() {
  if (!props.chargeId) return
  charge.value = null
  error.value = null
  try {
    charge.value = (await financeApi.charge(props.chargeId)).data
  } catch (e) {
    error.value = errorMessage(e)
  }
}

watch(open, (isOpen) => isOpen && load())

const canCancel = computed(
  () =>
    charge.value &&
    charge.value.status === 'pending' &&
    charge.value.balance === charge.value.amount &&
    charge.value.payments.length === 0,
)
const canNote = computed(
  () => charge.value && ['pending', 'partially_paid'].includes(charge.value.status),
)

async function cancel(reason: string) {
  busy.value = true
  try {
    await financeApi.cancelCharge(props.chargeId!, reason)
    toast.success('Cobro anulado')
    cancelOpen.value = false
    emit('changed')
    await load()
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    busy.value = false
  }
}

async function creditNote(reason: string) {
  busy.value = true
  try {
    await financeApi.creditNote(props.chargeId!, parseAmount(noteAmount.value), reason)
    toast.success('Nota crédito aplicada')
    noteOpen.value = false
    emit('changed')
    await load()
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <DuiModal v-model="open" title="Detalle del cobro" size="md" scrollable>
    <DuiAlert v-if="error" color="danger" variant="soft">{{ error }}</DuiAlert>
    <DuiSkeleton v-else-if="!charge" class="h-48 rounded-xl" />
    <div v-else class="flex flex-col gap-5 text-sm">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-base font-semibold">{{ charge.concept?.name }}</p>
          <p class="text-neutral-500">
            {{ unitLabel(charge.unit) }} · {{ formatPeriod(charge.period) }}
          </p>
          <p v-if="charge.description" class="mt-1">{{ charge.description }}</p>
        </div>
        <StatusBadge kind="charge" :status="charge.status" />
      </div>
      <dl
        class="grid grid-cols-2 gap-3 rounded-xl bg-neutral-50 p-4 sm:grid-cols-4 dark:bg-white/5"
      >
        <div>
          <dt class="text-neutral-500">Valor</dt>
          <dd class="font-semibold tabular-nums">{{ formatMoney(charge.amount) }}</dd>
        </div>
        <div>
          <dt class="text-neutral-500">Saldo</dt>
          <dd class="font-semibold tabular-nums">{{ formatMoney(charge.balance) }}</dd>
        </div>
        <div>
          <dt class="text-neutral-500">Vence</dt>
          <dd class="font-semibold">{{ formatDate(charge.dueOn) }}</dd>
        </div>
        <div>
          <dt class="text-neutral-500">Origen</dt>
          <dd class="font-semibold">
            {{ charge.sourceType ? CHARGE_SOURCE_LABELS[charge.sourceType] : '—' }}
          </dd>
        </div>
      </dl>
      <p
        v-if="charge.discountUntil && Number(charge.discountAmount) > 0"
        class="text-neutral-600 dark:text-neutral-300"
      >
        Descuento por pronto pago de {{ formatMoney(charge.discountAmount) }} hasta el
        {{ formatDate(charge.discountUntil) }}.
      </p>
      <p v-if="charge.cancellationReason" class="text-neutral-600 dark:text-neutral-300">
        Anulado el {{ formatDateTime(charge.cancelledAt) }}: {{ charge.cancellationReason }}
      </p>

      <section v-if="charge.payments.length">
        <h3 class="mb-2 font-semibold">Pagos aplicados</h3>
        <ul class="divide-y divide-neutral-100 dark:divide-white/10">
          <li
            v-for="payment in charge.payments"
            :key="payment.id"
            class="flex justify-between py-2"
          >
            <span
              >Recibo {{ payment.number }} · {{ formatDateTime(payment.paidAt) }} ·
              {{ PAYMENT_METHOD_LABELS[payment.method] }}</span
            >
            <span class="tabular-nums">{{ formatMoney(payment.amount) }}</span>
          </li>
        </ul>
      </section>
      <section v-if="charge.adjustments?.length">
        <h3 class="mb-2 font-semibold">Ajustes</h3>
        <ul class="divide-y divide-neutral-100 dark:divide-white/10">
          <li
            v-for="adjustment in charge.adjustments"
            :key="adjustment.id"
            class="flex justify-between gap-4 py-2"
          >
            <span>
              {{ CHARGE_ADJUSTMENT_TYPE_LABELS[adjustment.type] }} ·
              {{ formatDateTime(adjustment.createdAt) }}
              <span v-if="adjustment.reason" class="block text-neutral-500">{{
                adjustment.reason
              }}</span>
            </span>
            <span class="tabular-nums">−{{ formatMoney(adjustment.amount) }}</span>
          </li>
        </ul>
      </section>
    </div>
    <template v-if="charge && tenant.canManageFinance" #footer>
      <div class="flex flex-wrap justify-end gap-2">
        <DuiButton
          v-if="canNote"
          variant="outline"
          @click="((noteAmount = String(Number(charge.balance))), (noteOpen = true))"
          >Nota crédito</DuiButton
        >
        <DuiButton v-if="canCancel" variant="ghost" color="danger" @click="cancelOpen = true"
          >Anular cobro</DuiButton
        >
      </div>
    </template>
  </DuiModal>

  <ReasonDialog
    v-model="cancelOpen"
    title="Anular cobro"
    message="El cobro deja de deberse y se reversa su causación. No se puede deshacer."
    confirm-label="Anular"
    :loading="busy"
    @confirm="cancel"
  />
  <ReasonDialog
    v-model="noteOpen"
    title="Nota crédito"
    message="Rebaja el saldo del cobro y el ingreso causado."
    confirm-label="Aplicar nota"
    color="primary"
    :loading="busy"
    placeholder="Ej.: descuento aprobado por el consejo, acta 14"
    @confirm="creditNote"
  >
    <DuiLabel
      title="Valor de la nota"
      required
      :help-text="charge ? `Saldo actual ${formatMoney(charge.balance)}` : undefined"
    >
      <DuiInput v-model="noteAmount" inputmode="decimal" required />
    </DuiLabel>
  </ReasonDialog>
</template>
