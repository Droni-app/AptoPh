<script setup lang="ts">
import { ref, watch } from 'vue'
import { UiAlert, UiButton, UiForm, UiInput, UiLabel, UiModal, useToast } from '@aptoph/ui'
import type { Building } from '@aptoph/shared'
import { buildingsApi } from '@/api/backoffice'
import { errorMessage, fieldErrors } from '@/lib/errors'

const props = defineProps<{ building?: Building | null }>()
const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ saved: [building: Building] }>()

const toast = useToast()
const form = ref({ name: '', floors: '' as string | number })
const errors = ref<Record<string, string>>({})
const error = ref<string | null>(null)
const saving = ref(false)

watch(open, (isOpen) => {
  if (!isOpen) return
  form.value = { name: props.building?.name ?? '', floors: props.building?.floors ?? '' }
  errors.value = {}
  error.value = null
})

async function submit() {
  saving.value = true
  errors.value = {}
  error.value = null
  const input = { name: form.value.name, floors: form.value.floors === '' ? null : Number(form.value.floors) }
  try {
    const { data } = props.building
      ? await buildingsApi.update(props.building.id, input)
      : await buildingsApi.create(input)
    toast.success(props.building ? 'Torre actualizada' : 'Torre creada')
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
  <UiModal v-model="open" :title="building ? 'Editar torre' : 'Nueva torre'" size="sm" :persistent="saving">
    <UiForm :loading="saving" @submit="submit">
      <UiAlert v-if="error" color="danger" variant="soft">{{ error }}</UiAlert>
      <UiLabel title="Nombre" required :error="errors.name">
        <UiInput v-model="form.name" required maxlength="80" placeholder="Torre 1" autofocus />
      </UiLabel>
      <UiLabel title="Número de pisos" :error="errors.floors">
        <UiInput v-model="form.floors" type="number" min="1" max="200" />
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
