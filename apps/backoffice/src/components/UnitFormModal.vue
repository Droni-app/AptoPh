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
  UiTextarea,
  useToast,
} from '@aptoph/ui'
import {
  UNIT_STATUSES,
  UNIT_STATUS_LABELS,
  UNIT_TYPES,
  UNIT_TYPE_LABELS,
  type Building,
  type Unit,
  type UnitStatus,
  type UnitType,
} from '@aptoph/shared'
import { unitsApi } from '@/api/backoffice'
import { errorMessage, fieldErrors } from '@/lib/errors'

const props = defineProps<{ unit?: Unit | null; buildings: Building[] }>()
const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ saved: [unit: Unit] }>()

const toast = useToast()
const emptyForm = () => ({
  buildingId: '',
  code: '',
  type: 'apartment' as UnitType,
  floor: '' as string | number,
  privateArea: '' as string | number,
  /** Shown as a percentage (1.2345 %), stored as a fraction (0.012345) */
  coefficientPercent: '' as string | number,
  status: 'vacant' as UnitStatus,
  notes: '',
})
const form = ref(emptyForm())
const errors = ref<Record<string, string>>({})
const error = ref<string | null>(null)
const saving = ref(false)

const buildingOptions = computed(() => [
  { value: '', label: 'Sin torre' },
  ...props.buildings.map((building) => ({ value: building.id, label: building.name })),
])
const typeOptions = UNIT_TYPES.map((value) => ({ value, label: UNIT_TYPE_LABELS[value] }))
const statusOptions = UNIT_STATUSES.map((value) => ({ value, label: UNIT_STATUS_LABELS[value] }))

watch(open, (isOpen) => {
  if (!isOpen) return
  const unit = props.unit
  form.value = unit
    ? {
        buildingId: unit.buildingId ?? '',
        code: unit.code,
        type: unit.type,
        floor: unit.floor ?? '',
        privateArea: unit.privateArea ?? '',
        coefficientPercent: Number((Number(unit.ownershipCoefficient) * 100).toFixed(4)),
        status: unit.status,
        notes: unit.notes ?? '',
      }
    : emptyForm()
  errors.value = {}
  error.value = null
})

const toNumber = (value: string | number) => (value === '' ? null : Number(value))

async function submit() {
  saving.value = true
  errors.value = {}
  error.value = null
  const coefficient = toNumber(form.value.coefficientPercent)
  const input = {
    buildingId: form.value.buildingId || null,
    code: form.value.code,
    type: form.value.type,
    floor: toNumber(form.value.floor),
    privateArea: toNumber(form.value.privateArea),
    ownershipCoefficient: coefficient === null ? 0 : Number((coefficient / 100).toFixed(6)),
    status: form.value.status,
    notes: form.value.notes || null,
  }
  try {
    const { data } = props.unit ? await unitsApi.update(props.unit.id, input) : await unitsApi.create(input)
    toast.success(props.unit ? 'Unidad actualizada' : 'Unidad creada')
    emit('saved', data)
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
  <UiModal v-model="open" :title="unit ? `Editar unidad ${unit.code}` : 'Nueva unidad'" size="lg" :persistent="saving">
    <UiForm :loading="saving" @submit="submit">
      <UiAlert v-if="error" color="danger" variant="soft">{{ error }}</UiAlert>
      <div class="grid gap-4 sm:grid-cols-2">
        <UiLabel title="Torre" :error="errors.buildingId">
          <UiSelect v-model="form.buildingId" :options="buildingOptions" />
        </UiLabel>
        <UiLabel title="Código" required :error="errors.code" help-text="Ej. 302, T1-302, P-15">
          <UiInput v-model="form.code" required maxlength="30" />
        </UiLabel>
        <UiLabel title="Tipo" :error="errors.type">
          <UiSelect v-model="form.type" :options="typeOptions" />
        </UiLabel>
        <UiLabel title="Estado" :error="errors.status">
          <UiSelect v-model="form.status" :options="statusOptions" />
        </UiLabel>
        <UiLabel title="Piso" :error="errors.floor">
          <UiInput v-model="form.floor" type="number" min="-10" max="200" />
        </UiLabel>
        <UiLabel title="Área privada (m²)" :error="errors.privateArea">
          <UiInput v-model="form.privateArea" type="number" min="0" step="0.01" />
        </UiLabel>
        <UiLabel
          title="Coeficiente de copropiedad (%)"
          :error="errors.ownershipCoefficient"
          help-text="Porcentaje según el reglamento, ej. 1.2345"
        >
          <UiInput v-model="form.coefficientPercent" type="number" min="0" max="100" step="0.0001" />
        </UiLabel>
      </div>
      <UiLabel title="Notas" :error="errors.notes">
        <UiTextarea v-model="form.notes" rows="3" maxlength="2000" />
      </UiLabel>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UiButton variant="ghost" :disabled="saving" @click="open = false">Cancelar</UiButton>
          <UiButton type="submit" color="primary" :loading="saving">Guardar</UiButton>
        </div>
      </template>
    </UiForm>
  </UiModal>
</template>
