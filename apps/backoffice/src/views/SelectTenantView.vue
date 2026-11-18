<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { DuiAlert, DuiBadge, DuiButton } from '@dronico/droni-kit'
import { ROLE_LABELS } from '@aptoph/shared'
import { useAuthStore } from '@/stores/auth'
import { useTenantStore } from '@/stores/tenant'
import BrandLogo from '@/components/BrandLogo.vue'

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
    <div class="mb-10 h-9"><BrandLogo /></div>
    <div class="mb-6">
      <h1 class="text-[1.75rem] font-extrabold tracking-tight text-brand-700 dark:text-white">
        Selecciona un conjunto
      </h1>
      <p class="mt-1 text-neutral-500 dark:text-neutral-400">
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
          class="group flex w-full items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-4 text-left transition hover:border-mint-400 hover:shadow-[0_8px_24px_-8px_rgb(30_58_95/0.18)] focus-visible:outline-2 focus-visible:outline-mint-500 dark:border-white/10 dark:bg-neutral-900 dark:hover:border-mint-400"
          @click="choose(item.id)"
        >
          <span
            class="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-50 font-display text-lg font-extrabold text-brand-700 dark:bg-brand-300/15 dark:text-brand-100"
            aria-hidden="true"
          >
            {{ item.name.charAt(0) }}
          </span>
          <span class="min-w-0 flex-1">
            <span class="block font-display font-bold text-brand-700 dark:text-white">{{
              item.name
            }}</span>
            <span v-if="item.city" class="block text-sm text-neutral-500 dark:text-neutral-400">{{
              item.city
            }}</span>
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
          </span>
          <span
            class="text-xl text-neutral-400 transition group-hover:translate-x-0.5 group-hover:text-mint-600"
            aria-hidden="true"
          >
            <i class="mdi mdi-chevron-right" />
          </span>
        </button>
      </li>
    </ul>

    <div class="mt-8 text-center">
      <DuiButton variant="ghost" size="sm" @click="auth.logout()">Cerrar sesión</DuiButton>
    </div>
  </main>
</template>
