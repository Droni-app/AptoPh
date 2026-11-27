<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { UiAlert, UiButton, UiForm, UiInput, UiLabel } from '@aptoph/ui'
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
    <h1
      class="text-[2rem] leading-tight font-extrabold tracking-tight text-brand-700 dark:text-white"
    >
      Hola de nuevo
    </h1>
    <p class="mt-2 text-neutral-600 dark:text-neutral-300">
      Entra al panel de tu conjunto: administración, consejo, contabilidad y portería.
    </p>

    <UiForm class="mt-8" :loading="loading" @submit="submit">
      <UiAlert v-if="error" color="danger" variant="soft" role="alert">{{ error }}</UiAlert>
      <UiLabel title="Correo electrónico" :error="errors.email">
        <UiInput
          v-model="form.email"
          type="email"
          autocomplete="username"
          required
          autofocus
          block
        />
      </UiLabel>
      <UiLabel title="Contraseña" :error="errors.password">
        <UiInput
          v-model="form.password"
          type="password"
          autocomplete="current-password"
          required
          block
        />
      </UiLabel>
      <p class="-mt-1 text-right text-sm">
        <RouterLink
          to="/recuperar-contrasena"
          class="font-semibold text-brand-700 underline-offset-2 hover:underline dark:text-brand-200"
        >
          ¿Olvidaste tu contraseña?
        </RouterLink>
      </p>
      <UiButton type="submit" color="primary" size="lg" block :loading="loading" class="mt-2">
        Iniciar sesión
      </UiButton>
    </UiForm>

    <p
      class="mt-8 rounded-2xl bg-mint-50 px-4 py-3 text-sm text-mint-800 dark:bg-mint-400/10 dark:text-mint-200"
    >
      ¿Tu conjunto aún no usa AptoPH?
      <RouterLink to="/registro" class="font-semibold underline underline-offset-2">
        Prueba gratis 30 días
      </RouterLink>
    </p>
  </AuthShell>
</template>
