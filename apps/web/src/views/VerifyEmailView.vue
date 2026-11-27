<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { UiAlert, UiButton, UiSkeleton } from '@aptoph/ui'
import AuthShell from '@/components/AuthShell.vue'
import { publicAuthApi } from '@/api/account'
import { useAuthStore } from '@/stores/auth'
import { errorMessage } from '@/lib/errors'

const route = useRoute()
const auth = useAuthStore()
const state = ref<'loading' | 'done' | 'error'>('loading')
const error = ref('')

onMounted(async () => {
  const token = typeof route.query.token === 'string' ? route.query.token : ''
  try {
    if (!token) throw new Error('missing')
    await publicAuthApi.verifyEmail(token)
    state.value = 'done'
    // Signed in: refresh the profile so the reminder disappears
    if (auth.isAuthenticated) await auth.loadProfile().catch(() => undefined)
  } catch (e) {
    error.value = token
      ? errorMessage(e)
      : 'El enlace está incompleto. Ábrelo de nuevo desde el correo.'
    state.value = 'error'
  }
})
</script>

<template>
  <AuthShell>
    <h1
      class="text-[2rem] leading-tight font-extrabold tracking-tight text-brand-700 dark:text-white"
    >
      Confirmación de correo
    </h1>

    <div v-if="state === 'loading'" class="mt-6" aria-busy="true">
      <UiSkeleton height="4rem" variant="rounded" />
    </div>
    <UiAlert
      v-else-if="state === 'done'"
      color="success"
      variant="soft"
      class="mt-6"
      role="status"
    >
      ¡Gracias! Tu correo quedó confirmado.
    </UiAlert>
    <UiAlert v-else color="danger" variant="soft" class="mt-6" role="alert">
      {{ error }} Puedes pedir un enlace nuevo desde «Mi perfil».
    </UiAlert>

    <UiButton class="mt-6" color="primary" block :to="auth.isAuthenticated ? '/' : '/login'">
      {{ auth.isAuthenticated ? 'Ir al portal' : 'Iniciar sesión' }}
    </UiButton>
  </AuthShell>
</template>
