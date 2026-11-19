<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  DuiAlert,
  DuiButton,
  DuiForm,
  DuiInput,
  DuiLabel,
  DuiModal,
  DuiSelect,
  useToast,
} from '@dronico/droni-kit'
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, type PaymentMethod } from '@aptoph/shared'
import { residentApi } from '@/api/resident'
import ReceiptPicker from '@/components/payments/ReceiptPicker.vue'
import { uploadReceipts } from '@/lib/attachments'
import { useSubmit } from '@/composables/useSubmit'
import { formatMoney, todayInput } from '@/lib/format'

const props = defineProps<{ unitId: string; suggested?: string | null }>()
const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ saved: [] }>()

const { saving, errors, error, run, reset } = useSubmit()
const toast = useToast()
/** Receipts, uploaded once the report is saved */
const files = ref<File[]>([])
const form = ref({
  amount: '',
  paidOn: todayInput(),
  method: 'bank_transfer' as PaymentMethod,
  reference: '',
  notes: '',
})
// Cash is paid at the office, where it is registered directly
const methodOptions = PAYMENT_METHODS.filter((value) => value !== 'cash').map((value) => ({
  value,
  label: PAYMENT_METHOD_LABELS[value],
}))

watch(open, (isOpen) => {
  if (!isOpen) return
  form.value = {
    amount: props.suggested && Number(props.suggested) > 0 ? String(Number(props.suggested)) : '',
    paidOn: todayInput(),
    method: 'bank_transfer',
    reference: '',
    notes: '',
  }
  files.value = []
  reset()
})

/** "350.000" or "350000,50" → 350000.5 */
const amount = computed(() => {
  const clean = form.value.amount.replace(/\s|\$/g, '')
  const normalized = /,\d{1,2}$/.test(clean)
    ? clean.replace(/\./g, '').replace(',', '.')
    : clean.replace(/[.,](?=\d{3}(\D|$))/g, '')
  const value = Number(normalized)
  return Number.isFinite(value) ? value : 0
})

async function submit() {
  let failed: string[] = []
  const ok = await run(async () => {
    const { data } = await residentApi.finance.report(props.unitId, {
      amount: amount.value,
      paidOn: form.value.paidOn,
      method: form.value.method,
      reference: form.value.reference || null,
      notes: form.value.notes || null,
    })
    failed = await uploadReceipts(data.id, files.value)
  }, 'Recibimos tu reporte. La administración lo confirmará pronto.')
  if (ok) {
    if (failed.length)
      toast.warning(`No se pudo subir: ${failed.join(' · ')}. Adjúntalo desde «Tus pagos».`, {
        duration: 10_000,
      })
    emit('saved')
    open.value = false
  }
}
</script>

<template>
  <DuiModal
    v-model="open"
    title="Reportar un pago"
    description="¿Ya pagaste por transferencia, PSE o consignación? Cuéntanos para que la administración lo aplique."
    :persistent="saving"
  >
    <DuiForm :loading="saving" @submit="submit">
      <DuiAlert v-if="error" color="danger" variant="soft">{{ error }}</DuiAlert>
      <div class="grid gap-4 sm:grid-cols-2">
        <DuiLabel title="Valor pagado" required :error="errors.amount">
          <DuiInput v-model="form.amount" inputmode="decimal" required placeholder="350.000" />
        </DuiLabel>
        <DuiLabel title="Fecha del pago" required :error="errors.paidOn ?? errors.paidAt">
          <DuiInput v-model="form.paidOn" type="date" :max="todayInput()" required />
        </DuiLabel>
        <DuiLabel title="Medio" required :error="errors.method">
          <DuiSelect v-model="form.method" :options="methodOptions" block />
        </DuiLabel>
        <DuiLabel title="Referencia" :error="errors.reference">
          <DuiInput v-model="form.reference" maxlength="120" placeholder="N.º de la transacción" />
        </DuiLabel>
      </div>
      <DuiLabel title="Comentario" :error="errors.notes">
        <DuiInput v-model="form.notes" maxlength="500" placeholder="Opcional" />
      </DuiLabel>
      <ReceiptPicker v-model="files" :disabled="saving" />
      <p class="text-sm text-neutral-500 dark:text-neutral-300">
        Tu saldo se actualiza cuando la administración confirme que el dinero llegó.
      </p>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <DuiButton variant="ghost" :disabled="saving" @click="open = false">Cancelar</DuiButton>
          <DuiButton type="submit" color="primary" :loading="saving" :disabled="amount <= 0">
            Reportar {{ amount > 0 ? formatMoney(amount) : '' }}
          </DuiButton>
        </div>
      </template>
    </DuiForm>
  </DuiModal>
</template>
