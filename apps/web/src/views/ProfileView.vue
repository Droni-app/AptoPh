<script setup lang="ts">
import { DuiButton, DuiCard } from '@dronico/droni-kit'
import { ROLE_LABELS } from '@apartadock/shared'
import PageHeader from '@/components/PageHeader.vue'
import { useAuthStore } from '@/stores/auth'
import { useTenantStore } from '@/stores/tenant'

const auth = useAuthStore()
const tenant = useTenantStore()
</script>

<template>
  <PageHeader title="Mi perfil" subtitle="Tus datos de acceso a AptoPH" />

  <DuiCard v-if="auth.user" class="mb-6">
    <div class="flex flex-wrap items-center gap-4">
      <span class="grid size-14 place-items-center rounded-full bg-teal-100 font-display text-xl font-semibold text-teal-800 dark:bg-teal-500/20 dark:text-teal-200">
        {{ auth.user.initials }}
      </span>
      <div class="min-w-0">
        <p class="font-display text-xl font-semibold">{{ auth.user.fullName }}</p>
        <p class="truncate text-sm text-navy-500 dark:text-navy-300">{{ auth.user.email }}</p>
      </div>
    </div>
    <dl class="mt-6 grid gap-4 border-t border-navy-100 pt-6 text-sm sm:grid-cols-2 dark:border-white/10">
      <div>
        <dt class="text-navy-500 dark:text-navy-300">Teléfono</dt>
        <dd class="mt-1 font-medium">{{ auth.user.phone ?? '—' }}</dd>
      </div>
      <div>
        <dt class="text-navy-500 dark:text-navy-300">Conjunto actual</dt>
        <dd class="mt-1 font-medium">
          {{ tenant.current?.name }}
          <span v-if="tenant.current" class="block text-xs font-normal text-navy-500 dark:text-navy-300">
            {{ tenant.current.roles.map((role) => ROLE_LABELS[role]).join(' · ') }}
          </span>
        </dd>
      </div>
    </dl>
  </DuiCard>

  <DuiButton variant="outline" color="danger" @click="auth.logout()">
    <span class="mr-1" aria-hidden="true"><i class="mdi mdi-logout" /></span>Cerrar sesión
  </DuiButton>
</template>
