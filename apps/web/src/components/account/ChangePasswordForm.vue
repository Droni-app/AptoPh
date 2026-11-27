<script setup lang="ts">
import { ref } from 'vue'
import { UiButton, UiForm, UiInput, UiLabel, useToast } from '@aptoph/ui'
import { accountApi } from '@/api/account'
import { errorMessage, fieldErrors } from '@/lib/errors'

const emit = defineEmits<{ changed: [] }>()
const toast = useToast()

const empty = () => ({ currentPassword: '', password: '', confirmation: '' })
const form = ref(empty())
const errors = ref<Record<string, string>>({})
const saving = ref(false)

async function submit() {
  errors.value = {}
  if (form.value.password !== form.value.confirmation) {
    errors.value = { confirmation: 'Las contraseñas no coinciden' }
    return
  }
  saving.value = true
  try {
    await accountApi.changePassword({
      currentPassword: form.value.currentPassword,
      password: form.value.password,
    })
    form.value = empty()
    toast.success('Cambiamos tu contraseña y cerramos las demás sesiones')
    emit('changed')
  } catch (e) {
    errors.value = fieldErrors(e)
    if (!Object.keys(errors.value).length) toast.error(errorMessage(e))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UiForm :loading="saving" @submit="submit">
    <UiLabel title="Contraseña actual" :error="errors.currentPassword">
      <UiInput
        v-model="form.currentPassword"
        type="password"
        autocomplete="current-password"
        required
        block
      />
    </UiLabel>
    <UiLabel
      title="Contraseña nueva"
      :error="errors.password"
      :help-text="errors.password ? undefined : 'Mínimo 8 caracteres, distinta a la actual.'"
    >
      <UiInput
        v-model="form.password"
        type="password"
        autocomplete="new-password"
        minlength="8"
        required
        block
      />
    </UiLabel>
    <UiLabel title="Repite la contraseña nueva" :error="errors.confirmation">
      <UiInput
        v-model="form.confirmation"
        type="password"
        autocomplete="new-password"
        required
        block
      />
    </UiLabel>
    <div>
      <UiButton type="submit" color="primary" :loading="saving">Cambiar contraseña</UiButton>
    </div>
  </UiForm>
</template>
