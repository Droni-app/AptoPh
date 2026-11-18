<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { DuiButton, DuiForm, DuiInput, DuiLabel, DuiSelect, useToast } from '@dronico/droni-kit'
import { DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS, type DocumentType } from '@aptoph/shared'
import { accountApi } from '@/api/account'
import { useAuthStore } from '@/stores/auth'
import { errorMessage, fieldErrors } from '@/lib/errors'

const auth = useAuthStore()
const toast = useToast()

const form = ref({ fullName: '', phone: '', documentType: '', documentNumber: '' })
const errors = ref<Record<string, string>>({})
const saving = ref(false)

const documentOptions = [
  { value: '', label: 'Sin documento' },
  ...DOCUMENT_TYPES.map((value) => ({ value, label: DOCUMENT_TYPE_LABELS[value] })),
]

watchEffect(() => {
  const user = auth.user
  if (!user) return
  form.value = {
    fullName: user.fullName,
    phone: user.phone ?? '',
    documentType: user.documentType ?? '',
    documentNumber: user.documentNumber ?? '',
  }
})

async function submit() {
  saving.value = true
  errors.value = {}
  try {
    const { data } = await accountApi.updateProfile({
      fullName: form.value.fullName,
      phone: form.value.phone || null,
      documentType: (form.value.documentType || null) as DocumentType | null,
      documentNumber: form.value.documentNumber || null,
    })
    auth.setUser(data)
    toast.success('Guardamos tus datos')
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
    <DuiLabel title="Nombre completo" required :error="errors.fullName">
      <DuiInput v-model="form.fullName" autocomplete="name" required block />
    </DuiLabel>
    <DuiLabel
      title="Correo electrónico"
      help-text="Es tu usuario para entrar. Para cambiarlo, escribe a contacto@aptoph.com."
    >
      <DuiInput :model-value="auth.user?.email ?? ''" type="email" disabled block />
    </DuiLabel>
    <DuiLabel title="Celular" :error="errors.phone">
      <DuiInput
        v-model="form.phone"
        type="tel"
        autocomplete="tel"
        placeholder="300 123 4567"
        block
      />
    </DuiLabel>
    <div class="grid gap-4 sm:grid-cols-2">
      <DuiLabel title="Tipo de documento" :error="errors.documentType">
        <DuiSelect v-model="form.documentType" :options="documentOptions" block />
      </DuiLabel>
      <DuiLabel title="Número de documento" :error="errors.documentNumber">
        <DuiInput
          v-model="form.documentNumber"
          :disabled="!form.documentType"
          inputmode="numeric"
          block
        />
      </DuiLabel>
    </div>
    <div>
      <DuiButton type="submit" color="primary" :loading="saving">Guardar cambios</DuiButton>
    </div>
  </DuiForm>
</template>
