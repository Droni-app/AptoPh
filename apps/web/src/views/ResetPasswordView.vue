<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { UiAlert, UiButton, UiForm, UiInput, UiLabel, useToast } from '@aptoph/ui'
import AuthShell from '@/components/AuthShell.vue'
import { publicAuthApi } from '@/api/account'
import { useAuthStore } from '@/stores/auth'
import { useTenantStore } from '@/stores/tenant'
import { ApiError } from '@/lib/http'
import { errorMessage, fieldErrors } from '@/lib/errors'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const tenant = useTenantStore()
const toast = useToast()

const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))
const form = ref({ password: '', confirmation: '' })
const errors = ref<Record<string, string>>({})
const error = ref<string | null>(null)
const loading = ref(false)

async function submit() {
  errors.value = {}
  error.value = null
  if (form.value.password !== form.value.confirmation) {
    errors.value = { confirmation: 'Las contraseñas no coinciden' }
    return
  }
  loading.value = true
  try {
    const { data } = await publicAuthApi.resetPassword(
      token.value,
      form.value.password,
      auth.device,
    )
    auth.start(data)
    tenant.reset()
    toast.success('Listo, tu contraseña cambió. Cerramos las demás sesiones.')
    await router.replace('/')
  } catch (e) {
    errors.value = fieldErrors(e)
    error.value =
      e instanceof ApiError && e.status === 400
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
      Crea una contraseña nueva
    </h1>

    <UiAlert v-if="!token" color="danger" variant="soft" class="mt-6" role="alert">
      El enlace está incompleto. Ábrelo de nuevo desde el correo o solicita uno nuevo.
    </UiAlert>

    <template v-else>
      <p class="mt-2 text-neutral-600 dark:text-neutral-300">
        Usa al menos 8 caracteres. Al guardarla cerraremos las sesiones abiertas en otros
        dispositivos.
      </p>
      <UiForm class="mt-8" :loading="loading" @submit="submit">
        <UiAlert v-if="error" color="danger" variant="soft" role="alert">
          {{ error }}
          <RouterLink to="/recuperar-contrasena" class="ml-1 font-semibold underline">
            Solicitar otro enlace
          </RouterLink>
        </UiAlert>
        <UiLabel title="Contraseña nueva" :error="errors.password">
          <UiInput
            v-model="form.password"
            type="password"
            autocomplete="new-password"
            minlength="8"
            required
            autofocus
            block
          />
        </UiLabel>
        <UiLabel title="Repite la contraseña" :error="errors.confirmation">
          <UiInput
            v-model="form.confirmation"
            type="password"
            autocomplete="new-password"
            required
            block
          />
        </UiLabel>
        <UiButton type="submit" color="primary" size="lg" block :loading="loading" class="mt-2">
          Guardar y entrar
        </UiButton>
      </UiForm>
    </template>

    <p class="mt-8 text-sm">
      <RouterLink
        to="/recuperar-contrasena"
        class="font-semibold text-brand-700 underline dark:text-brand-200"
      >
        Solicitar un enlace nuevo
      </RouterLink>
    </p>
  </AuthShell>
</template>
