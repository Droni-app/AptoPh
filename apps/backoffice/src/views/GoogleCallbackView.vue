<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { UiAlert, UiButton } from '@aptoph/ui'
import AuthShell from '@/components/AuthShell.vue'
import { useAuthStore } from '@/stores/auth'
import { useTenantStore } from '@/stores/tenant'
import { errorMessage } from '@/lib/errors'
import { finishGoogle, googleSignup, takePending } from '@/lib/google'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const tenant = useTenantStore()
const error = ref<string | null>(null)
const backTo = ref<'/login' | '/registro'>('/login')

onMounted(async () => {
  const text = (key: string) =>
    typeof route.query[key] === 'string' ? String(route.query[key]) : ''
  const state = text('state')
  const pending = state ? takePending(state) : null
  if (pending?.intent === 'signup') backTo.value = '/registro'

  if (text('error')) {
    // The person closed the Google window or chose not to share the account
    error.value =
      text('error') === 'access_denied'
        ? 'Cancelaste el inicio de sesión con Google.'
        : 'Google no pudo completar el inicio de sesión. Inténtalo de nuevo.'
    return
  }
  if (!pending || !text('code')) {
    error.value =
      'El inicio de sesión con Google venció o no empezó en esta pestaña. Vuelve a intentarlo.'
    return
  }

  try {
    const { data } = await finishGoogle(text('code'), state, auth.device)
    if (data.status === 'signup') {
      googleSignup.save(data)
      await router.replace({ path: '/registro', query: { google: '1' } })
      return
    }
    auth.start(data.session)
    tenant.reset()
    const redirect = pending.redirect?.startsWith('/') ? pending.redirect : '/'
    await router.replace(redirect)
  } catch (e) {
    error.value = errorMessage(e)
  }
})
</script>

<template>
  <AuthShell>
    <template v-if="error">
      <h1 class="text-2xl font-extrabold tracking-tight text-brand-700 dark:text-white">
        No pudimos continuar con Google
      </h1>
      <UiAlert color="danger" variant="soft" role="alert" class="mt-6">{{ error }}</UiAlert>
      <UiButton :to="backTo" color="primary" size="lg" block class="mt-6">Volver</UiButton>
    </template>
    <div v-else class="flex flex-col items-center py-10 text-center" role="status">
      <i class="mdi mdi-loading mdi-spin text-4xl text-brand-600" aria-hidden="true" />
      <p class="mt-4 text-neutral-600 dark:text-neutral-300">Entrando con Google…</p>
    </div>
  </AuthShell>
</template>
