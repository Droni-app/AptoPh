<script setup lang="ts">
import { ref } from 'vue'
import { UiButton, UiCard } from '@aptoph/ui'
import { ROLE_LABELS } from '@aptoph/shared'
import PageHeader from '@/components/PageHeader.vue'
import ProfileForm from '@/components/account/ProfileForm.vue'
import ChangePasswordForm from '@/components/account/ChangePasswordForm.vue'
import SessionsList from '@/components/account/SessionsList.vue'
import EmailVerificationNotice from '@/components/account/EmailVerificationNotice.vue'
import { useAuthStore } from '@/stores/auth'
import { useTenantStore } from '@/stores/tenant'

const auth = useAuthStore()
const tenant = useTenantStore()
const sessions = ref<InstanceType<typeof SessionsList> | null>(null)
</script>

<template>
  <PageHeader title="Mi perfil" subtitle="Tus datos, tu contraseña y dónde tienes la sesión abierta" />

  <EmailVerificationNotice class="mb-6" />

  <UiCard v-if="auth.user" class="mb-6">
    <div class="flex flex-wrap items-center gap-4">
      <span
        class="grid size-14 place-items-center rounded-full bg-mint-100 font-display text-xl font-semibold text-mint-800 dark:bg-mint-500/20 dark:text-mint-200"
      >
        {{ auth.user.initials }}
      </span>
      <div class="min-w-0">
        <p class="font-display text-xl font-semibold">{{ auth.user.fullName }}</p>
        <p class="truncate text-sm text-neutral-500 dark:text-neutral-300">
          {{ tenant.current?.name }}
          <template v-if="tenant.current">
            · {{ tenant.current.roles.map((role) => ROLE_LABELS[role]).join(' · ') }}
          </template>
        </p>
      </div>
    </div>
  </UiCard>

  <div class="grid gap-6 lg:grid-cols-2">
    <UiCard>
      <h2 class="mb-4 text-lg font-semibold">Datos personales</h2>
      <ProfileForm />
    </UiCard>
    <div class="flex flex-col gap-6">
      <UiCard>
        <h2 class="mb-4 text-lg font-semibold">Contraseña</h2>
        <ChangePasswordForm @changed="sessions?.load()" />
      </UiCard>
      <UiCard>
        <h2 class="text-lg font-semibold">Sesiones abiertas</h2>
        <p class="mt-1 mb-4 text-sm text-neutral-500 dark:text-neutral-400">
          Si no reconoces un dispositivo, cierra su sesión y cambia tu contraseña.
        </p>
        <SessionsList ref="sessions" />
      </UiCard>
    </div>
  </div>

  <UiButton class="mt-6" variant="outline" color="danger" @click="auth.logout()">
    <span class="mr-1" aria-hidden="true"><i class="mdi mdi-logout" /></span>Cerrar sesión
  </UiButton>
</template>
