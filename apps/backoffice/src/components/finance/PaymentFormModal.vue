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
  DuiSkeleton,
  useToast,
} from '@dronico/droni-kit'
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  type BackofficeUnitStatement,
  type PaymentMethod,
} from '@aptoph/shared'
import UnitPicker, { type PickedUnit } from '@/components/finance/UnitPicker.vue'
import { financeApi } from '@/api/finance'
import { useFinanceCatalog } from '@/composables/useFinanceCatalog'
import { errorMessage, fieldErrors } from '@/lib/errors'
import { formatDate, formatMoney, formatPeriod, parseAmount, todayInput } from '@/lib/format'

const props = defineProps<{ fixedUnit?: PickedUnit | null }>()
const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ saved: [number | null] }>()
const toast = useToast()
const catalog = useFinanceCatalog()

const unit = ref<PickedUnit | null>(null)
const statement = ref<BackofficeUnitStatement | null>(null)
const loadingStatement = ref(false)
const form = ref({
  amount: '',
  paidOn: todayInput(),
  method: 'bank_transfer' as PaymentMethod,
  reference: '',
  notes: '',
  cashAccountId: '',
})
const errors = ref<Record<string, string>>({})
const error = ref<string | null>(null)
const saving = ref(false)

const methodOptions = PAYMENT_METHODS.map((value) => ({
  value,
  label: PAYMENT_METHOD_LABELS[value],
}))
const cashOptions = computed(() => [
  { value: '', label: 'Selecciona dónde entró el dinero' },
  ...catalog.activeCashAccounts.value.map((account) => ({
    value: account.id,
    label: account.name,
  })),
])

watch(open, async (isOpen) => {
  if (!isOpen) return
  await catalog.load()
  unit.value = props.fixedUnit ?? null
  statement.value = null
  const bank = catalog.activeCashAccounts.value.find((account) => account.type === 'bank')
  form.value = {
    amount: '',
    paidOn: todayInput(),
    method: 'bank_transfer',
    reference: '',
    notes: '',
    cashAccountId: bank?.id ?? '',
  }
  errors.value = {}
  error.value = null
})

watch(unit, async (picked) => {
  statement.value = null
  if (!picked) return
  loadingStatement.value = true
  try {
    statement.value = (await financeApi.statement(picked.id)).data
    if (!form.value.amount && Number(statement.value.toPay) > 0) {
      form.value.amount = String(Number(statement.value.toPay))
    }
  } finally {
    loadingStatement.value = false
  }
})

watch(
  () => form.value.method,
  (method) => {
    const cash = catalog.activeCashAccounts.value.find(
      (account) => account.type === (method === 'cash' ? 'cash' : 'bank'),
    )
    if (cash) form.value.cashAccountId = cash.id
  },
)

const amount = computed(() => parseAmount(form.value.amount))
const credit = computed(() =>
  statement.value ? Math.max(0, amount.value - Number(statement.value.debt)) : 0,
)

async function submit() {
  if (!unit.value) {
    errors.value = { unitId: 'Elige la unidad' }
    return
  }
  saving.value = true
  errors.value = {}
  error.value = null
  try {
    const { data } = await financeApi.registerPayment({
      unitId: unit.value.id,
      amount: amount.value,
      paidOn: form.value.paidOn,
      method: form.value.method,
      reference: form.value.reference || null,
      notes: form.value.notes || null,
      cashAccountId: form.value.cashAccountId,
    })
    toast.success(`Recibo de caja ${data.number} registrado`)
    emit('saved', data.number)
    open.value = false
  } catch (e) {
    errors.value = fieldErrors(e)
    if (errors.value.paidAt) errors.value.paidOn = errors.value.paidAt
    error.value = Object.keys(errors.value).length ? null : errorMessage(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <DuiModal
    v-model="open"
    title="Registrar pago"
    description="Genera el recibo de caja y lo aplica a la deuda de la unidad"
    size="lg"
    :persistent="saving"
    scrollable
  >
    <DuiForm :loading="saving" @submit="submit">
      <DuiAlert v-if="error" color="danger" variant="soft">{{ error }}</DuiAlert>
      <DuiLabel title="Unidad" required :error="errors.unitId">
        <div
          v-if="unit"
          class="flex items-center justify-between rounded-lg bg-mint-50 px-3 py-2 text-sm dark:bg-mint-400/10"
        >
          <span class="font-medium">{{ unit.label }}</span>
          <button
            v-if="!props.fixedUnit"
            type="button"
            class="text-neutral-500 underline"
            @click="unit = null"
          >
            Cambiar
          </button>
        </div>
        <UnitPicker v-else autofocus @pick="unit = $event" />
      </DuiLabel>

      <DuiSkeleton v-if="loadingStatement" class="h-24 rounded-xl" />
      <div v-else-if="statement" class="rounded-xl bg-neutral-50 p-4 text-sm dark:bg-white/5">
        <div class="flex flex-wrap gap-x-6 gap-y-1">
          <span
            >Debe <strong class="tabular-nums">{{ formatMoney(statement.debt) }}</strong></span
          >
          <span v-if="Number(statement.overdue) > 0" class="text-coral-700 dark:text-coral-300"
            >Vencido
            <strong class="tabular-nums">{{ formatMoney(statement.overdue) }}</strong></span
          >
          <span v-if="Number(statement.credit) > 0"
            >Saldo a favor
            <strong class="tabular-nums">{{ formatMoney(statement.credit) }}</strong></span
          >
          <span
            v-if="Number(statement.availableDiscount) > 0"
            class="text-mint-700 dark:text-mint-300"
          >
            Con pronto pago hoy:
            <strong class="tabular-nums">{{ formatMoney(statement.toPay) }}</strong>
          </span>
        </div>
        <ul
          v-if="statement.openCharges.length"
          class="mt-2 max-h-36 divide-y divide-neutral-200 overflow-y-auto dark:divide-white/10"
        >
          <li
            v-for="charge in statement.openCharges"
            :key="charge.id"
            class="flex justify-between gap-3 py-1"
          >
            <span
              >{{ charge.concept?.name }} · {{ formatPeriod(charge.period) }}
              <span class="text-neutral-500">vence {{ formatDate(charge.dueOn) }}</span></span
            >
            <span class="tabular-nums">{{ formatMoney(charge.balance) }}</span>
          </li>
        </ul>
        <p v-else class="mt-1 text-neutral-500">
          Está al día. Lo que pague quedará como saldo a favor.
        </p>
      </div>

      <div class="grid gap-4 sm:grid-cols-3">
        <DuiLabel title="Valor recibido" required :error="errors.amount">
          <DuiInput v-model="form.amount" inputmode="decimal" required />
        </DuiLabel>
        <DuiLabel title="Fecha del pago" required :error="errors.paidOn">
          <DuiInput v-model="form.paidOn" type="date" :max="todayInput()" required />
        </DuiLabel>
        <DuiLabel title="Medio" required>
          <DuiSelect v-model="form.method" :options="methodOptions" block />
        </DuiLabel>
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        <DuiLabel title="Entró a" required :error="errors.cashAccountId">
          <DuiSelect v-model="form.cashAccountId" :options="cashOptions" block />
        </DuiLabel>
        <DuiLabel title="Referencia" :error="errors.reference">
          <DuiInput
            v-model="form.reference"
            maxlength="120"
            placeholder="N.º de transacción o consignación"
          />
        </DuiLabel>
      </div>
      <DuiLabel title="Notas" :error="errors.notes">
        <DuiInput v-model="form.notes" maxlength="500" />
      </DuiLabel>
      <p v-if="credit > 0" class="text-sm text-neutral-600 dark:text-neutral-300">
        {{ formatMoney(credit) }} quedarán como saldo a favor y se aplicarán a los próximos cobros.
      </p>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <DuiButton variant="ghost" :disabled="saving" @click="open = false">Cancelar</DuiButton>
          <DuiButton type="submit" color="primary" :loading="saving"
            >Registrar {{ amount > 0 ? formatMoney(amount) : '' }}</DuiButton
          >
        </div>
      </template>
    </DuiForm>
  </DuiModal>
</template>
