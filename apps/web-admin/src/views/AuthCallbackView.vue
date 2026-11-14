<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { DuiAlert, DuiButton, DuiCard } from '@dronico/droni-kit'
import { useAuthStore } from '@/stores/auth'
import { useTenantStore } from '@/stores/tenant'

const router = useRouter()
const auth = useAuthStore()
const tenant = useTenantStore()
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    const redirectTo = await auth.handleCallback(new URLSearchParams(window.location.search))
    tenant.reset()
    await router.replace(redirectTo)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudo iniciar sesión'
  }
})
</script>

<template>
  <main class="grid min-h-full place-items-center px-4 py-12">
    <div class="w-full max-w-sm">
      <DuiCard v-if="error">
        <div class="flex flex-col gap-4">
          <DuiAlert color="danger" variant="soft">{{ error }}</DuiAlert>
          <DuiButton color="primary" block to="/login">Volver a intentar</DuiButton>
        </div>
      </DuiCard>
      <p v-else class="text-center text-sm text-neutral-500" role="status">
        <span class="mdi mdi-loading mdi-spin mr-2" aria-hidden="true" />Iniciando sesión…
      </p>
    </div>
  </main>
</template>
