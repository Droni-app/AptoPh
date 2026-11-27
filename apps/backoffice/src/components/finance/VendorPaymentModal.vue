<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  UiAlert,
  UiButton,
  UiForm,
  UiInput,
  UiLabel,
  UiModal,
  UiSelect,
  useToast,
} from '@aptoph/ui'
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  type Bill,
  type PaymentMethod,
  type Vendor,
} from '@aptoph/shared'
import { financeApi } from '@/api/finance'
import AttachmentPicker from '@/components/attachments/AttachmentPicker.vue'
import { uploadAttachments, warnFailedUploads } from '@/lib/attachments'
import { useFinanceCatalog } from '@/composables/useFinanceCatalog'
import { errorMessage, fieldErrors } from '@/lib/errors'
import { formatDate, formatMoney, parseAmount, todayInput } from '@/lib/format'

const props = defineProps<{ vendors: Vendor[]; vendorId?: string | null; billId?: string | null }>()
const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ saved: [] }>()
const toast = useToast()
const catalog = useFinanceCatalog()

const form = ref({
  vendorId: '',
  cashAccountId: '',
  paidOn: todayInput(),
  method: 'bank_transfer' as PaymentMethod,
  reference: '',
  notes: '',
})
const bills = ref<Bill[]>([])
const amounts = ref<Record<string, string>>({})
const errors = ref<Record<string, string>>({})
const error = ref<string | null>(null)
const saving = ref(false)
/** Supports picked before saving, uploaded once the record exists */
const files = ref<File[]>([])
watch(open, (isOpen) => {
  if (isOpen) files.value = []
})

watch(open, async (isOpen) => {
  if (!isOpen) return
  await catalog.load()
  form.value = {
    vendorId: props.vendorId ?? '',
    cashAccountId: catalog.activeCashAccounts.value.find((a) => a.type === 'bank')?.id ?? '',
    paidOn: todayInput(),
    method: 'bank_transfer',
    reference: '',
    notes: '',
  }
  errors.value = {}
  error.value = null
  await loadBills()
})

async function loadBills() {
  bills.value = []
  amounts.value = {}
  if (!form.value.vendorId) return
  const { data } = await financeApi.bills({
    vendorId: form.value.vendorId,
    status: 'open',
    perPage: 100,
  })
  bills.value = [...data].sort((a, b) => a.dueOn.localeCompare(b.dueOn))
  for (const bill of bills.value) {
    amounts.value[bill.id] =
      !props.billId || props.billId === bill.id ? String(Number(bill.balance)) : ''
  }
}
watch(() => form.value.vendorId, loadBills)

const vendorOptions = computed(() => [
  { value: '', label: 'Selecciona un proveedor' },
  ...props.vendors
    .filter((v) => Number(v.balance ?? 0) > 0 || v.id === form.value.vendorId)
    .map((v) => ({ value: v.id, label: `${v.name} · debe ${formatMoney(v.balance)}` })),
])
const cashOptions = computed(() =>
  catalog.activeCashAccounts.value.map((a) => ({
    value: a.id,
    label: `${a.name} · ${formatMoney(a.balance)}`,
  })),
)
const methodOptions = PAYMENT_METHODS.map((value) => ({
  value,
  label: PAYMENT_METHOD_LABELS[value],
}))
const total = computed(() =>
  Object.values(amounts.value).reduce((sum, value) => sum + (parseAmount(value) || 0), 0),
)
const vendor = computed(() => props.vendors.find((v) => v.id === form.value.vendorId))

async function submit() {
  saving.value = true
  errors.value = {}
  error.value = null
  try {
    const { data } = await financeApi.payVendor({
      ...form.value,
      reference: form.value.reference || null,
      notes: form.value.notes || null,
      allocations: Object.entries(amounts.value)
        .filter(([, value]) => parseAmount(value) > 0)
        .map(([billId, value]) => ({ billId, amount: parseAmount(value) })),
    })
    const failed = await uploadAttachments('vendor_payment', data.id, files.value)
    toast.success(`Comprobante de egreso ${data.number} por ${formatMoney(data.amount)}`)
    warnFailedUploads(toast, failed)
    emit('saved')
    open.value = false
  } catch (e) {
    errors.value = fieldErrors(e)
    error.value = errorMessage(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UiModal
    v-model="open"
    title="Pagar a proveedor"
    description="Genera el comprobante de egreso"
    size="lg"
    :persistent="saving"
    scrollable
  >
    <UiForm :loading="saving" @submit="submit">
      <UiAlert v-if="error" color="danger" variant="soft">{{ error }}</UiAlert>
      <UiLabel title="Proveedor" required :error="errors.vendorId">
        <UiSelect v-model="form.vendorId" :options="vendorOptions" block />
      </UiLabel>
      <p v-if="vendor?.bankAccountNumber" class="-mt-2 text-sm text-neutral-500">
        Cuenta {{ vendor.bankAccountKind === 'checking' ? 'corriente' : 'de ahorros' }}
        {{ vendor.bankName }} {{ vendor.bankAccountNumber }}
      </p>

      <div v-if="bills.length" class="rounded-lg ring-1 ring-neutral-200 dark:ring-white/10">
        <table class="w-full text-sm">
          <thead class="text-left text-xs text-neutral-500 uppercase">
            <tr>
              <th class="px-3 py-2 font-medium">Factura</th>
              <th class="px-3 py-2 font-medium">Vence</th>
              <th class="px-3 py-2 text-right font-medium">Saldo</th>
              <th class="w-36 px-3 py-2 text-right font-medium">A pagar</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-100 dark:divide-white/10">
            <tr v-for="bill in bills" :key="bill.id">
              <td class="px-3 py-1.5">
                {{ bill.number ?? 'Sin número' }}
                <span class="block max-w-56 truncate text-xs text-neutral-500">{{
                  bill.description
                }}</span>
              </td>
              <td class="px-3 py-1.5">{{ formatDate(bill.dueOn) }}</td>
              <td class="px-3 py-1.5 text-right tabular-nums">{{ formatMoney(bill.balance) }}</td>
              <td class="px-3 py-1.5">
                <input
                  v-model="amounts[bill.id]"
                  inputmode="decimal"
                  class="w-full rounded-md border border-neutral-300 px-2 py-1 text-right tabular-nums dark:border-white/15 dark:bg-neutral-900"
                  :aria-label="`Valor a pagar de ${bill.number ?? bill.description}`"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else-if="form.vendorId" class="text-sm text-neutral-500">
        Este proveedor no tiene facturas pendientes.
      </p>
      <p v-if="errors.allocations || errors.amount" class="text-sm text-coral-700">
        {{ errors.allocations ?? errors.amount }}
      </p>

      <div class="grid gap-4 sm:grid-cols-3">
        <UiLabel title="Pagado desde" required :error="errors.cashAccountId">
          <UiSelect v-model="form.cashAccountId" :options="cashOptions" block />
        </UiLabel>
        <UiLabel title="Fecha" required :error="errors.paidOn">
          <UiInput v-model="form.paidOn" type="date" required />
        </UiLabel>
        <UiLabel title="Medio">
          <UiSelect v-model="form.method" :options="methodOptions" block />
        </UiLabel>
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        <UiLabel title="Referencia" :error="errors.reference">
          <UiInput
            v-model="form.reference"
            maxlength="80"
            placeholder="N.º de transferencia o cheque"
          />
        </UiLabel>
        <UiLabel title="Notas" :error="errors.notes">
          <UiInput v-model="form.notes" maxlength="500" />
        </UiLabel>
      </div>
      <AttachmentPicker v-model="files" :disabled="saving" />
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UiButton variant="ghost" :disabled="saving" @click="open = false">Cancelar</UiButton>
          <UiButton type="submit" color="primary" :loading="saving" :disabled="total <= 0"
            >Pagar {{ total > 0 ? formatMoney(total) : '' }}</UiButton
          >
        </div>
      </template>
    </UiForm>
  </UiModal>
</template>
