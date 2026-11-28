<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { UiAlert, UiNotificationPreferences, UiSkeleton, useToast } from '@aptoph/ui'
import { type NotificationCategory, type NotificationPreferences } from '@aptoph/shared'
import { notificationsApi } from '@/api/account'
import { errorMessage } from '@/lib/errors'

/** The channels of each kind of notice, saved on every change (docs/notifications.md) */
const STAFF_CATEGORIES: NotificationCategory[] = [
  'tickets',
  'finance',
  'announcements',
  'bookings',
  'documents',
]
const categories: readonly NotificationCategory[] = STAFF_CATEGORIES

const toast = useToast()
const preferences = ref<NotificationPreferences | null>(null)
const pushAvailable = ref(false)
const devices = ref(0)
const saving = ref(false)
const failed = ref<string | null>(null)

onMounted(async () => {
  try {
    const result = await notificationsApi.preferences()
    preferences.value = result.data
    pushAvailable.value = result.pushAvailable
    devices.value = result.devices
  } catch (e) {
    failed.value = errorMessage(e)
  }
  // Opened from the bell (#notificaciones): the cards above load late and push it down
  if (location.hash === '#notificaciones') {
    await nextTick()
    setTimeout(() => document.getElementById('notificaciones')?.scrollIntoView(), 300)
  }
})

async function save(next: NotificationPreferences) {
  const previous = preferences.value
  preferences.value = next
  saving.value = true
  try {
    preferences.value = (await notificationsApi.savePreferences(next)).data
    toast.success('Guardamos tus preferencias de notificación')
  } catch (e) {
    preferences.value = previous
    toast.error(errorMessage(e))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <p class="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
      Todo te llega a la campana <i class="mdi mdi-bell-outline" aria-hidden="true" />. Aquí eliges
      qué avisos quieres además por correo o en la app móvil. Los correos de seguridad (contraseña,
      inicio de sesión, invitaciones) siempre se envían.
    </p>
    <UiAlert v-if="failed" color="danger" :title="failed" />
    <UiSkeleton v-else-if="!preferences" class="h-64 w-full" />
    <template v-else>
      <UiNotificationPreferences
        :model-value="preferences"
        :categories="categories"
        :disabled="saving"
        @update:model-value="save"
      />
      <p class="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
        <i class="mdi mdi-cellphone" aria-hidden="true" />
        <template v-if="!pushAvailable">
          Las notificaciones en el celular llegarán cuando esté disponible la app móvil de AptoPH.
        </template>
        <template v-else-if="devices">
          Tienes {{ devices }} {{ devices === 1 ? 'celular conectado' : 'celulares conectados' }}.
        </template>
        <template v-else
          >Instala la app móvil e inicia sesión para recibirlas en tu celular.</template
        >
      </p>
    </template>
  </div>
</template>
