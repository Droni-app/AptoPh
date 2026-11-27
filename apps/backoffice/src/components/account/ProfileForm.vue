<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { UiButton, UiForm, UiInput, UiLabel, UiSelect, useToast } from '@aptoph/ui'
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
  <UiForm :loading="saving" @submit="submit">
    <UiLabel title="Nombre completo" required :error="errors.fullName">
      <UiInput v-model="form.fullName" autocomplete="name" required block />
    </UiLabel>
    <UiLabel
      title="Correo electrónico"
      help-text="Es tu usuario para entrar. Para cambiarlo, escribe a contacto@aptoph.com."
    >
      <UiInput :model-value="auth.user?.email ?? ''" type="email" disabled block />
    </UiLabel>
    <UiLabel title="Celular" :error="errors.phone">
      <UiInput
        v-model="form.phone"
        type="tel"
        autocomplete="tel"
        placeholder="300 123 4567"
        block
      />
    </UiLabel>
    <div class="grid gap-4 sm:grid-cols-2">
      <UiLabel title="Tipo de documento" :error="errors.documentType">
        <UiSelect v-model="form.documentType" :options="documentOptions" block />
      </UiLabel>
      <UiLabel title="Número de documento" :error="errors.documentNumber">
        <UiInput
          v-model="form.documentNumber"
          :disabled="!form.documentType"
          inputmode="numeric"
          block
        />
      </UiLabel>
    </div>
    <div>
      <UiButton type="submit" color="primary" :loading="saving">Guardar cambios</UiButton>
    </div>
  </UiForm>
</template>
