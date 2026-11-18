<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { DuiAlert, DuiBadge, DuiButton } from '@dronico/droni-kit'
import { ROLE_LABELS } from '@aptoph/shared'
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
    <div class="mb-6">
      <h1 class="text-2xl font-semibold tracking-tight">Selecciona un conjunto</h1>
      <p class="text-sm text-neutral-500 dark:text-neutral-400">
        Hola{{ auth.user ? `, ${auth.user.fullName}` : '' }}. ¿Qué conjunto quieres administrar?
      </p>
    </div>

    <DuiAlert v-if="tenant.backofficeTenants.length === 0" color="warning" variant="soft">
      Tu cuenta no tiene acceso de administración en ningún conjunto. Si eres residente, usa la
      aplicación de residentes.
    </DuiAlert>

    <ul class="flex flex-col gap-3">
      <li v-for="item in tenant.backofficeTenants" :key="item.id">
        <button
          type="button"
          class="w-full rounded-xl border border-neutral-200 bg-white p-4 text-left transition hover:border-violet-400 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-violet-500 dark:border-white/10 dark:bg-neutral-900 dark:hover:border-violet-400"
          @click="choose(item.id)"
        >
          <span class="block font-medium">{{ item.name }}</span>
          <span v-if="item.city" class="block text-sm text-neutral-500 dark:text-neutral-400">{{ item.city }}</span>
          <span class="mt-2 flex flex-wrap gap-1">
            <DuiBadge
              v-for="role in item.roles"
              :key="role"
              :label="ROLE_LABELS[role]"
              size="sm"
              variant="soft"
              color="primary"
            />
          </span>
        </button>
      </li>
    </ul>

    <div class="mt-8 text-center">
      <DuiButton variant="ghost" size="sm" @click="auth.logout()">Cerrar sesión</DuiButton>
    </div>
  </main>
</template>
