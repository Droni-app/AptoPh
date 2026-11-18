<script setup lang="ts">
import { ref, watch } from 'vue'
import { DuiAlert, DuiButton, DuiModal, DuiSkeleton, useToast } from '@dronico/droni-kit'
import { PAYMENT_METHOD_LABELS, type VendorPayment } from '@aptoph/shared'
import StatusBadge from '@/components/finance/StatusBadge.vue'
import ReasonDialog from '@/components/finance/ReasonDialog.vue'
import { financeApi } from '@/api/finance'
import { errorMessage } from '@/lib/errors'
import { formatDate, formatMoney } from '@/lib/format'
import { useTenantStore } from '@/stores/tenant'

const props = defineProps<{ paymentId: string | null }>()
const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ changed: [] }>()
const tenant = useTenantStore()
const toast = useToast()

const payment = ref<VendorPayment | null>(null)
const error = ref<string | null>(null)
const reverseOpen = ref(false)
const busy = ref(false)

async function load() {
  if (!props.paymentId) return
  payment.value = null
  error.value = null
  try {
    payment.value = (await financeApi.vendorPayment(props.paymentId)).data
  } catch (e) {
    error.value = errorMessage(e)
  }
}
watch(open, (isOpen) => isOpen && load())

async function reverse(reason: string) {
  busy.value = true
  try {
    await financeApi.reverseVendorPayment(props.paymentId!, reason)
    toast.success('Egreso reversado: las facturas vuelven a quedar por pagar')
    reverseOpen.value = false
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
  <DuiModal
    v-model="open"
    :title="payment ? `Comprobante de egreso ${payment.number}` : 'Egreso'"
    size="md"
  >
    <DuiAlert v-if="error" color="danger" variant="soft">{{ error }}</DuiAlert>
    <DuiSkeleton v-else-if="!payment" class="h-40 rounded-xl" />
    <div v-else class="flex flex-col gap-5 text-sm">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-2xl font-bold tabular-nums">{{ formatMoney(payment.amount) }}</p>
          <p class="text-neutral-500">{{ payment.vendor?.name }}</p>
        </div>
        <StatusBadge kind="vendorPayment" :status="payment.status" />
      </div>
      <dl class="grid grid-cols-2 gap-3 rounded-xl bg-neutral-50 p-4 dark:bg-white/5">
        <div>
          <dt class="text-neutral-500">Fecha</dt>
          <dd class="font-medium">{{ formatDate(payment.paidOn) }}</dd>
        </div>
        <div>
          <dt class="text-neutral-500">Desde</dt>
          <dd class="font-medium">{{ payment.cashAccount?.name }}</dd>
        </div>
        <div>
          <dt class="text-neutral-500">Medio</dt>
          <dd class="font-medium">{{ PAYMENT_METHOD_LABELS[payment.method] }}</dd>
        </div>
        <div>
          <dt class="text-neutral-500">Referencia</dt>
          <dd class="font-medium">{{ payment.reference ?? '—' }}</dd>
        </div>
      </dl>
      <section v-if="payment.bills?.length">
        <h3 class="mb-2 font-semibold">Facturas pagadas</h3>
        <ul class="divide-y divide-neutral-100 dark:divide-white/10">
          <li v-for="(item, i) in payment.bills" :key="i" class="flex justify-between gap-3 py-2">
            <span>{{ item.bill?.number ?? 'Sin número' }} · {{ item.bill?.description }}</span>
            <span class="tabular-nums">{{ formatMoney(item.amount) }}</span>
          </li>
        </ul>
      </section>
      <p v-if="payment.notes">{{ payment.notes }}</p>
      <DuiAlert v-if="payment.reversalReason" color="warning" variant="soft"
        >Reversado: {{ payment.reversalReason }}</DuiAlert
      >
    </div>
    <template v-if="payment?.status === 'confirmed' && tenant.canManageFinance" #footer>
      <div class="flex justify-end">
        <DuiButton variant="ghost" color="danger" @click="reverseOpen = true"
          >Reversar egreso</DuiButton
        >
      </div>
    </template>
  </DuiModal>
  <ReasonDialog
    v-model="reverseOpen"
    title="Reversar egreso"
    message="El dinero vuelve a la cuenta y las facturas quedan otra vez por pagar."
    confirm-label="Reversar"
    :loading="busy"
    @confirm="reverse"
  />
</template>
