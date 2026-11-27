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
  UiSwitch,
  UiTabs,
  UiTextarea,
  useToast,
} from '@aptoph/ui'
import {
  PARKING_OWNERSHIPS,
  PARKING_OWNERSHIP_LABELS,
  VEHICLE_TYPES,
  VEHICLE_TYPE_LABELS,
  type ParkingMode,
  type ParkingOwnership,
  type ParkingSpot,
  type VehicleType,
} from '@aptoph/shared'
import UnitPicker, { type PickedUnit } from '@/components/finance/UnitPicker.vue'
import { parkingApi } from '@/api/parking'
import { errorMessage, fieldErrors } from '@/lib/errors'

const props = defineProps<{ spot?: ParkingSpot | null; mode: ParkingMode }>()
const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ saved: [] }>()
const toast = useToast()

const tab = ref<'one' | 'batch'>('one')
const defaultOwnership = (): ParkingOwnership => (props.mode === 'private' ? 'private' : 'communal')
const empty = () => ({
  code: '',
  vehicleType: 'car' as VehicleType,
  ownership: defaultOwnership(),
  isCovered: false,
  location: '',
  notes: '',
  isActive: true,
  prefix: 'P-',
  from: 1 as number | string,
  to: 20 as number | string,
  digits: 3 as number | string,
})
const form = ref(empty())
const owner = ref<PickedUnit | null>(null)
const errors = ref<Record<string, string>>({})
const error = ref<string | null>(null)
const saving = ref(false)

watch(open, (isOpen) => {
  if (!isOpen) return
  const spot = props.spot
  tab.value = 'one'
  form.value = spot
    ? {
        ...empty(),
        code: spot.code,
        vehicleType: spot.vehicleType,
        ownership: spot.ownership,
        isCovered: spot.isCovered,
        location: spot.location ?? '',
        notes: spot.notes ?? '',
        isActive: spot.isActive,
      }
    : empty()
  owner.value = spot?.ownerUnit
    ? {
        id: spot.ownerUnit.id,
        code: spot.ownerUnit.code,
        label: [spot.ownerUnit.building?.name, spot.ownerUnit.code].filter(Boolean).join(' · '),
      }
    : null
  errors.value = {}
  error.value = null
})

const typeOptions = VEHICLE_TYPES.map((value) => ({ value, label: VEHICLE_TYPE_LABELS[value] }))
const ownershipOptions = PARKING_OWNERSHIPS.map((value) => ({
  value,
  label: PARKING_OWNERSHIP_LABELS[value],
}))
const tabs = [
  { label: 'Uno', value: 'one' },
  { label: 'Varios comunales', value: 'batch' },
]
const batch = computed(() => !props.spot && tab.value === 'batch')
const preview = computed(() => {
  const f = form.value
  const pad = (n: number) => `${f.prefix}${String(n).padStart(Number(f.digits) || 1, '0')}`
  const from = Number(f.from)
  const to = Number(f.to)
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return null
  return { first: pad(from), last: pad(to), count: to - from + 1 }
})

async function submit() {
  saving.value = true
  errors.value = {}
  error.value = null
  const f = form.value
  const common = {
    vehicleType: f.vehicleType,
    isCovered: f.isCovered,
    location: f.location || null,
    notes: f.notes || null,
  }
  try {
    if (batch.value) {
      const { data } = await parkingApi.createBatch({
        ...common,
        ownership: 'communal',
        prefix: f.prefix,
        from: Number(f.from),
        to: Number(f.to),
        digits: Number(f.digits),
      })
      toast.success(`Se crearon ${data.created} parqueaderos`)
    } else {
      const input = {
        ...common,
        code: f.code,
        ownership: f.ownership,
        ownerUnitId: f.ownership === 'private' ? (owner.value?.id ?? null) : null,
        isActive: f.isActive,
      }
      if (props.spot) await parkingApi.updateSpot(props.spot.id, input)
      else await parkingApi.createSpot(input)
      toast.success(props.spot ? 'Parqueadero actualizado' : 'Parqueadero creado')
    }
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
    :title="spot ? `Parqueadero ${spot.code}` : 'Nuevo parqueadero'"
    :persistent="saving"
  >
    <UiForm :loading="saving" @submit="submit">
      <UiTabs
        v-if="!spot && mode !== 'private'"
        v-model="tab"
        :tabs="tabs"
        variant="pills"
        size="sm"
        aria-label="Cuántos"
      />
      <UiAlert v-if="error" color="danger" variant="soft">{{ error }}</UiAlert>

      <template v-if="batch">
        <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <UiLabel title="Prefijo" :error="errors.prefix">
            <UiInput v-model="form.prefix" maxlength="10" placeholder="P-" />
          </UiLabel>
          <UiLabel title="Desde" required :error="errors.from">
            <UiInput v-model="form.from" type="number" min="0" required />
          </UiLabel>
          <UiLabel title="Hasta" required :error="errors.to">
            <UiInput v-model="form.to" type="number" min="0" required />
          </UiLabel>
          <UiLabel title="Dígitos" :error="errors.digits">
            <UiInput v-model="form.digits" type="number" min="1" max="6" />
          </UiLabel>
        </div>
        <p v-if="preview" class="text-sm text-neutral-500">
          Se crearán {{ preview.count }} parqueaderos comunales:
          <span class="font-mono font-medium">{{ preview.first }}</span> a
          <span class="font-mono font-medium">{{ preview.last }}</span
          >.
        </p>
      </template>
      <div v-else class="grid gap-4 sm:grid-cols-2">
        <UiLabel title="Código" required :error="errors.code">
          <UiInput v-model="form.code" required maxlength="20" placeholder="P-012" autofocus />
        </UiLabel>
        <UiLabel v-if="mode === 'mixed' || spot" title="Tipo" required :error="errors.ownership">
          <UiSelect v-model="form.ownership" :options="ownershipOptions" block />
        </UiLabel>
      </div>

      <UiLabel
        v-if="!batch && form.ownership === 'private'"
        title="Unidad propietaria"
        required
        :error="errors.ownerUnitId"
      >
        <div
          v-if="owner"
          class="flex items-center justify-between gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-sm dark:bg-white/5"
        >
          <span class="font-medium">{{ owner.label }}</span>
          <UiButton size="sm" variant="ghost" @click="owner = null">Cambiar</UiButton>
        </div>
        <UnitPicker v-else @pick="(picked) => (owner = picked)" />
      </UiLabel>

      <div class="grid gap-4 sm:grid-cols-2">
        <UiLabel title="Para" required :error="errors.vehicleType">
          <UiSelect v-model="form.vehicleType" :options="typeOptions" block />
        </UiLabel>
        <UiLabel title="Ubicación" :error="errors.location">
          <UiInput v-model="form.location" maxlength="80" placeholder="Sótano 1, torre 2" />
        </UiLabel>
      </div>
      <UiSwitch v-model="form.isCovered" label="Cubierto" />
      <UiLabel title="Notas" :error="errors.notes">
        <UiTextarea v-model="form.notes" rows="2" maxlength="500" block />
      </UiLabel>
      <UiSwitch
        v-if="spot"
        v-model="form.isActive"
        label="Disponible"
        description="Apágalo si está fuera de servicio: no se asigna ni cuenta como libre."
      />

      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UiButton variant="ghost" :disabled="saving" @click="open = false">Cancelar</UiButton>
          <UiButton type="submit" color="primary" :loading="saving">
            {{ batch && preview ? `Crear ${preview.count}` : 'Guardar' }}
          </UiButton>
        </div>
      </template>
    </UiForm>
  </UiModal>
</template>
