<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { DuiAlert, DuiButton, DuiForm, DuiInput, DuiLabel } from '@dronico/droni-kit'
import AuthShell from '@/components/AuthShell.vue'
import { useAuthStore } from '@/stores/auth'
import { useTenantStore } from '@/stores/tenant'
import { ApiError } from '@/lib/http'
import { errorMessage, fieldErrors } from '@/lib/errors'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const tenant = useTenantStore()

const form = ref({ email: '', password: '' })
const errors = ref<Record<string, string>>({})
const error = ref<string | null>(null)
const loading = ref(false)

async function submit() {
  loading.value = true
  errors.value = {}
  error.value = null
  try {
    await auth.login(form.value)
    // Another account may have used this browser: reload its conjuntos
    tenant.reset()
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    await router.replace(redirect.startsWith('/') ? redirect : '/')
  } catch (e) {
    errors.value = fieldErrors(e)
    // Wrong credentials (400) and blocked accounts (403) come with their own message
    error.value =
      e instanceof ApiError && (e.status === 400 || e.status === 403)
        ? e.message
        : Object.keys(errors.value).length
          ? null
          : errorMessage(e)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthShell>
    <p class="text-sm font-semibold text-mint-700 dark:text-mint-300">Portal de residentes</p>
    <h1 class="mt-1 text-3xl font-extrabold text-brand-700 dark:text-white">Hola de nuevo</h1>
    <p class="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
      Tu unidad, tus pagos, reservas, visitas y PQRS en un solo lugar.
    </p>

    <DuiForm :loading="loading" class="mt-8" @submit="submit">
      <DuiAlert v-if="error" color="danger" variant="soft" role="alert">{{ error }}</DuiAlert>
      <DuiLabel title="Correo electrónico" :error="errors.email">
        <DuiInput
          v-model="form.email"
          type="email"
          autocomplete="username"
          required
          autofocus
          block
        />
      </DuiLabel>
      <DuiLabel title="Contraseña" :error="errors.password">
        <DuiInput
          v-model="form.password"
          type="password"
          autocomplete="current-password"
          required
          block
        />
      </DuiLabel>
      <p class="-mt-1 text-right text-sm">
        <RouterLink
          to="/recuperar-contrasena"
          class="font-semibold text-brand-700 underline-offset-2 hover:underline dark:text-brand-200"
        >
          ¿Olvidaste tu contraseña?
        </RouterLink>
      </p>
      <DuiButton type="submit" color="primary" block :loading="loading"> Iniciar sesión </DuiButton>
    </DuiForm>

    <p
      class="mt-6 rounded-2xl bg-mint-50 px-4 py-3 text-sm text-neutral-700 dark:bg-mint-500/10 dark:text-neutral-200"
    >
      ¿No tienes cuenta? Pídele a la administración de tu conjunto que te invite.
    </p>
  </AuthShell>
</template>
