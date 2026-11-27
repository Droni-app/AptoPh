<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import {
  UiAlert,
  UiButton,
  UiCard,
  UiForm,
  UiInput,
  UiLabel,
  UiRadio,
  UiSelect,
  UiSkeleton,
  UiSwitch,
  useToast,
} from '@aptoph/ui'
import {
  PARKING_FRACTIONS,
  PARKING_PAYMENT_MODES,
  PARKING_PAYMENT_MODE_LABELS,
  VEHICLE_TYPES,
  VEHICLE_TYPE_ICONS,
  VEHICLE_TYPE_LABELS,
  type CashAccount,
  type VisitorParkingSettings,
} from '@aptoph/shared'
import PageHeader from '@/components/PageHeader.vue'
import { financeApi } from '@/api/finance'
import { visitorParkingApi } from '@/api/visitorParking'
import { errorMessage, fieldErrors } from '@/lib/errors'

const toast = useToast()
const form = ref<VisitorParkingSettings | null>(null)
const cashAccounts = ref<CashAccount[]>([])
const errors = ref<Record<string, string>>({})
const error = ref<string | null>(null)
const saving = ref(false)

const fractionOptions = PARKING_FRACTIONS.map((value) => ({
  value,
  label: value === 1 ? 'Por minuto' : value === 60 ? 'Hora o fracción' : `Cada ${value} minutos`,
}))
const paymentOptions = PARKING_PAYMENT_MODES.map((value) => ({
  value,
  label: PARKING_PAYMENT_MODE_LABELS[value],
  description:
    value === 'gate'
      ? 'Entra a la caja de portería de Finanzas.'
      : value === 'unit'
        ? 'Se crea un cobro en la cartera de la unidad visitada, con su próxima cuota.'
        : 'Al dar la salida el vigilante decide si paga o se carga a la unidad.',
}))
const cashOptions = computed(() =>
  cashAccounts.value
    .filter((account) => account.isActive)
    .map((account) => ({ value: account.id, label: account.name })),
)
const needsCash = computed(() => form.value?.paymentMode !== 'unit')

/** Empty inputs are «no cap» / «no maximum» */
const nullable = (value: unknown) =>
  value === '' || value === null || value === undefined ? null : Number(value)

async function load() {
  try {
    const [settings, accounts] = await Promise.all([
      visitorParkingApi.settings(),
      financeApi.cashAccounts().catch(() => ({ data: [] as CashAccount[] })),
    ])
    form.value = settings.data
    cashAccounts.value = accounts.data
  } catch (e) {
    error.value = errorMessage(e)
  }
}

async function save() {
  if (!form.value) return
  saving.value = true
  errors.value = {}
  error.value = null
  const f = form.value
  const input: VisitorParkingSettings = {
    ...f,
    vehicles: Object.fromEntries(
      VEHICLE_TYPES.map((type) => [
        type,
        {
          capacity: Number(f.vehicles[type].capacity || 0),
          hourlyRate: Number(f.vehicles[type].hourlyRate || 0),
          dailyCap: nullable(f.vehicles[type].dailyCap),
        },
      ]),
    ) as VisitorParkingSettings['vehicles'],
    graceHours: Number(f.graceHours || 0),
    fractionMinutes: Number(f.fractionMinutes),
    vat: { enabled: f.vat.enabled, rate: Number(f.vat.rate || 0) },
    cashAccountId: f.cashAccountId || null,
    maxStayHours: nullable(f.maxStayHours),
  }
  try {
    form.value = (await visitorParkingApi.saveSettings(input)).data
    toast.success('Configuración guardada')
  } catch (e) {
    errors.value = fieldErrors(e)
    error.value = errorMessage(e)
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <PageHeader
    title="Configuración del parqueadero"
    subtitle="Cupos, tarifas y forma de cobro del parqueadero de visitantes"
  >
    <template #before>
      <RouterLink
        :to="{ name: 'visitor-parking' }"
        class="mb-1 inline-flex items-center gap-1 text-sm text-neutral-500 hover:underline"
        ><i class="mdi mdi-arrow-left" aria-hidden="true" />Parqueadero</RouterLink
      >
    </template>
  </PageHeader>

  <UiSkeleton v-if="!form && !error" class="h-96 rounded-2xl" />
  <UiAlert v-else-if="!form" color="danger" variant="soft">{{ error }}</UiAlert>
  <UiForm v-else class="max-w-3xl" :loading="saving" gap="lg" @submit="save">
    <UiAlert v-if="error" color="danger" variant="soft">{{ error }}</UiAlert>

    <UiCard>
      <UiSwitch
        v-model="form.enabled"
        label="Parqueadero de visitantes activo"
        description="Mientras está apagado, portería no puede registrar ingresos."
      />
    </UiCard>

    <UiCard>
      <h2 class="mb-1 font-semibold">Cupos y tarifas</h2>
      <p class="mb-4 text-sm text-neutral-500">
        Tarifas en pesos por hora{{ form.vat.enabled ? ', con IVA incluido' : '' }}. El tope es lo
        máximo que se cobra por día calendario; vacío = sin tope.
      </p>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-xs text-neutral-500">
              <th class="pb-2 font-medium">Vehículo</th>
              <th class="pb-2 font-medium">Cupos</th>
              <th class="pb-2 font-medium">Tarifa por hora</th>
              <th class="pb-2 font-medium">Tope diario</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-100 dark:divide-white/10">
            <tr v-for="type in VEHICLE_TYPES" :key="type">
              <td class="py-2 pr-3 font-medium whitespace-nowrap">
                <i
                  class="mdi mr-1.5 text-lg text-neutral-500"
                  :class="VEHICLE_TYPE_ICONS[type]"
                  aria-hidden="true"
                />{{ VEHICLE_TYPE_LABELS[type] }}
              </td>
              <td class="py-2 pr-3">
                <UiInput
                  v-model="form.vehicles[type].capacity"
                  type="number"
                  min="0"
                  size="sm"
                  class="w-24"
                  :aria-label="`Cupos para ${VEHICLE_TYPE_LABELS[type]}`"
                />
              </td>
              <td class="py-2 pr-3">
                <UiInput
                  v-model="form.vehicles[type].hourlyRate"
                  type="number"
                  min="0"
                  step="100"
                  size="sm"
                  class="w-32"
                  :aria-label="`Tarifa por hora para ${VEHICLE_TYPE_LABELS[type]}`"
                />
              </td>
              <td class="py-2">
                <UiInput
                  v-model="form.vehicles[type].dailyCap"
                  type="number"
                  min="0"
                  step="100"
                  size="sm"
                  class="w-32"
                  placeholder="Sin tope"
                  :aria-label="`Tope diario para ${VEHICLE_TYPE_LABELS[type]}`"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UiCard>

    <UiCard>
      <h2 class="mb-4 font-semibold">Cálculo del cobro</h2>
      <div class="grid gap-4 sm:grid-cols-3">
        <UiLabel
          title="Horas de gracia por día"
          help-text="Gratis por placa cada día, aunque entre varias veces o pase la noche."
          :error="errors.graceHours"
        >
          <UiInput v-model="form.graceHours" type="number" min="0" max="24" step="0.5" />
        </UiLabel>
        <UiLabel title="Fracción de cobro" :error="errors.fractionMinutes">
          <UiSelect v-model="form.fractionMinutes" :options="fractionOptions" block />
        </UiLabel>
        <UiLabel
          title="Estadía máxima (horas)"
          help-text="Pasado este tiempo, el vehículo se marca como excedido."
          :error="errors.maxStayHours"
        >
          <UiInput v-model="form.maxStayHours" type="number" min="1" placeholder="Sin máximo" />
        </UiLabel>
      </div>
      <div class="mt-5 flex flex-wrap items-end gap-4">
        <UiSwitch v-model="form.vat.enabled" label="Cobrar IVA (incluido en la tarifa)" />
        <UiLabel v-if="form.vat.enabled" title="Tasa de IVA (%)" :error="errors['vat.rate']">
          <UiInput v-model="form.vat.rate" type="number" min="0" max="100" class="w-28" />
        </UiLabel>
      </div>
      <UiAlert v-if="form.vat.enabled" color="warning" variant="soft" class="mt-4">
        Si el conjunto cobra IVA es responsable de IVA y debe expedir factura electrónica. El
        comprobante que envía AptoPH no la reemplaza: confírmalo con el contador.
      </UiAlert>
    </UiCard>

    <UiCard>
      <h2 class="mb-4 font-semibold">¿Quién paga?</h2>
      <UiRadio v-model="form.paymentMode" :options="paymentOptions" name="paymentMode" />
      <UiLabel
        v-if="needsCash"
        title="Caja de portería"
        help-text="Cuenta de Finanzas donde entra lo que se recibe en portería."
        :error="errors.cashAccountId"
        class="mt-4 max-w-sm"
      >
        <UiSelect
          v-model="form.cashAccountId"
          :options="cashOptions"
          placeholder="Elige una caja"
          block
        />
      </UiLabel>
      <p v-if="needsCash && !cashOptions.length" class="mt-2 text-sm text-neutral-500">
        No hay cajas creadas.
        <RouterLink :to="{ name: 'finance-banks' }" class="font-medium hover:underline"
          >Crea una en Finanzas → Bancos y caja</RouterLink
        >.
      </p>
    </UiCard>

    <div class="flex justify-end">
      <UiButton type="submit" color="primary" :loading="saving">Guardar configuración</UiButton>
    </div>
  </UiForm>
</template>
