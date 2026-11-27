<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  UiAlert,
  UiButton,
  UiCard,
  UiCheckbox,
  UiInput,
  UiLabel,
  UiSelect,
  UiSkeleton,
  useToast,
} from '@aptoph/ui'
import {
  MAX_MONTHLY_INTEREST_RATE,
  PAYMENT_APPLICATION_ORDERS,
  PAYMENT_APPLICATION_ORDER_LABELS,
  ROUNDING_MODES,
  ROUNDING_MODE_LABELS,
  ROUNDING_STEPS,
  type FinanceSettings,
} from '@aptoph/shared'
import PageHeader from '@/components/PageHeader.vue'
import { financeApi } from '@/api/finance'
import { errorMessage, fieldErrors } from '@/lib/errors'
import { formatDate } from '@/lib/format'
import { useTenantStore } from '@/stores/tenant'

const tenant = useTenantStore()
const toast = useToast()
const settings = ref<FinanceSettings | null>(null)
const today = ref('')
const errors = ref<Record<string, string>>({})
const error = ref<string | null>(null)
const saving = ref(false)

onMounted(async () => {
  try {
    const { data } = await financeApi.settings()
    const { today: date, ...rest } = data
    today.value = date
    settings.value = rest
  } catch (e) {
    error.value = errorMessage(e)
  }
})

const roundingOptions = ROUNDING_STEPS.map((value) => ({
  value,
  label: value === 1 ? 'Sin redondeo' : `A $ ${value.toLocaleString('es-CO')}`,
}))
const roundingModeOptions = ROUNDING_MODES.map((value) => ({
  value,
  label: ROUNDING_MODE_LABELS[value],
}))
const orderOptions = PAYMENT_APPLICATION_ORDERS.map((value) => ({
  value,
  label: PAYMENT_APPLICATION_ORDER_LABELS[value],
}))

async function save() {
  if (!settings.value) return
  saving.value = true
  errors.value = {}
  error.value = null
  const s = settings.value
  try {
    const { data } = await financeApi.updateSettings({
      ...s,
      dueDay: Number(s.dueDay),
      lateInterest: {
        ...s.lateInterest,
        monthlyRate: Number(String(s.lateInterest.monthlyRate).replace(',', '.')),
      },
      earlyDiscount: {
        ...s.earlyDiscount,
        rate: Number(String(s.earlyDiscount.rate).replace(',', '.')),
        day: Number(s.earlyDiscount.day),
      },
      lockedUntil: s.lockedUntil || null,
    })
    const { today: _today, ...rest } = data
    void _today
    settings.value = rest
    toast.success('Configuración guardada')
  } catch (e) {
    errors.value = fieldErrors(e)
    error.value = errorMessage(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <PageHeader
    title="Configuración financiera"
    subtitle="Reglas de facturación, mora y cierre contable del conjunto"
  >
    <template #actions>
      <UiButton
        v-if="tenant.canManageFinance"
        color="primary"
        :loading="saving"
        :disabled="!settings"
        @click="save"
        >Guardar</UiButton
      >
    </template>
  </PageHeader>
  <UiAlert v-if="error" color="danger" variant="soft" class="mb-4">{{ error }}</UiAlert>
  <UiSkeleton v-if="!settings" class="h-64 rounded-2xl" />

  <form v-else class="grid gap-6 lg:grid-cols-2" @submit.prevent="save">
    <UiCard title="Facturación">
      <div class="flex flex-col gap-4">
        <UiLabel
          title="Día de vencimiento"
          help-text="Las cuotas del mes vencen este día (1 a 28)"
          :error="errors.dueDay"
        >
          <UiInput v-model.number="settings.dueDay" type="number" min="1" max="28" />
        </UiLabel>
        <div class="grid gap-4 sm:grid-cols-2">
          <UiLabel title="Redondeo de las cuotas" :error="errors.rounding">
            <UiSelect v-model="settings.rounding" :options="roundingOptions" block />
          </UiLabel>
          <UiLabel title="Sentido">
            <UiSelect v-model="settings.roundingMode" :options="roundingModeOptions" block />
          </UiLabel>
        </div>
        <UiLabel
          title="Cómo se aplican los pagos"
          help-text="Orden en que un pago abona a la deuda"
          :error="errors.applicationOrder"
        >
          <UiSelect v-model="settings.applicationOrder" :options="orderOptions" block />
        </UiLabel>
      </div>
    </UiCard>

    <UiCard title="Intereses de mora">
      <div class="flex flex-col gap-4">
        <UiCheckbox v-model="settings.lateInterest.enabled" label="Cobrar intereses de mora" />
        <UiLabel
          v-if="settings.lateInterest.enabled"
          title="Tasa mensual %"
          :help-text="`Máximo legal: 1,5 veces el interés bancario corriente certificado por la Superfinanciera, sin superar la usura (art. 30 Ley 675). Tope del sistema: ${MAX_MONTHLY_INTEREST_RATE} %.`"
          :error="errors['lateInterest.monthlyRate']"
        >
          <UiInput v-model="settings.lateInterest.monthlyRate" inputmode="decimal" />
        </UiLabel>
        <p class="text-sm text-neutral-500">
          Se calcula al facturar cada mes sobre el capital vencido (cuotas, multas, parqueaderos),
          nunca sobre intereses.
        </p>
      </div>
    </UiCard>

    <UiCard title="Descuento por pronto pago">
      <div class="flex flex-col gap-4">
        <UiCheckbox
          v-model="settings.earlyDiscount.enabled"
          label="Dar descuento a quien pague a tiempo"
        />
        <div v-if="settings.earlyDiscount.enabled" class="grid gap-4 sm:grid-cols-2">
          <UiLabel title="Descuento %" :error="errors['earlyDiscount.rate']">
            <UiInput v-model="settings.earlyDiscount.rate" inputmode="decimal" />
          </UiLabel>
          <UiLabel title="Hasta el día" :error="errors['earlyDiscount.day']">
            <UiInput v-model.number="settings.earlyDiscount.day" type="number" min="1" max="28" />
          </UiLabel>
        </div>
        <p class="text-sm text-neutral-500">
          Aplica a los conceptos marcados con pronto pago, si el cobro se paga completo hasta ese
          día.
        </p>
      </div>
    </UiCard>

    <UiCard title="Cierre contable">
      <div class="flex flex-col gap-4">
        <UiLabel
          title="Contabilidad cerrada hasta"
          help-text="No se podrán registrar ni reversar movimientos con fecha igual o anterior. Úsalo cuando el revisor fiscal apruebe el mes."
          :error="errors.lockedUntil"
        >
          <UiInput
            :model-value="settings.lockedUntil ?? ''"
            type="date"
            :max="today"
            @update:model-value="
              (value: string | number) => (settings!.lockedUntil = value ? String(value) : null)
            "
          />
        </UiLabel>
        <p v-if="settings.lockedUntil" class="text-sm">
          Cerrado hasta el <strong>{{ formatDate(settings.lockedUntil) }}</strong
          >.
        </p>
      </div>
    </UiCard>
  </form>
</template>
