<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { DuiAlert, DuiButton } from '@dronico/droni-kit'
import BrandLogo from '@/components/BrandLogo.vue'
import { useAuthStore } from '@/stores/auth'
import { useTenantStore } from '@/stores/tenant'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const tenant = useTenantStore()

async function choose(id: string) {
  tenant.select(id)
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
  await router.push(redirect)
}
</script>

<template>
  <main class="mx-auto flex min-h-full w-full max-w-xl flex-col justify-center px-4 py-12">
    <BrandLogo class="mb-8 h-8 self-start" />
    <div class="mb-6">
      <h1 class="text-2xl font-semibold">Selecciona tu conjunto</h1>
      <p class="text-sm text-navy-500 dark:text-navy-300">
        Hola{{ auth.user ? `, ${auth.user.fullName}` : '' }}. ¿Qué conjunto quieres consultar?
      </p>
    </div>

    <DuiAlert v-if="tenant.residentTenants.length === 0" color="warning" variant="soft">
      Tu cuenta no está registrada como residente en ningún conjunto. Pídele a la administración
      que te vincule a tu unidad.
    </DuiAlert>

    <ul class="flex flex-col gap-3">
      <li v-for="item in tenant.residentTenants" :key="item.id">
        <button
          type="button"
          class="w-full rounded-xl border border-navy-100 bg-white p-4 text-left transition hover:border-teal-500 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-teal-600 dark:border-white/10 dark:bg-navy-900 dark:hover:border-teal-400"
          @click="choose(item.id)"
        >
          <span class="block font-medium">{{ item.name }}</span>
          <span v-if="item.city" class="block text-sm text-navy-500 dark:text-navy-300">{{ item.city }}</span>
        </button>
      </li>
    </ul>

    <div class="mt-8 text-center">
      <DuiButton variant="ghost" size="sm" @click="auth.logout()">Cerrar sesión</DuiButton>
    </div>
  </main>
</template>
