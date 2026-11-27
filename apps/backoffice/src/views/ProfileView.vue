<script setup lang="ts">
import { ref } from 'vue'
import { UiCard } from '@aptoph/ui'
import PageHeader from '@/components/PageHeader.vue'
import ProfileForm from '@/components/account/ProfileForm.vue'
import ChangePasswordForm from '@/components/account/ChangePasswordForm.vue'
import SessionsList from '@/components/account/SessionsList.vue'
import NotificationSettings from '@/components/account/NotificationSettings.vue'
import EmailVerificationNotice from '@/components/account/EmailVerificationNotice.vue'

const sessions = ref<InstanceType<typeof SessionsList> | null>(null)
</script>

<template>
  <PageHeader
    title="Mi perfil"
    subtitle="Tus datos, tu contraseña y dónde tienes la sesión abierta"
  />

  <EmailVerificationNotice class="mb-6" />

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

  <UiCard id="notificaciones" class="mt-6 scroll-mt-24">
    <h2 class="mb-1 text-lg font-semibold">Notificaciones</h2>
    <NotificationSettings />
  </UiCard>
</template>
