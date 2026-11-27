<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  UiAlert,
  UiButton,
  UiForm,
  UiInput,
  UiLabel,
  UiModal,
  UiSelect,
} from '@aptoph/ui'
import {
  VEHICLE_TYPES,
  VEHICLE_TYPE_LABELS,
  type ResidentVehicle,
  type VehicleType,
} from '@aptoph/shared'
import { residentApi } from '@/api/resident'
import { useSubmit } from '@/composables/useSubmit'

const props = defineProps<{ unitId: string; vehicle?: ResidentVehicle | null }>()
const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ saved: [] }>()

const { saving, errors, error, run, reset } = useSubmit()
const empty = () => ({ plate: '', type: 'car' as VehicleType, brand: '', model: '', color: '' })
const form = ref(empty())
const typeOptions = VEHICLE_TYPES.map((value) => ({ value, label: VEHICLE_TYPE_LABELS[value] }))

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
      }
    : empty()
  reset()
})

async function submit() {
  const f = form.value
  const input = {
    plate: f.plate,
    type: f.type,
    brand: f.brand || null,
    model: f.model || null,
    color: f.color || null,
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
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UiButton variant="ghost" :disabled="saving" @click="open = false">Cancelar</UiButton>
          <UiButton type="submit" color="primary" :loading="saving">Guardar</UiButton>
        </div>
      </template>
    </UiForm>
  </UiModal>
</template>
