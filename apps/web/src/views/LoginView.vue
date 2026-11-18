<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { DuiAlert, DuiButton, DuiForm, DuiInput, DuiLabel } from '@dronico/droni-kit'
import BrandLogo from '@/components/BrandLogo.vue'
import comunidad800 from '@/assets/img/hero-comunidad-800.webp'
import comunidad1200 from '@/assets/img/hero-comunidad-1200.webp'
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

const illustrationSrcset = `${comunidad800} 800w, ${comunidad1200} 1200w`

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
  <main class="grid min-h-full lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
    <div class="flex flex-col px-6 py-8 sm:px-10">
      <BrandLogo class="h-9 self-start" />

      <div class="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
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
          <DuiButton type="submit" color="primary" block :loading="loading">
            Iniciar sesión
          </DuiButton>
        </DuiForm>

        <p
          class="mt-6 rounded-2xl bg-mint-50 px-4 py-3 text-sm text-neutral-700 dark:bg-mint-500/10 dark:text-neutral-200"
        >
          ¿No tienes cuenta? Pídele a la administración de tu conjunto que te registre.
        </p>
      </div>

      <p class="text-xs text-neutral-500 dark:text-neutral-400">AptoPH · Portal de residentes</p>
    </div>

    <div class="relative hidden overflow-hidden bg-[#f8f1e7] lg:block dark:bg-neutral-900">
      <img
        :src="comunidad1200"
        :srcset="illustrationSrcset"
        sizes="55vw"
        alt=""
        class="absolute inset-0 size-full object-cover object-[75%_center] dark:opacity-90"
      />
      <div
        class="absolute inset-x-10 bottom-10 max-w-md rounded-3xl bg-white/85 p-6 shadow-[0_8px_24px_-8px_rgb(30_58_95/0.25)] backdrop-blur dark:bg-neutral-900/85"
      >
        <p class="font-display text-lg font-bold text-brand-700 dark:text-white">
          Tu conjunto, más cerca.
        </p>
        <p class="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Consulta tu estado de cuenta, reserva zonas comunes y autoriza visitas desde el celular.
        </p>
      </div>
    </div>
  </main>
</template>
