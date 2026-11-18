<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { DuiAlert, DuiButton, DuiCard } from '@dronico/droni-kit'
import { useAuthStore } from '@/stores/auth'
import { config } from '@/lib/config'

const route = useRoute()
const auth = useAuthStore()
const redirecting = ref(false)
const error = typeof route.query.error === 'string' ? route.query.error : null

async function signIn() {
  redirecting.value = true
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
  await auth.login(redirect)
}

const signupUrl = `${config.apiUrl}/registro`

// Coming from the sign-up page: the API session already exists, so the OAuth
// round trip comes back with a code without showing the login form
onMounted(() => {
  if (route.query.auto === '1' && !error) void signIn()
})
</script>

<template>
  <main class="grid min-h-full place-items-center px-4 py-12">
    <div class="w-full max-w-sm">
      <div class="mb-8 text-center">
        <span class="text-5xl text-violet-600 dark:text-violet-400" aria-hidden="true">
          <i class="mdi mdi-office-building-cog" />
        </span>
        <h1 class="mt-2 text-2xl font-semibold tracking-tight">AptoPH</h1>
        <p class="text-sm text-neutral-500 dark:text-neutral-400">Administración de copropiedades</p>
      </div>
      <DuiCard>
        <div class="flex flex-col gap-4">
          <p class="text-sm text-neutral-600 dark:text-neutral-300">
            Panel para administración, consejo, contabilidad y personal del conjunto.
          </p>
          <DuiAlert v-if="error" color="danger" variant="soft">{{ error }}</DuiAlert>
          <DuiButton color="primary" block :loading="redirecting" @click="signIn">
            Iniciar sesión
          </DuiButton>
        </div>
      </DuiCard>
      <p class="mt-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
        ¿Tu conjunto aún no usa AptoPH?
        <a :href="signupUrl" class="font-medium text-violet-600 hover:underline dark:text-violet-400">
          Prueba gratis 30 días
        </a>
      </p>
    </div>
  </main>
</template>
