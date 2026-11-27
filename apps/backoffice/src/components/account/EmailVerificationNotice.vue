<script setup lang="ts">
import { ref } from 'vue'
import { UiButton, useToast } from '@aptoph/ui'
import { accountApi } from '@/api/account'
import { useAuthStore } from '@/stores/auth'
import { errorMessage } from '@/lib/errors'

/** Reminder to confirm the email, with a button to resend the link */
defineProps<{ compact?: boolean }>()

const auth = useAuthStore()
const toast = useToast()
const sending = ref(false)
const sent = ref(false)

async function send() {
  sending.value = true
  try {
    await accountApi.sendVerification()
    sent.value = true
    toast.success(`Te enviamos el enlace a ${auth.user?.email}`)
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <div
    v-if="auth.user && !auth.user.emailVerifiedAt"
    role="status"
    :class="
      compact
        ? 'border-b border-brand-100 bg-brand-50 px-4 py-2.5 text-center text-sm text-brand-800 dark:border-white/10 dark:bg-brand-400/10 dark:text-brand-100'
        : 'flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-brand-50 p-4 text-sm text-brand-800 dark:bg-brand-400/10 dark:text-brand-100'
    "
  >
    <span>
      <i class="mdi mdi-email-alert-outline" aria-hidden="true" />
      Confirma tu correo <strong>{{ auth.user.email }}</strong> para recibir avisos y poder
      recuperar tu cuenta.
    </span>
    <UiButton
      v-if="!sent"
      size="sm"
      variant="ghost"
      :class="compact ? 'ml-1' : ''"
      :loading="sending"
      @click="send"
    >
      Enviar enlace
    </UiButton>
    <span v-else class="ml-1 font-semibold">Enlace enviado, revisa tu correo.</span>
  </div>
</template>
