<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  UiAlert,
  UiButton,
  UiCheckbox,
  UiForm,
  UiInput,
  UiLabel,
  UiModal,
  UiSelect,
} from '@aptoph/ui'
import { PET_SPECIES, PET_SPECIES_LABELS, type PetSpecies, type ResidentPet } from '@aptoph/shared'
import { residentApi } from '@/api/resident'
import { useSubmit } from '@/composables/useSubmit'

const props = defineProps<{ unitId: string; pet?: ResidentPet | null }>()
const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ saved: [] }>()

const { saving, errors, error, run, reset } = useSubmit()
const empty = () => ({
  name: '',
  species: 'dog' as PetSpecies,
  breed: '',
  isPotentiallyDangerous: false,
})
const form = ref(empty())
const speciesOptions = PET_SPECIES.map((value) => ({ value, label: PET_SPECIES_LABELS[value] }))

watch(open, (isOpen) => {
  if (!isOpen) return
  const p = props.pet
  form.value = p
    ? {
        name: p.name,
        species: p.species,
        breed: p.breed ?? '',
        isPotentiallyDangerous: p.isPotentiallyDangerous,
      }
    : empty()
  reset()
})

async function submit() {
  const input = { ...form.value, breed: form.value.breed || null }
  const ok = await run(
    () =>
      props.pet
        ? residentApi.pets.update(props.pet.id, input)
        : residentApi.pets.create(props.unitId, input),
    props.pet ? 'Mascota actualizada' : 'Mascota registrada',
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
    :title="pet ? 'Editar mascota' : 'Registrar mascota'"
    :persistent="saving"
  >
    <UiForm :loading="saving" @submit="submit">
      <UiAlert v-if="error" color="danger" variant="soft">{{ error }}</UiAlert>
      <div class="grid gap-4 sm:grid-cols-2">
        <UiLabel title="Nombre" required :error="errors.name">
          <UiInput v-model="form.name" required maxlength="60" />
        </UiLabel>
        <UiLabel title="Especie" required :error="errors.species">
          <UiSelect v-model="form.species" :options="speciesOptions" />
        </UiLabel>
        <UiLabel title="Raza" :error="errors.breed" class="sm:col-span-2">
          <UiInput v-model="form.breed" maxlength="60" />
        </UiLabel>
      </div>
      <UiCheckbox
        v-model="form.isPotentiallyDangerous"
        label="Raza potencialmente peligrosa (Ley 1801 de 2016)"
      />
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UiButton variant="ghost" :disabled="saving" @click="open = false">Cancelar</UiButton>
          <UiButton type="submit" color="primary" :loading="saving">Guardar</UiButton>
        </div>
      </template>
    </UiForm>
  </UiModal>
</template>
