<script setup lang="ts">
import { ref, watch } from 'vue'
import { DuiAlert, DuiButton, DuiModal, DuiSkeleton, useToast } from '@dronico/droni-kit'
import type { Bill } from '@aptoph/shared'
import StatusBadge from '@/components/finance/StatusBadge.vue'
import ReasonDialog from '@/components/finance/ReasonDialog.vue'
import { financeApi } from '@/api/finance'
import { errorMessage } from '@/lib/errors'
import { formatAmount, formatDate, formatMoney } from '@/lib/format'
import { useTenantStore } from '@/stores/tenant'

const props = defineProps<{ billId: string | null }>()
const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ changed: []; pay: [Bill] }>()
const tenant = useTenantStore()
const toast = useToast()

const bill = ref<Bill | null>(null)
const error = ref<string | null>(null)
const cancelOpen = ref(false)
const busy = ref(false)

async function load() {
  if (!props.billId) return
  bill.value = null
  error.value = null
  try {
    bill.value = (await financeApi.bill(props.billId)).data
  } catch (e) {
    error.value = errorMessage(e)
  }
}
watch(open, (isOpen) => isOpen && load())

async function cancel(reason: string) {
  busy.value = true
  try {
    await financeApi.cancelBill(props.billId!, reason)
    toast.success('Factura anulada')
    cancelOpen.value = false
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
    :title="bill ? `Factura ${bill.number ?? 'sin número'}` : 'Factura'"
    size="md"
    scrollable
  >
    <DuiAlert v-if="error" color="danger" variant="soft">{{ error }}</DuiAlert>
    <DuiSkeleton v-else-if="!bill" class="h-48 rounded-xl" />
    <div v-else class="flex flex-col gap-5 text-sm">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-base font-semibold">{{ bill.vendor?.name }}</p>
          <p class="text-neutral-500">{{ bill.description }}</p>
        </div>
        <StatusBadge kind="bill" :status="bill.status" />
      </div>
      <dl
        class="grid grid-cols-2 gap-3 rounded-xl bg-neutral-50 p-4 sm:grid-cols-3 dark:bg-white/5"
      >
        <div>
          <dt class="text-neutral-500">Fecha</dt>
          <dd class="font-medium">{{ formatDate(bill.issuedOn) }}</dd>
        </div>
        <div>
          <dt class="text-neutral-500">Vence</dt>
          <dd class="font-medium">{{ formatDate(bill.dueOn) }}</dd>
        </div>
        <div>
          <dt class="text-neutral-500">Saldo</dt>
          <dd class="font-semibold tabular-nums">{{ formatMoney(bill.balance) }}</dd>
        </div>
      </dl>
      <table class="w-full">
        <tbody class="divide-y divide-neutral-100 dark:divide-white/10">
          <tr v-for="line in bill.lines" :key="line.id">
            <td class="py-1.5">
              <span class="tabular-nums">{{ line.account?.code }}</span> · {{ line.account?.name }}
              <span v-if="line.description" class="block text-xs text-neutral-500">{{
                line.description
              }}</span>
            </td>
            <td class="py-1.5 text-right tabular-nums">{{ formatMoney(line.amount) }}</td>
          </tr>
        </tbody>
        <tfoot class="text-neutral-600 dark:text-neutral-300">
          <tr v-if="Number(bill.taxAmount) > 0">
            <td class="pt-2">IVA</td>
            <td class="pt-2 text-right tabular-nums">{{ formatMoney(bill.taxAmount) }}</td>
          </tr>
          <tr class="font-semibold text-neutral-900 dark:text-white">
            <td class="pt-2">Total</td>
            <td class="pt-2 text-right tabular-nums">{{ formatMoney(bill.total) }}</td>
          </tr>
          <tr v-if="Number(bill.withholdingIncomeTax) > 0">
            <td>Retención en la fuente</td>
            <td class="text-right tabular-nums">−{{ formatAmount(bill.withholdingIncomeTax) }}</td>
          </tr>
          <tr v-if="Number(bill.withholdingVat) > 0">
            <td>Retención de IVA</td>
            <td class="text-right tabular-nums">−{{ formatAmount(bill.withholdingVat) }}</td>
          </tr>
          <tr v-if="Number(bill.withholdingIca) > 0">
            <td>Retención de ICA</td>
            <td class="text-right tabular-nums">−{{ formatAmount(bill.withholdingIca) }}</td>
          </tr>
          <tr class="font-semibold text-neutral-900 dark:text-white">
            <td class="pt-1">Neto a pagar</td>
            <td class="pt-1 text-right tabular-nums">{{ formatMoney(bill.netAmount) }}</td>
          </tr>
        </tfoot>
      </table>
      <section v-if="bill.payments?.length">
        <h3 class="mb-2 font-semibold">Pagos</h3>
        <ul class="divide-y divide-neutral-100 dark:divide-white/10">
          <li
            v-for="(item, i) in bill.payments"
            :key="i"
            class="flex justify-between py-2"
            :class="item.payment?.status === 'reversed' ? 'text-neutral-400 line-through' : ''"
          >
            <span>Egreso {{ item.payment?.number }} · {{ formatDate(item.payment?.paidOn) }}</span>
            <span class="tabular-nums">{{ formatMoney(item.amount) }}</span>
          </li>
        </ul>
      </section>
      <p v-if="bill.cancellationReason" class="text-neutral-600 dark:text-neutral-300">
        Anulada: {{ bill.cancellationReason }}
      </p>
    </div>
    <template v-if="bill && tenant.canManageFinance" #footer>
      <div class="flex flex-wrap justify-end gap-2">
        <DuiButton
          v-if="bill.status === 'pending'"
          variant="ghost"
          color="danger"
          @click="cancelOpen = true"
          >Anular</DuiButton
        >
        <DuiButton
          v-if="['pending', 'partially_paid'].includes(bill.status)"
          color="primary"
          @click="emit('pay', bill)"
          >Pagar</DuiButton
        >
      </div>
    </template>
  </DuiModal>
  <ReasonDialog
    v-model="cancelOpen"
    title="Anular factura"
    message="Se reversa la causación del gasto."
    confirm-label="Anular"
    :loading="busy"
    @confirm="cancel"
  />
</template>
