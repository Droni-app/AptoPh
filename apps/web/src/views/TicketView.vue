<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { DuiAlert, DuiBadge, DuiButton, DuiCard, DuiForm, DuiSkeleton, DuiTextarea } from '@dronico/droni-kit'
import { TICKET_STATUS_LABELS, TICKET_TYPE_LABELS, type ResidentTicketDetail } from '@aptoph/shared'
import PageHeader from '@/components/PageHeader.vue'
import { residentApi } from '@/api/resident'
import { useSubmit } from '@/composables/useSubmit'
import { ApiError } from '@/lib/http'
import { errorMessage } from '@/lib/errors'
import { formatDateTime, unitName } from '@/lib/format'
import { TICKET_STATUS_COLORS } from '@/lib/tickets'

const route = useRoute()
const ticket = ref<ResidentTicketDetail | null>(null)
const error = ref<string | null>(null)
const notFound = ref(false)
const reply = ref('')
const { saving, errors, error: replyError, run } = useSubmit()

async function load() {
  error.value = null
  try {
    ticket.value = (await residentApi.tickets.show(String(route.params.id))).data
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound.value = true
    else error.value = errorMessage(e, 'No pudimos cargar la solicitud')
  }
}

async function send() {
  const current = ticket.value
  if (!current || !reply.value.trim()) return
  const ok = await run(() => residentApi.tickets.comment(current.id, reply.value), 'Mensaje enviado')
  if (ok) {
    reply.value = ''
    await load()
  }
}

onMounted(load)
</script>

<template>
  <RouterLink
    :to="{ name: 'tickets' }"
    class="mb-2 inline-flex items-center gap-1 text-sm text-navy-500 hover:text-teal-700 hover:underline dark:text-navy-300 dark:hover:text-teal-300"
  >
    <span aria-hidden="true"><i class="mdi mdi-arrow-left" /></span> PQRS
  </RouterLink>

  <DuiCard v-if="notFound">
    <p class="py-6 text-center font-medium">Esta solicitud no existe o no está asociada a tu cuenta.</p>
  </DuiCard>

  <div v-else-if="error" class="flex flex-col items-start gap-4">
    <DuiAlert color="danger" variant="soft" class="w-full">{{ error }}</DuiAlert>
    <DuiButton variant="outline" @click="load">Reintentar</DuiButton>
  </div>

  <template v-else-if="ticket">
    <PageHeader
      :title="ticket.subject"
      :subtitle="`#${ticket.number} · ${TICKET_TYPE_LABELS[ticket.type]} · ${ticket.unit ? unitName(ticket.unit) : 'General'}`"
    >
      <template #actions>
        <DuiBadge :label="TICKET_STATUS_LABELS[ticket.status]" :color="TICKET_STATUS_COLORS[ticket.status]" variant="soft" />
      </template>
    </PageHeader>

    <ol class="flex flex-col gap-4" aria-label="Conversación">
      <li class="rounded-2xl border border-navy-100 bg-white p-4 dark:border-white/10 dark:bg-navy-900">
        <p class="mb-2 text-xs text-navy-500 dark:text-navy-300">
          {{ ticket.isMine ? 'Radicaste' : 'Radicada' }} · {{ formatDateTime(ticket.createdAt) }}
        </p>
        <p class="whitespace-pre-line">{{ ticket.description }}</p>
      </li>
      <li
        v-for="comment in ticket.comments"
        :key="comment.id"
        class="max-w-[90%] rounded-2xl p-4"
        :class="
          comment.isMine
            ? 'self-end bg-teal-50 dark:bg-teal-500/10'
            : 'self-start border border-navy-100 bg-white dark:border-white/10 dark:bg-navy-900'
        "
      >
        <p class="mb-1 text-xs text-navy-500 dark:text-navy-300">
          {{ comment.isMine ? 'Tú' : comment.authorName }} · {{ formatDateTime(comment.createdAt) }}
        </p>
        <p class="whitespace-pre-line">{{ comment.body }}</p>
      </li>
    </ol>

    <DuiCard v-if="ticket.status !== 'closed'" class="mt-6">
      <DuiForm :loading="saving" @submit="send">
        <DuiAlert v-if="replyError" color="danger" variant="soft">{{ replyError }}</DuiAlert>
        <label for="reply" class="text-sm font-medium">Responder</label>
        <DuiTextarea id="reply" v-model="reply" rows="3" autoheight maxlength="5000" required />
        <p v-if="errors.body" class="text-sm text-red-600">{{ errors.body }}</p>
        <p v-if="ticket.status === 'resolved'" class="text-xs text-navy-500 dark:text-navy-300">
          La solicitud está resuelta; si respondes, se reabrirá.
        </p>
        <div class="flex justify-end">
          <DuiButton type="submit" color="primary" :loading="saving" :disabled="!reply.trim()">Enviar</DuiButton>
        </div>
      </DuiForm>
    </DuiCard>
    <p v-else class="mt-6 text-sm text-navy-500 dark:text-navy-300">
      Esta solicitud está cerrada. Si necesitas algo más, radica una nueva.
    </p>
  </template>

  <div v-else class="flex flex-col gap-4" aria-busy="true">
    <DuiSkeleton width="18rem" height="2rem" />
    <DuiSkeleton height="6rem" variant="rounded" />
    <DuiSkeleton height="4rem" variant="rounded" />
  </div>
</template>
