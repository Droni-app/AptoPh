<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { UiAlert, UiButton, UiForm, UiInput, UiLabel, UiModal, UiRadio, UiSelect } from '@aptoph/ui'
import {
  DOCUMENTED_VEHICLE_TYPES,
  DOCUMENT_TYPES,
  VEHICLE_OWNER_RELATIONSHIPS,
  VEHICLE_OWNER_RELATIONSHIP_LABELS,
  VEHICLE_TYPES,
  VEHICLE_TYPE_LABELS,
  type DocumentType,
  type ResidentVehicle,
  type VehicleOwnerRelationship,
  type VehicleOwnerType,
  type VehicleType,
} from '@aptoph/shared'
import { residentApi } from '@/api/resident'
import { useSubmit } from '@/composables/useSubmit'

const props = defineProps<{
  unitId: string
  vehicle?: ResidentVehicle | null
  /** The conjunto allows vehicles in the name of someone else */
  allowThirdParty?: boolean
}>()
const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ saved: [] }>()

const { saving, errors, error, run, reset } = useSubmit()
const empty = () => ({
  plate: '',
  type: 'car' as VehicleType,
  brand: '',
  model: '',
  color: '',
  ownerType: 'resident' as VehicleOwnerType,
  ownerName: '',
  ownerDocumentType: 'CC' as DocumentType,
  ownerDocumentNumber: '',
  ownerRelationship: 'family' as VehicleOwnerRelationship,
  ownerPhone: '',
  soatExpiresOn: '',
  inspectionExpiresOn: '',
})
const form = ref(empty())
const typeOptions = VEHICLE_TYPES.map((value) => ({ value, label: VEHICLE_TYPE_LABELS[value] }))
const ownerOptions = [
  { value: 'resident', label: 'Es mío o de alguien de la unidad' },
  { value: 'third_party', label: 'Está a nombre de otra persona o empresa' },
]
const documentOptions = DOCUMENT_TYPES.map((value) => ({ value, label: value }))
const relationshipOptions = VEHICLE_OWNER_RELATIONSHIPS.map((value) => ({
  value,
  label: VEHICLE_OWNER_RELATIONSHIP_LABELS[value],
}))

/** A third-party vehicle stays editable even if the conjunto stops allowing new ones */
const canChooseOwner = computed(
  () => props.allowThirdParty || props.vehicle?.ownerType === 'third_party',
)
const documented = computed(() => DOCUMENTED_VEHICLE_TYPES.includes(form.value.type))

watch(open, (isOpen) => {
  if (!isOpen) return
  const v = props.vehicle
  form.value = v
    ? {
        plate: v.plate,
        type: v.type,
        brand: v.brand ?? '',
        model: v.model ?? '',
        color: v.color ?? '',
        ownerType: v.ownerType,
        ownerName: v.ownerName ?? '',
        ownerDocumentType: v.ownerDocumentType ?? 'CC',
        ownerDocumentNumber: v.ownerDocumentNumber ?? '',
        ownerRelationship: v.ownerRelationship ?? 'family',
        ownerPhone: v.ownerPhone ?? '',
        soatExpiresOn: v.soatExpiresOn ?? '',
        inspectionExpiresOn: v.inspectionExpiresOn ?? '',
      }
    : empty()
  reset()
})

async function submit() {
  const f = form.value
  const thirdParty = f.ownerType === 'third_party'
  const input = {
    plate: f.plate,
    type: f.type,
    brand: f.brand || null,
    model: f.model || null,
    color: f.color || null,
    ownerType: f.ownerType,
    ownerName: thirdParty ? f.ownerName || null : null,
    ownerDocumentType: thirdParty && f.ownerDocumentNumber ? f.ownerDocumentType : null,
    ownerDocumentNumber: thirdParty ? f.ownerDocumentNumber || null : null,
    ownerRelationship: thirdParty ? f.ownerRelationship : null,
    ownerPhone: thirdParty ? f.ownerPhone || null : null,
    soatExpiresOn: documented.value ? f.soatExpiresOn || null : null,
    inspectionExpiresOn: documented.value ? f.inspectionExpiresOn || null : null,
  }
  const ok = await run(
    () =>
      props.vehicle
        ? residentApi.vehicles.update(props.vehicle.id, input)
        : residentApi.vehicles.create(props.unitId, input),
    props.vehicle ? 'Vehículo actualizado' : 'Vehículo registrado',
  )
  if (ok) {
    emit('saved')
    open.value = false
  }
}
</script>

<template>
  <UiModal
    v-model="open"
    :title="vehicle ? 'Editar vehículo' : 'Registrar vehículo'"
    :persistent="saving"
    scrollable
  >
    <UiForm :loading="saving" @submit="submit">
      <UiAlert v-if="error" color="danger" variant="soft">{{ error }}</UiAlert>
      <div class="grid gap-4 sm:grid-cols-2">
        <UiLabel title="Placa" required :error="errors.plate">
          <UiInput
            v-model="form.plate"
            required
            maxlength="12"
            autocomplete="off"
            class="uppercase"
            placeholder="ABC123"
          />
        </UiLabel>
        <UiLabel title="Tipo" required :error="errors.type">
          <UiSelect v-model="form.type" :options="typeOptions" />
        </UiLabel>
        <UiLabel title="Marca" :error="errors.brand">
          <UiInput v-model="form.brand" maxlength="60" />
        </UiLabel>
        <UiLabel title="Línea o modelo" :error="errors.model">
          <UiInput v-model="form.model" maxlength="60" />
        </UiLabel>
        <UiLabel title="Color" :error="errors.color">
          <UiInput v-model="form.color" maxlength="30" />
        </UiLabel>
      </div>

      <div v-if="documented" class="grid gap-4 sm:grid-cols-2">
        <UiLabel
          title="SOAT vigente hasta"
          help-text="La administración puede pedirlo para asignar parqueadero."
          :error="errors.soatExpiresOn"
        >
          <UiInput v-model="form.soatExpiresOn" type="date" />
        </UiLabel>
        <UiLabel
          title="Tecnomecánica vigente hasta"
          help-text="Vacío si el vehículo aún no la necesita."
          :error="errors.inspectionExpiresOn"
        >
          <UiInput v-model="form.inspectionExpiresOn" type="date" />
        </UiLabel>
      </div>

      <template v-if="canChooseOwner">
        <UiLabel title="Propietario" :error="errors.ownerType">
          <UiRadio v-model="form.ownerType" :options="ownerOptions" name="ownerType" />
        </UiLabel>
        <div v-if="form.ownerType === 'third_party'" class="grid gap-4 sm:grid-cols-2">
          <UiLabel
            title="Nombre del propietario"
            required
            :error="errors.ownerName"
            class="sm:col-span-2"
          >
            <UiInput
              v-model="form.ownerName"
              required
              maxlength="150"
              placeholder="Persona o empresa"
            />
          </UiLabel>
          <UiLabel title="Tipo de documento" :error="errors.ownerDocumentType">
            <UiSelect v-model="form.ownerDocumentType" :options="documentOptions" />
          </UiLabel>
          <UiLabel title="Número de documento" :error="errors.ownerDocumentNumber">
            <UiInput v-model="form.ownerDocumentNumber" maxlength="30" />
          </UiLabel>
          <UiLabel title="Relación con la unidad" :error="errors.ownerRelationship">
            <UiSelect v-model="form.ownerRelationship" :options="relationshipOptions" />
          </UiLabel>
          <UiLabel title="Teléfono del propietario" :error="errors.ownerPhone">
            <UiInput v-model="form.ownerPhone" type="tel" maxlength="30" />
          </UiLabel>
        </div>
      </template>

      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UiButton variant="ghost" :disabled="saving" @click="open = false">Cancelar</UiButton>
          <UiButton type="submit" color="primary" :loading="saving">Guardar</UiButton>
        </div>
      </template>
    </UiForm>
  </UiModal>
</template>
