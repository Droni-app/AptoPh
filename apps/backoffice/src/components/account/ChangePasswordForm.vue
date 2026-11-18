<script setup lang="ts">
import { ref } from 'vue'
import { DuiButton, DuiForm, DuiInput, DuiLabel, useToast } from '@dronico/droni-kit'
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
  <DuiForm :loading="saving" @submit="submit">
    <DuiLabel title="Contraseña actual" :error="errors.currentPassword">
      <DuiInput
        v-model="form.currentPassword"
        type="password"
        autocomplete="current-password"
        required
        block
      />
    </DuiLabel>
    <DuiLabel
      title="Contraseña nueva"
      :error="errors.password"
      :help-text="errors.password ? undefined : 'Mínimo 8 caracteres, distinta a la actual.'"
    >
      <DuiInput
        v-model="form.password"
        type="password"
        autocomplete="new-password"
        minlength="8"
        required
        block
      />
    </DuiLabel>
    <DuiLabel title="Repite la contraseña nueva" :error="errors.confirmation">
      <DuiInput
        v-model="form.confirmation"
        type="password"
        autocomplete="new-password"
        required
        block
      />
    </DuiLabel>
    <div>
      <DuiButton type="submit" color="primary" :loading="saving">Cambiar contraseña</DuiButton>
    </div>
  </DuiForm>
</template>
