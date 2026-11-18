<script setup lang="ts">
import { ref } from 'vue'
import { DuiAlert, DuiButton, DuiForm, DuiInput, DuiLabel } from '@dronico/droni-kit'
import AuthShell from '@/components/AuthShell.vue'
import { publicAuthApi } from '@/api/account'
import { errorMessage, fieldErrors } from '@/lib/errors'

const email = ref('')
const errors = ref<Record<string, string>>({})
const error = ref<string | null>(null)
const loading = ref(false)
const sent = ref(false)

async function submit() {
  loading.value = true
  errors.value = {}
  error.value = null
  try {
    await publicAuthApi.forgotPassword(email.value)
    sent.value = true
  } catch (e) {
    errors.value = fieldErrors(e)
    error.value = Object.keys(errors.value).length ? null : errorMessage(e)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthShell>
    <h1
      class="text-[2rem] leading-tight font-extrabold tracking-tight text-brand-700 dark:text-white"
    >
      ¿Olvidaste tu contraseña?
    </h1>

    <template v-if="sent">
      <DuiAlert color="success" variant="soft" class="mt-6" role="status">
        Si <strong>{{ email }}</strong> tiene una cuenta en AptoPH, te enviamos un enlace para crear
        una contraseña nueva. Revisa tu bandeja de entrada y la carpeta de spam; el enlace funciona
        durante 1 hora.
      </DuiAlert>
      <DuiButton class="mt-6" variant="outline" block @click="sent = false">
        Enviar a otro correo
      </DuiButton>
    </template>

    <template v-else>
      <p class="mt-2 text-neutral-600 dark:text-neutral-300">
        Escribe el correo con el que entras y te enviaremos un enlace para crear una nueva.
      </p>
      <DuiForm class="mt-8" :loading="loading" @submit="submit">
        <DuiAlert v-if="error" color="danger" variant="soft" role="alert">{{ error }}</DuiAlert>
        <DuiLabel title="Correo electrónico" :error="errors.email">
          <DuiInput v-model="email" type="email" autocomplete="username" required autofocus block />
        </DuiLabel>
        <DuiButton type="submit" color="primary" size="lg" block :loading="loading" class="mt-2">
          Enviar enlace
        </DuiButton>
      </DuiForm>
    </template>

    <p class="mt-8 text-sm">
      <RouterLink to="/login" class="font-semibold text-brand-700 underline dark:text-brand-200">
        Volver a iniciar sesión
      </RouterLink>
    </p>
  </AuthShell>
</template>
