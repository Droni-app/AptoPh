<script setup lang="ts">
import { ref, watch } from 'vue'
import { DuiAlert, DuiButton, DuiCheckbox, DuiForm, DuiInput, DuiLabel, DuiModal, DuiSelect } from '@dronico/droni-kit'
import { PET_SPECIES, PET_SPECIES_LABELS, type PetSpecies, type ResidentPet } from '@aptoph/shared'
import { residentApi } from '@/api/resident'
import { useSubmit } from '@/composables/useSubmit'

const props = defineProps<{ unitId: string; pet?: ResidentPet | null }>()
const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ saved: [] }>()

const { saving, errors, error, run, reset } = useSubmit()
const empty = () => ({ name: '', species: 'dog' as PetSpecies, breed: '', isPotentiallyDangerous: false })
const form = ref(empty())
const speciesOptions = PET_SPECIES.map((value) => ({ value, label: PET_SPECIES_LABELS[value] }))

watch(open, (isOpen) => {
  if (!isOpen) return
  const p = props.pet
  form.value = p
    ? { name: p.name, species: p.species, breed: p.breed ?? '', isPotentiallyDangerous: p.isPotentiallyDangerous }
    : empty()
  reset()
})

async function submit() {
  const input = { ...form.value, breed: form.value.breed || null }
  const ok = await run(
    () => (props.pet ? residentApi.pets.update(props.pet.id, input) : residentApi.pets.create(props.unitId, input)),
    props.pet ? 'Mascota actualizada' : 'Mascota registrada',
  )
  if (ok) {
    emit('saved')
    open.value = false
  }
}
</script>

<template>
  <DuiModal v-model="open" :title="pet ? 'Editar mascota' : 'Registrar mascota'" :persistent="saving">
    <DuiForm :loading="saving" @submit="submit">
      <DuiAlert v-if="error" color="danger" variant="soft">{{ error }}</DuiAlert>
      <div class="grid gap-4 sm:grid-cols-2">
        <DuiLabel title="Nombre" required :error="errors.name">
          <DuiInput v-model="form.name" required maxlength="60" />
        </DuiLabel>
        <DuiLabel title="Especie" required :error="errors.species">
          <DuiSelect v-model="form.species" :options="speciesOptions" />
        </DuiLabel>
        <DuiLabel title="Raza" :error="errors.breed" class="sm:col-span-2">
          <DuiInput v-model="form.breed" maxlength="60" />
        </DuiLabel>
      </div>
      <DuiCheckbox v-model="form.isPotentiallyDangerous" label="Raza potencialmente peligrosa (Ley 1801 de 2016)" />
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <DuiButton variant="ghost" :disabled="saving" @click="open = false">Cancelar</DuiButton>
          <DuiButton type="submit" color="primary" :loading="saving">Guardar</DuiButton>
        </div>
      </template>
    </DuiForm>
  </DuiModal>
</template>
