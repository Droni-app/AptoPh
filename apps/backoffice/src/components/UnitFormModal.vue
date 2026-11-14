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
  DuiTextarea,
  useToast,
} from '@dronico/droni-kit'
import {
  UNIT_STATUSES,
  UNIT_STATUS_LABELS,
  UNIT_TYPES,
  UNIT_TYPE_LABELS,
  type Building,
  type Unit,
  type UnitStatus,
  type UnitType,
} from '@apartadock/shared'
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
  <DuiModal v-model="open" :title="unit ? `Editar unidad ${unit.code}` : 'Nueva unidad'" size="lg" :persistent="saving">
    <DuiForm :loading="saving" @submit="submit">
      <DuiAlert v-if="error" color="danger" variant="soft">{{ error }}</DuiAlert>
      <div class="grid gap-4 sm:grid-cols-2">
        <DuiLabel title="Torre" :error="errors.buildingId">
          <DuiSelect v-model="form.buildingId" :options="buildingOptions" />
        </DuiLabel>
        <DuiLabel title="Código" required :error="errors.code" help-text="Ej. 302, T1-302, P-15">
          <DuiInput v-model="form.code" required maxlength="30" />
        </DuiLabel>
        <DuiLabel title="Tipo" :error="errors.type">
          <DuiSelect v-model="form.type" :options="typeOptions" />
        </DuiLabel>
        <DuiLabel title="Estado" :error="errors.status">
          <DuiSelect v-model="form.status" :options="statusOptions" />
        </DuiLabel>
        <DuiLabel title="Piso" :error="errors.floor">
          <DuiInput v-model="form.floor" type="number" min="-10" max="200" />
        </DuiLabel>
        <DuiLabel title="Área privada (m²)" :error="errors.privateArea">
          <DuiInput v-model="form.privateArea" type="number" min="0" step="0.01" />
        </DuiLabel>
        <DuiLabel
          title="Coeficiente de copropiedad (%)"
          :error="errors.ownershipCoefficient"
          help-text="Porcentaje según el reglamento, ej. 1.2345"
        >
          <DuiInput v-model="form.coefficientPercent" type="number" min="0" max="100" step="0.0001" />
        </DuiLabel>
      </div>
      <DuiLabel title="Notas" :error="errors.notes">
        <DuiTextarea v-model="form.notes" rows="3" maxlength="2000" />
      </DuiLabel>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <DuiButton variant="ghost" :disabled="saving" @click="open = false">Cancelar</DuiButton>
          <DuiButton type="submit" color="primary" :loading="saving">Guardar</DuiButton>
        </div>
      </template>
    </DuiForm>
  </DuiModal>
</template>
