<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { DuiAlert, DuiButton, DuiCard } from '@dronico/droni-kit'
import BrandLogo from '@/components/BrandLogo.vue'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const auth = useAuthStore()
const redirecting = ref(false)
const error = typeof route.query.error === 'string' ? route.query.error : null

async function signIn() {
  redirecting.value = true
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
  await auth.login(redirect)
}
</script>

<template>
  <main class="grid min-h-full place-items-center px-4 py-12">
    <div class="w-full max-w-sm">
      <div class="mb-8 flex flex-col items-center text-center">
        <BrandLogo class="h-10" />
        <h1 class="mt-6 text-2xl font-semibold">Portal de residentes</h1>
        <p class="mt-1 text-sm text-navy-500 dark:text-navy-300">
          Tu conjunto, tus unidades y tu estado de cuenta en un solo lugar.
        </p>
      </div>
      <DuiCard>
        <div class="flex flex-col gap-4">
          <DuiAlert v-if="error" color="danger" variant="soft">{{ error }}</DuiAlert>
          <DuiButton color="primary" block :loading="redirecting" @click="signIn">
            Iniciar sesión
          </DuiButton>
          <p class="text-center text-xs text-navy-500 dark:text-navy-300">
            ¿No tienes cuenta? Pídele a la administración de tu conjunto que te registre.
          </p>
        </div>
      </DuiCard>
    </div>
  </main>
</template>
