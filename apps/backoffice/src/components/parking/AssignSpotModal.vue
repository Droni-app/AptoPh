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
  UiSkeleton,
  UiTextarea,
  useToast,
} from '@aptoph/ui'
import {
  VEHICLE_TYPE_LABELS,
  type ParkingEligibility,
  type ParkingSettings,
  type ParkingSpot,
} from '@aptoph/shared'
import UnitPicker, { type PickedUnit } from '@/components/finance/UnitPicker.vue'
import { parkingApi } from '@/api/parking'
import { errorMessage, fieldErrors } from '@/lib/errors'
import { formatDate, formatMoney } from '@/lib/format'

const props = defineProps<{ spot: ParkingSpot | null; settings: ParkingSettings | null }>()
const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ saved: [] }>()
const toast = useToast()

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
const addMonths = (iso: string, months: number) => {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number]
  const date = new Date(Date.UTC(y, m - 1 + months, d))
  date.setUTCDate(date.getUTCDate() - 1)
  return date.toISOString().slice(0, 10)
}

const unit = ref<PickedUnit | null>(null)
const eligibility = ref<ParkingEligibility | null>(null)
const checking = ref(false)
const form = ref({ vehicleId: '', startsOn: today(), endsOn: '', notes: '' })
const errors = ref<Record<string, string>>({})
const error = ref<string | null>(null)
const saving = ref(false)

const months = computed(() => props.settings?.lotteryMonths ?? 12)
watch(open, (isOpen) => {
  if (!isOpen) return
  unit.value = null
  eligibility.value = null
  const startsOn = today()
  form.value = { vehicleId: '', startsOn, endsOn: addMonths(startsOn, months.value), notes: '' }
  errors.value = {}
  error.value = null
})
watch(
  () => form.value.startsOn,
  (startsOn, before) => {
    // Keeps the period while the end was the default one
    if (startsOn && (!form.value.endsOn || form.value.endsOn === addMonths(before, months.value)))
      form.value.endsOn = addMonths(startsOn, months.value)
  },
)

watch(unit, async (picked) => {
  eligibility.value = null
  form.value.vehicleId = ''
  if (!picked || !props.spot) return
  checking.value = true
  try {
    eligibility.value = (await parkingApi.eligibility(picked.id, props.spot.vehicleType)).data
    const ofType = vehicles.value
    if (ofType.length === 1) form.value.vehicleId = ofType[0]!.id
  } catch (e) {
    errors.value = fieldErrors(e)
    error.value = Object.keys(errors.value).length ? null : errorMessage(e)
  } finally {
    checking.value = false
  }
})

const vehicles = computed(
  () => eligibility.value?.vehicles.filter((v) => v.type === props.spot?.vehicleType) ?? [],
)
const vehicleOptions = computed(() =>
  vehicles.value.map((v) => ({
    value: v.id,
    label: `${v.plate}${[v.brand, v.color].filter(Boolean).length ? ` · ${[v.brand, v.color].filter(Boolean).join(' ')}` : ''}${v.documentsOk ? '' : ' · documentos vencidos'}`,
  })),
)
const rate = computed(() =>
  props.spot && props.settings ? props.settings.rates[props.spot.vehicleType].communal : 0,
)
const blocked = computed(() => !!eligibility.value?.errors.length)

async function submit() {
  if (!props.spot) return
  if (!unit.value) {
    errors.value = { unitId: 'Elige la unidad' }
    return
  }
  saving.value = true
  errors.value = {}
  error.value = null
  try {
    await parkingApi.assign({
      spotId: props.spot.id,
      unitId: unit.value.id,
      vehicleId: form.value.vehicleId || null,
      startsOn: form.value.startsOn,
      endsOn: form.value.endsOn || null,
      notes: form.value.notes || null,
    })
    toast.success(`${props.spot.code} asignado a ${unit.value.label}`)
    emit('saved')
    open.value = false
  } catch (e) {
    errors.value = fieldErrors(e)
    error.value = Object.keys(errors.value).length ? null : errorMessage(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UiModal
    v-model="open"
    :title="spot ? `Asignar ${spot.code}` : 'Asignar parqueadero'"
    :persistent="saving"
    scrollable
  >
    <UiForm v-if="spot" :loading="saving" @submit="submit">
      <p class="text-sm text-neutral-500">
        Cupo comunal para {{ VEHICLE_TYPE_LABELS[spot.vehicleType].toLowerCase()
        }}<template v-if="spot.location"> · {{ spot.location }}</template
        ><template v-if="rate"> · {{ formatMoney(rate) }} al mes</template>.
      </p>
      <UiAlert v-if="error" color="danger" variant="soft">{{ error }}</UiAlert>

      <UiLabel title="Unidad" required :error="errors.unitId">
        <div
          v-if="unit"
          class="flex items-center justify-between gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-sm dark:bg-white/5"
        >
          <span class="font-medium">{{ unit.label }}</span>
          <UiButton size="sm" variant="ghost" @click="unit = null">Cambiar</UiButton>
        </div>
        <UnitPicker v-else autofocus @pick="(picked) => (unit = picked)" />
      </UiLabel>

      <UiSkeleton v-if="checking" class="h-20 rounded-xl" />
      <template v-else-if="eligibility">
        <UiAlert v-for="message in eligibility.errors" :key="message" color="danger" variant="soft">
          {{ message }}.
        </UiAlert>
        <UiAlert v-if="eligibility.warnings.length" color="warning" variant="soft">
          <p class="font-medium">No cumple todos los requisitos:</p>
          <ul class="mt-1 list-disc pl-5">
            <li v-for="message in eligibility.warnings" :key="message">{{ message }}</li>
          </ul>
          <p class="mt-1">Puedes asignarlo igual.</p>
        </UiAlert>
        <p class="text-sm text-neutral-500">
          Tiene {{ eligibility.spots }} de {{ eligibility.maxSpots }} parqueaderos
          permitidos<template v-if="eligibility.privateSpots">
            ({{ eligibility.privateSpots }} propio{{
              eligibility.privateSpots === 1 ? '' : 's'
            }})</template
          >.
        </p>
        <UiLabel title="Vehículo" :error="errors.vehicleId">
          <UiSelect
            v-model="form.vehicleId"
            :options="vehicleOptions"
            :placeholder="
              vehicleOptions.length ? 'Sin vehículo por ahora' : 'No tiene vehículos de este tipo'
            "
            :disabled="!vehicleOptions.length"
            block
          />
        </UiLabel>
      </template>

      <div class="grid gap-4 sm:grid-cols-2">
        <UiLabel title="Desde" required :error="errors.startsOn">
          <UiInput v-model="form.startsOn" type="date" required />
        </UiLabel>
        <UiLabel
          title="Hasta"
          :help-text="`Periodo del sorteo: ${months} meses. Vacío = sin fin.`"
          :error="errors.endsOn"
        >
          <UiInput v-model="form.endsOn" type="date" :min="form.startsOn" />
        </UiLabel>
      </div>
      <p v-if="form.endsOn" class="-mt-2 text-xs text-neutral-500">
        Del {{ formatDate(form.startsOn) }} al {{ formatDate(form.endsOn) }}. Se cobra con la cuota
        de cada mes, por días el primero y el último.
      </p>
      <UiLabel title="Notas" :error="errors.notes">
        <UiTextarea v-model="form.notes" rows="2" maxlength="500" block />
      </UiLabel>

      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UiButton variant="ghost" :disabled="saving" @click="open = false">Cancelar</UiButton>
          <UiButton type="submit" color="primary" :loading="saving" :disabled="blocked || !unit">
            Asignar
          </UiButton>
        </div>
      </template>
    </UiForm>
  </UiModal>
</template>
