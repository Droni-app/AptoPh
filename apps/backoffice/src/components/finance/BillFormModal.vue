<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  DuiAlert,
  DuiButton,
  DuiCheckbox,
  DuiForm,
  DuiInput,
  DuiLabel,
  DuiModal,
  DuiSelect,
  useToast,
} from '@dronico/droni-kit'
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
  type Vendor,
} from '@aptoph/shared'
import AccountSelect from '@/components/finance/AccountSelect.vue'
import VendorFormModal from '@/components/finance/VendorFormModal.vue'
import { financeApi } from '@/api/finance'
import { useFinanceCatalog } from '@/composables/useFinanceCatalog'
import { errorMessage, fieldErrors } from '@/lib/errors'
import { formatMoney, parseAmount, todayInput } from '@/lib/format'

const props = defineProps<{ vendors: Vendor[] }>()
const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ saved: []; vendorCreated: [] }>()
const toast = useToast()
const catalog = useFinanceCatalog()

type Line = { accountId: string; description: string; amount: string }
const form = ref({
  vendorId: '',
  number: '',
  issuedOn: todayInput(),
  dueOn: todayInput(30),
  description: '',
  taxAmount: '',
  withholdingIncomeTax: '',
  withholdingVat: '',
  withholdingIca: '',
})
const lines = ref<Line[]>([])
const showTaxes = ref(false)
const payNow = ref(false)
const payment = ref({
  cashAccountId: '',
  paidOn: todayInput(),
  method: 'bank_transfer' as PaymentMethod,
  reference: '',
})
const errors = ref<Record<string, string>>({})
const error = ref<string | null>(null)
const saving = ref(false)
const vendorFormOpen = ref(false)

watch(open, async (isOpen) => {
  if (!isOpen) return
  await catalog.load()
  form.value = {
    vendorId: '',
    number: '',
    issuedOn: todayInput(),
    dueOn: todayInput(30),
    description: '',
    taxAmount: '',
    withholdingIncomeTax: '',
    withholdingVat: '',
    withholdingIca: '',
  }
  lines.value = [{ accountId: '', description: '', amount: '' }]
  showTaxes.value = false
  payNow.value = false
  payment.value = {
    cashAccountId: catalog.activeCashAccounts.value[0]?.id ?? '',
    paidOn: todayInput(),
    method: 'bank_transfer',
    reference: '',
  }
  errors.value = {}
  error.value = null
})

watch(
  () => form.value.vendorId,
  (id) => {
    const vendor = props.vendors.find((v) => v.id === id)
    if (vendor?.defaultAccount && lines.value.length === 1 && !lines.value[0]!.accountId) {
      lines.value[0]!.accountId = vendor.defaultAccount.id
    }
  },
)

const vendorOptions = computed(() => [
  { value: '', label: 'Selecciona un proveedor' },
  ...props.vendors
    .filter((v) => v.isActive)
    .map((v) => ({
      value: v.id,
      label: v.documentNumber ? `${v.name} · ${v.documentNumber}` : v.name,
    })),
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

const subtotal = computed(() =>
  lines.value.reduce((sum, line) => sum + (parseAmount(line.amount) || 0), 0),
)
const tax = computed(() => parseAmount(form.value.taxAmount) || 0)
const withholdings = computed(
  () =>
    (parseAmount(form.value.withholdingIncomeTax) || 0) +
    (parseAmount(form.value.withholdingVat) || 0) +
    (parseAmount(form.value.withholdingIca) || 0),
)
const total = computed(() => subtotal.value + tax.value)
const net = computed(() => total.value - withholdings.value)

function onVendorCreated(vendor: Vendor) {
  emit('vendorCreated')
  // The parent reloads the list; select it as soon as it arrives
  const stop = watch(
    () => props.vendors,
    () => {
      if (props.vendors.some((v) => v.id === vendor.id)) {
        form.value.vendorId = vendor.id
        stop()
      }
    },
    { immediate: true },
  )
}

async function submit() {
  saving.value = true
  errors.value = {}
  error.value = null
  try {
    await financeApi.createBill({
      vendorId: form.value.vendorId,
      number: form.value.number || null,
      issuedOn: form.value.issuedOn,
      dueOn: payNow.value ? form.value.issuedOn : form.value.dueOn,
      description: form.value.description,
      lines: lines.value.map((line) => ({
        accountId: line.accountId,
        description: line.description || null,
        amount: parseAmount(line.amount),
      })),
      taxAmount: tax.value,
      withholdingIncomeTax: parseAmount(form.value.withholdingIncomeTax) || 0,
      withholdingVat: parseAmount(form.value.withholdingVat) || 0,
      withholdingIca: parseAmount(form.value.withholdingIca) || 0,
      payNow: payNow.value
        ? { ...payment.value, reference: payment.value.reference || null }
        : null,
    })
    toast.success(payNow.value ? 'Gasto registrado y pagado' : 'Factura registrada')
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
  <DuiModal
    v-model="open"
    title="Registrar gasto"
    description="Factura o cuenta de cobro de un proveedor"
    size="xl"
    :persistent="saving"
    scrollable
  >
    <DuiForm :loading="saving" @submit="submit">
      <DuiAlert v-if="error" color="danger" variant="soft">{{ error }}</DuiAlert>
      <div class="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <DuiLabel title="Proveedor" required :error="errors.vendorId">
          <div class="flex gap-2">
            <DuiSelect v-model="form.vendorId" :options="vendorOptions" class="flex-1" block />
            <DuiButton variant="outline" aria-label="Nuevo proveedor" @click="vendorFormOpen = true"
              ><i class="mdi mdi-plus" aria-hidden="true"
            /></DuiButton>
          </div>
        </DuiLabel>
        <DuiLabel title="N.º de factura" :error="errors.number">
          <DuiInput v-model="form.number" maxlength="40" placeholder="FE-1234" />
        </DuiLabel>
      </div>
      <DuiLabel title="Descripción" required :error="errors.description">
        <DuiInput
          v-model="form.description"
          maxlength="255"
          required
          placeholder="Vigilancia de noviembre"
        />
      </DuiLabel>
      <div class="grid gap-4 sm:grid-cols-2">
        <DuiLabel title="Fecha de la factura" required :error="errors.issuedOn">
          <DuiInput v-model="form.issuedOn" type="date" required />
        </DuiLabel>
        <DuiLabel v-if="!payNow" title="Vence" required :error="errors.dueOn">
          <DuiInput v-model="form.dueOn" type="date" required />
        </DuiLabel>
      </div>

      <fieldset class="flex flex-col gap-2">
        <legend class="mb-1 text-sm font-semibold">Conceptos del gasto</legend>
        <div
          v-for="(line, i) in lines"
          :key="i"
          class="grid gap-2 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_9rem_2.5rem]"
        >
          <AccountSelect
            v-model="line.accountId"
            :prefixes="['5', '15', '16', '17']"
            :exclude-prefixes="['1592']"
            :aria-label="`Cuenta de la línea ${i + 1}`"
          />
          <DuiInput
            v-model="line.description"
            maxlength="255"
            placeholder="Detalle (opcional)"
            :aria-label="`Detalle de la línea ${i + 1}`"
          />
          <DuiInput
            v-model="line.amount"
            inputmode="decimal"
            placeholder="Valor"
            :aria-label="`Valor de la línea ${i + 1}`"
          />
          <button
            v-if="lines.length > 1"
            type="button"
            class="text-neutral-400 hover:text-coral-600"
            :aria-label="`Quitar línea ${i + 1}`"
            @click="lines.splice(i, 1)"
          >
            <i class="mdi mdi-close" aria-hidden="true" />
          </button>
        </div>
        <p v-if="errors.lines" class="text-sm text-coral-700">{{ errors.lines }}</p>
        <button
          type="button"
          class="self-start text-sm font-semibold text-mint-700 dark:text-mint-300"
          @click="lines.push({ accountId: '', description: '', amount: '' })"
        >
          + Agregar línea
        </button>
      </fieldset>

      <DuiCheckbox v-model="showTaxes" label="Tiene IVA o retenciones" />
      <div v-if="showTaxes" class="grid gap-4 sm:grid-cols-4">
        <DuiLabel title="IVA" help-text="Se lleva como mayor gasto" :error="errors.taxAmount">
          <DuiInput v-model="form.taxAmount" inputmode="decimal" />
        </DuiLabel>
        <DuiLabel title="Retención en la fuente" :error="errors.withholdingIncomeTax">
          <DuiInput v-model="form.withholdingIncomeTax" inputmode="decimal" />
        </DuiLabel>
        <DuiLabel title="Retención de IVA" :error="errors.withholdingVat">
          <DuiInput v-model="form.withholdingVat" inputmode="decimal" />
        </DuiLabel>
        <DuiLabel title="Retención de ICA" :error="errors.withholdingIca">
          <DuiInput v-model="form.withholdingIca" inputmode="decimal" />
        </DuiLabel>
      </div>

      <dl
        class="grid grid-cols-2 gap-3 rounded-xl bg-neutral-50 p-4 text-sm sm:grid-cols-4 dark:bg-white/5"
      >
        <div>
          <dt class="text-neutral-500">Subtotal</dt>
          <dd class="font-semibold tabular-nums">{{ formatMoney(subtotal) }}</dd>
        </div>
        <div>
          <dt class="text-neutral-500">Total factura</dt>
          <dd class="font-semibold tabular-nums">{{ formatMoney(total) }}</dd>
        </div>
        <div>
          <dt class="text-neutral-500">Retenciones</dt>
          <dd class="font-semibold tabular-nums">{{ formatMoney(withholdings) }}</dd>
        </div>
        <div>
          <dt class="text-neutral-500">Neto a pagar</dt>
          <dd class="text-base font-bold tabular-nums">{{ formatMoney(net) }}</dd>
        </div>
      </dl>

      <DuiCheckbox v-model="payNow" label="Ya se pagó (gasto de caja menor o pago inmediato)" />
      <div v-if="payNow" class="grid gap-4 sm:grid-cols-4">
        <DuiLabel title="Pagado desde" required :error="errors['payNow.cashAccountId']">
          <DuiSelect v-model="payment.cashAccountId" :options="cashOptions" block />
        </DuiLabel>
        <DuiLabel title="Fecha del pago" required :error="errors['payNow.paidOn']">
          <DuiInput v-model="payment.paidOn" type="date" required />
        </DuiLabel>
        <DuiLabel title="Medio">
          <DuiSelect v-model="payment.method" :options="methodOptions" block />
        </DuiLabel>
        <DuiLabel title="Referencia">
          <DuiInput v-model="payment.reference" maxlength="80" />
        </DuiLabel>
      </div>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <DuiButton variant="ghost" :disabled="saving" @click="open = false">Cancelar</DuiButton>
          <DuiButton type="submit" color="primary" :loading="saving">{{
            payNow ? 'Registrar y pagar' : 'Registrar factura'
          }}</DuiButton>
        </div>
      </template>
    </DuiForm>
  </DuiModal>
  <VendorFormModal v-model="vendorFormOpen" :vendor="null" @saved="onVendorCreated" />
</template>
