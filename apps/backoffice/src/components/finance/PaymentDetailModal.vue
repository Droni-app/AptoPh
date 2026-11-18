<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  DuiAlert,
  DuiButton,
  DuiLabel,
  DuiModal,
  DuiSelect,
  DuiSkeleton,
  useToast,
} from '@dronico/droni-kit'
import { PAYMENT_METHOD_LABELS, type FinancePayment } from '@aptoph/shared'
import StatusBadge from '@/components/finance/StatusBadge.vue'
import ReasonDialog from '@/components/finance/ReasonDialog.vue'
import { financeApi } from '@/api/finance'
import { useFinanceCatalog } from '@/composables/useFinanceCatalog'
import { errorMessage } from '@/lib/errors'
import { formatDateTime, formatMoney, formatPeriod, unitLabel } from '@/lib/format'
import { useTenantStore } from '@/stores/tenant'

const props = defineProps<{ paymentId: string | null }>()
const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ changed: [] }>()
const tenant = useTenantStore()
const toast = useToast()
const catalog = useFinanceCatalog()

const payment = ref<FinancePayment | null>(null)
const error = ref<string | null>(null)
const cashAccountId = ref('')
const rejectOpen = ref(false)
const reverseOpen = ref(false)
const busy = ref(false)

async function load() {
  if (!props.paymentId) return
  payment.value = null
  error.value = null
  try {
    await catalog.load()
    payment.value = (await financeApi.payment(props.paymentId)).data
    const kind = payment.value.method === 'cash' ? 'cash' : 'bank'
    cashAccountId.value =
      catalog.activeCashAccounts.value.find((account) => account.type === kind)?.id ?? ''
  } catch (e) {
    error.value = errorMessage(e)
  }
}
watch(open, (isOpen) => isOpen && load())

const cashOptions = computed(() =>
  catalog.activeCashAccounts.value.map((account) => ({ value: account.id, label: account.name })),
)

async function act(action: () => Promise<unknown>, message: string) {
  busy.value = true
  try {
    await action()
    toast.success(message)
    rejectOpen.value = false
    reverseOpen.value = false
    emit('changed')
    await load()
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    busy.value = false
  }
}
const confirm = () =>
  act(
    () => financeApi.confirmPayment(props.paymentId!, cashAccountId.value),
    'Pago confirmado y aplicado',
  )
const reject = (reason: string) =>
  act(() => financeApi.rejectPayment(props.paymentId!, reason), 'Pago rechazado')
const reverse = (reason: string) =>
  act(() => financeApi.reversePayment(props.paymentId!, reason), 'Pago reversado')
</script>

<template>
  <DuiModal
    v-model="open"
    :title="payment?.number ? `Recibo de caja ${payment.number}` : 'Pago reportado'"
    size="md"
    scrollable
  >
    <DuiAlert v-if="error" color="danger" variant="soft">{{ error }}</DuiAlert>
    <DuiSkeleton v-else-if="!payment" class="h-48 rounded-xl" />
    <div v-else class="flex flex-col gap-5 text-sm">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-2xl font-bold tabular-nums">{{ formatMoney(payment.amount) }}</p>
          <p class="text-neutral-500">{{ unitLabel(payment.unit) }}</p>
        </div>
        <StatusBadge kind="payment" :status="payment.status" />
      </div>
      <dl class="grid grid-cols-2 gap-3 rounded-xl bg-neutral-50 p-4 dark:bg-white/5">
        <div>
          <dt class="text-neutral-500">Fecha</dt>
          <dd class="font-medium">{{ formatDateTime(payment.paidAt) }}</dd>
        </div>
        <div>
          <dt class="text-neutral-500">Medio</dt>
          <dd class="font-medium">{{ PAYMENT_METHOD_LABELS[payment.method] }}</dd>
        </div>
        <div>
          <dt class="text-neutral-500">Referencia</dt>
          <dd class="font-medium">{{ payment.reference ?? '—' }}</dd>
        </div>
        <div>
          <dt class="text-neutral-500">Entró a</dt>
          <dd class="font-medium">{{ payment.cashAccount?.name ?? '—' }}</dd>
        </div>
        <div>
          <dt class="text-neutral-500">Registrado por</dt>
          <dd class="font-medium">{{ payment.registeredBy ?? '—' }}</dd>
        </div>
        <div v-if="Number(payment.unappliedAmount) > 0">
          <dt class="text-neutral-500">Saldo a favor</dt>
          <dd class="font-medium tabular-nums">{{ formatMoney(payment.unappliedAmount) }}</dd>
        </div>
      </dl>
      <p v-if="payment.notes" class="whitespace-pre-line">{{ payment.notes }}</p>
      <DuiAlert v-if="payment.rejectionReason" color="danger" variant="soft"
        >Rechazado: {{ payment.rejectionReason }}</DuiAlert
      >
      <DuiAlert v-if="payment.reversalReason" color="warning" variant="soft">
        Reversado el {{ formatDateTime(payment.reversedAt) }}: {{ payment.reversalReason }}
      </DuiAlert>

      <section v-if="payment.allocations?.length">
        <h3 class="mb-2 font-semibold">Aplicado a</h3>
        <ul class="divide-y divide-neutral-100 dark:divide-white/10">
          <li
            v-for="(allocation, i) in payment.allocations"
            :key="i"
            class="flex justify-between gap-3 py-2"
          >
            <span
              >{{ allocation.charge?.concept?.name }} ·
              {{ allocation.charge ? formatPeriod(allocation.charge.period) : '' }}</span
            >
            <span class="tabular-nums">{{ formatMoney(allocation.amount) }}</span>
          </li>
        </ul>
      </section>

      <div
        v-if="payment.status === 'pending_review' && tenant.canManageFinance"
        class="rounded-xl p-4 ring-1 ring-amber-300 dark:ring-amber-400/40"
      >
        <p class="mb-3">
          El residente reportó este pago. Verifica que el dinero esté en la cuenta antes de
          confirmarlo.
        </p>
        <DuiLabel title="Entró a">
          <DuiSelect v-model="cashAccountId" :options="cashOptions" block />
        </DuiLabel>
      </div>
    </div>
    <template v-if="payment && tenant.canManageFinance" #footer>
      <div class="flex flex-wrap justify-end gap-2">
        <template v-if="payment.status === 'pending_review'">
          <DuiButton variant="ghost" color="danger" :disabled="busy" @click="rejectOpen = true"
            >Rechazar</DuiButton
          >
          <DuiButton color="primary" :loading="busy" :disabled="!cashAccountId" @click="confirm"
            >Confirmar y aplicar</DuiButton
          >
        </template>
        <DuiButton
          v-else-if="payment.status === 'confirmed'"
          variant="ghost"
          color="danger"
          @click="reverseOpen = true"
          >Reversar pago</DuiButton
        >
      </div>
    </template>
  </DuiModal>

  <ReasonDialog
    v-model="rejectOpen"
    title="Rechazar pago"
    message="El residente verá el motivo."
    confirm-label="Rechazar"
    :loading="busy"
    placeholder="No aparece en el extracto bancario"
    @confirm="reject"
  />
  <ReasonDialog
    v-model="reverseOpen"
    title="Reversar pago"
    message="Los cobros vuelven a quedar pendientes y se anula el ingreso del dinero. Úsalo para cheques devueltos o pagos mal registrados."
    confirm-label="Reversar"
    :loading="busy"
    placeholder="Cheque devuelto por fondos insuficientes"
    @confirm="reverse"
  />
</template>
