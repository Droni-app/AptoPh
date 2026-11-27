<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { UiAlert, UiBadge, UiButton, UiSkeleton, useToast } from '@aptoph/ui'
import type { AccountSession } from '@aptoph/shared'
import { accountApi } from '@/api/account'
import { errorMessage } from '@/lib/errors'

const toast = useToast()
const sessions = ref<AccountSession[] | null>(null)
const error = ref<string | null>(null)
const busy = ref<string | null>(null)

const dateTime = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
const format = (value: string | null) => (value ? dateTime.format(new Date(value)) : '—')

async function load() {
  try {
    sessions.value = (await accountApi.sessions()).data
    error.value = null
  } catch (e) {
    error.value = errorMessage(e)
  }
}

async function close(session: AccountSession) {
  busy.value = session.id
  try {
    await accountApi.closeSession(session.id)
    toast.success(`Cerramos la sesión de ${session.device}`)
    await load()
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    busy.value = null
  }
}

async function closeOthers() {
  busy.value = 'others'
  try {
    await accountApi.closeOtherSessions()
    toast.success('Cerramos las demás sesiones')
    await load()
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    busy.value = null
  }
}

defineExpose({ load })
onMounted(load)
</script>

<template>
  <UiAlert v-if="error" color="danger" variant="soft">{{ error }}</UiAlert>
  <div v-else-if="!sessions" class="flex flex-col gap-2" aria-busy="true">
    <UiSkeleton v-for="n in 2" :key="n" height="3.5rem" variant="rounded" />
  </div>
  <template v-else>
    <ul
      class="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-100 dark:divide-white/10 dark:border-white/10"
    >
      <li
        v-for="session in sessions"
        :key="session.id"
        class="flex flex-wrap items-center justify-between gap-3 p-4"
      >
        <div class="flex min-w-0 items-center gap-3">
          <span class="text-2xl text-neutral-400" aria-hidden="true">
            <i
              :class="
                /m[oó]vil|celular|app/i.test(session.device)
                  ? 'mdi mdi-cellphone'
                  : 'mdi mdi-monitor'
              "
            />
          </span>
          <div class="min-w-0">
            <p class="flex items-center gap-2 font-medium">
              {{ session.device }}
              <UiBadge
                v-if="session.current"
                label="Esta sesión"
                size="xs"
                color="success"
                variant="soft"
              />
            </p>
            <p class="text-xs text-neutral-500 dark:text-neutral-400">
              Inició {{ format(session.createdAt) }} · Último uso {{ format(session.lastUsedAt) }}
            </p>
          </div>
        </div>
        <UiButton
          v-if="!session.current"
          size="sm"
          variant="outline"
          :loading="busy === session.id"
          @click="close(session)"
        >
          Cerrar
        </UiButton>
      </li>
    </ul>
    <UiButton
      v-if="sessions.length > 1"
      class="mt-3"
      size="sm"
      variant="ghost"
      color="danger"
      :loading="busy === 'others'"
      @click="closeOthers"
    >
      Cerrar todas las demás sesiones
    </UiButton>
  </template>
</template>
