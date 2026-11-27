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
  UiSkeleton,
  UiSwitch,
  useToast,
} from '@aptoph/ui'
import {
  PARKING_MODES,
  PARKING_MODE_LABELS,
  VEHICLE_TYPES,
  VEHICLE_TYPE_ICONS,
  VEHICLE_TYPE_LABELS,
  type ParkingSettings,
} from '@aptoph/shared'
import PageHeader from '@/components/PageHeader.vue'
import { parkingApi } from '@/api/parking'
import { errorMessage, fieldErrors } from '@/lib/errors'

const toast = useToast()
const form = ref<ParkingSettings | null>(null)
const errors = ref<Record<string, string>>({})
const error = ref<string | null>(null)
const saving = ref(false)

const modeOptions = PARKING_MODES.map((value) => ({
  value,
  label: PARKING_MODE_LABELS[value],
  description:
    value === 'private'
      ? 'Cada parqueadero pertenece a una unidad (escriturado).'
      : value === 'communal'
        ? 'Son del conjunto y se asignan a las unidades por sorteo.'
        : 'Hay parqueaderos propios y otros comunales que se sortean.',
}))
const hasCommunal = computed(() => form.value?.mode !== 'private')
const hasPrivate = computed(() => form.value?.mode !== 'communal')

const num = (value: unknown) => Number(value || 0)

async function load() {
  try {
    form.value = (await parkingApi.settings()).data
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
  const input: ParkingSettings = {
    ...f,
    maxSpotsPerUnit: num(f.maxSpotsPerUnit),
    rates: Object.fromEntries(
      VEHICLE_TYPES.map((type) => [
        type,
        { communal: num(f.rates[type].communal), private: num(f.rates[type].private) },
      ]),
    ) as ParkingSettings['rates'],
    lotteryMonths: num(f.lotteryMonths),
    offerDays: num(f.offerDays),
    requirements: { ...f.requirements, debtToleranceDays: num(f.requirements.debtToleranceDays) },
  }
  try {
    form.value = (await parkingApi.saveSettings(input)).data
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
    title="Configuración de parqueaderos"
    subtitle="Tipo de parqueaderos, cupos por unidad, tarifas mensuales y requisitos"
  >
    <template #before>
      <RouterLink
        :to="{ name: 'parking' }"
        class="mb-1 inline-flex items-center gap-1 text-sm text-neutral-500 hover:underline"
        ><i class="mdi mdi-arrow-left" aria-hidden="true" />Parqueaderos</RouterLink
      >
    </template>
  </PageHeader>

  <UiSkeleton v-if="!form && !error" class="h-96 rounded-2xl" />
  <UiAlert v-else-if="!form" color="danger" variant="soft">{{ error }}</UiAlert>
  <UiForm v-else class="max-w-3xl" :loading="saving" gap="lg" @submit="save">
    <UiAlert v-if="error" color="danger" variant="soft">{{ error }}</UiAlert>

    <UiCard>
      <h2 class="mb-4 font-semibold">Parqueaderos del conjunto</h2>
      <UiRadio v-model="form.mode" :options="modeOptions" name="mode" />
      <UiLabel
        title="Máximo de parqueaderos por unidad"
        help-text="Suma los propios y los comunales asignados."
        :error="errors.maxSpotsPerUnit"
        class="mt-5 max-w-xs"
      >
        <UiInput v-model="form.maxSpotsPerUnit" type="number" min="1" max="20" required />
      </UiLabel>
    </UiCard>

    <UiCard>
      <h2 class="mb-1 font-semibold">Tarifas mensuales</h2>
      <p class="mb-4 text-sm text-neutral-500">
        Se cargan a la unidad con la cuota de cada mes, en el concepto «Parqueaderos». Un cupo
        comunal que empieza o termina a mitad de mes se cobra por los días. En 0 no se cobra.
      </p>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-xs text-neutral-500">
              <th class="pb-2 font-medium">Vehículo</th>
              <th v-if="hasCommunal" class="pb-2 font-medium">Cupo comunal</th>
              <th v-if="hasPrivate" class="pb-2 font-medium">Parqueadero propio</th>
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
              <td v-if="hasCommunal" class="py-2 pr-3">
                <UiInput
                  v-model="form.rates[type].communal"
                  type="number"
                  min="0"
                  step="1000"
                  size="sm"
                  class="w-36"
                  :aria-label="`Tarifa del cupo comunal para ${VEHICLE_TYPE_LABELS[type]}`"
                />
              </td>
              <td v-if="hasPrivate" class="py-2">
                <UiInput
                  v-model="form.rates[type].private"
                  type="number"
                  min="0"
                  step="1000"
                  size="sm"
                  class="w-36"
                  :aria-label="`Tarifa del parqueadero propio para ${VEHICLE_TYPE_LABELS[type]}`"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="hasPrivate" class="mt-3 text-xs text-neutral-500">
        La tarifa de los propios es un cobro adicional (p. ej. mantenimiento): su cuota de
        administración ya va por coeficiente en Tarifas.
      </p>
    </UiCard>

    <UiCard v-if="hasCommunal">
      <h2 class="mb-4 font-semibold">Asignación de cupos comunales</h2>
      <div class="grid gap-4 sm:grid-cols-2">
        <UiLabel
          title="Periodo del sorteo (meses)"
          help-text="Al asignar, el cupo vence al terminar este periodo."
          :error="errors.lotteryMonths"
        >
          <UiInput v-model="form.lotteryMonths" type="number" min="1" max="60" required />
        </UiLabel>
        <UiLabel
          title="Días para aceptar un cupo ofrecido"
          help-text="Cuando se libera un cupo y se ofrece al siguiente de la lista de espera."
          :error="errors.offerDays"
        >
          <UiInput v-model="form.offerDays" type="number" min="1" max="30" required />
        </UiLabel>
      </div>
      <h3 class="mt-6 mb-1 text-sm font-semibold">Requisitos para tener un cupo comunal</h3>
      <p class="mb-3 text-sm text-neutral-500">
        Al asignar se avisa cuáles no cumple la unidad; el sorteo los exigirá.
      </p>
      <div class="flex flex-col gap-4">
        <div class="flex flex-wrap items-end gap-4">
          <UiSwitch
            v-model="form.requirements.noDebt"
            label="Estar a paz y salvo"
            description="Sin saldo vencido en la administración."
          />
          <UiLabel
            v-if="form.requirements.noDebt"
            title="Tolerancia (días de vencido)"
            :error="errors['requirements.debtToleranceDays']"
          >
            <UiInput
              v-model="form.requirements.debtToleranceDays"
              type="number"
              min="0"
              max="365"
              class="w-28"
            />
          </UiLabel>
        </div>
        <UiSwitch
          v-model="form.requirements.vehicle"
          label="Tener un vehículo registrado del tipo del cupo"
        />
        <UiSwitch
          v-model="form.requirements.documents"
          label="SOAT y tecnomecánica vigentes"
          description="Según las fechas que registra el residente en su vehículo."
        />
        <UiSwitch
          v-if="form.mode === 'mixed'"
          v-model="form.requirements.priorityWithoutPrivate"
          label="Prioridad para las unidades sin parqueadero propio"
          description="En el sorteo van primero; las que ya tienen uno reciben los cupos que sobren."
        />
      </div>
    </UiCard>

    <UiCard>
      <h2 class="mb-4 font-semibold">Registro de vehículos</h2>
      <UiSwitch
        v-model="form.allowThirdPartyVehicles"
        label="Permitir vehículos a nombre de terceros"
        description="El residente registra el nombre, documento, relación y teléfono del propietario (familiar, empresa, leasing…)."
      />
    </UiCard>

    <div class="flex justify-end">
      <UiButton type="submit" color="primary" :loading="saving">Guardar configuración</UiButton>
    </div>
  </UiForm>
</template>
