<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { DuiAlert, DuiBadge, DuiButton, DuiSkeleton } from '@dronico/droni-kit'
import {
  TICKET_STATUS_LABELS,
  TICKET_TYPE_LABELS,
  type ResidentTicket,
  type ResidentTicketDetail,
} from '@aptoph/shared'
import PageHeader from '@/components/PageHeader.vue'
import TicketFormModal from '@/components/TicketFormModal.vue'
import { residentApi } from '@/api/resident'
import { errorMessage } from '@/lib/errors'
import { formatRelative, unitName } from '@/lib/format'
import { TICKET_STATUS_COLORS } from '@/lib/tickets'

const route = useRoute()
const router = useRouter()
const tickets = ref<ResidentTicket[] | null>(null)
const error = ref<string | null>(null)
const formOpen = ref(false)
const presetUnit = typeof route.query.unidad === 'string' ? route.query.unidad : null

async function load() {
  error.value = null
  try {
    tickets.value = (await residentApi.tickets.list()).data
  } catch (e) {
    error.value = errorMessage(e, 'No pudimos cargar tus solicitudes')
  }
}

function onSaved(ticket: ResidentTicketDetail) {
  router.push({ name: 'ticket', params: { id: ticket.id } })
}

onMounted(() => {
  load()
  if (route.query.nueva) {
    formOpen.value = true
    router.replace({ query: {} })
  }
})
</script>

<template>
  <PageHeader title="PQRS" subtitle="Peticiones, quejas, reclamos, sugerencias y reportes de mantenimiento">
    <template #actions>
      <DuiButton color="primary" @click="formOpen = true">
        <span class="mr-1" aria-hidden="true"><i class="mdi mdi-message-plus-outline" /></span>Radicar
      </DuiButton>
    </template>
  </PageHeader>

  <div v-if="error" class="flex flex-col items-start gap-4">
    <DuiAlert color="danger" variant="soft" class="w-full">{{ error }}</DuiAlert>
    <DuiButton variant="outline" @click="load">Reintentar</DuiButton>
  </div>

  <div v-else-if="!tickets" class="flex flex-col gap-3" aria-busy="true">
    <DuiSkeleton v-for="n in 3" :key="n" height="4.5rem" variant="rounded" />
  </div>

  <div v-else-if="tickets.length === 0" class="rounded-2xl border border-dashed border-navy-200 p-8 text-center dark:border-white/10">
    <span class="text-4xl text-navy-300" aria-hidden="true"><i class="mdi mdi-message-text-outline" /></span>
    <p class="mt-2 font-medium">No has radicado solicitudes</p>
    <p class="text-sm text-navy-500 dark:text-navy-300">Cuando radiques una, podrás seguir su trámite aquí.</p>
  </div>

  <ul v-else class="divide-y divide-navy-100 overflow-hidden rounded-2xl border border-navy-100 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-navy-900">
    <li v-for="ticket in tickets" :key="ticket.id">
      <RouterLink
        :to="{ name: 'ticket', params: { id: ticket.id } }"
        class="flex items-center gap-3 p-4 transition hover:bg-navy-50/60 focus-visible:outline-2 focus-visible:outline-teal-600 dark:hover:bg-white/5"
      >
        <span class="w-12 shrink-0 font-mono text-sm text-navy-400">#{{ ticket.number }}</span>
        <div class="min-w-0 flex-1">
          <p class="truncate font-medium">{{ ticket.subject }}</p>
          <p class="text-sm text-navy-500 dark:text-navy-300">
            {{ TICKET_TYPE_LABELS[ticket.type] }} · {{ ticket.unit ? unitName(ticket.unit) : 'General' }} ·
            {{ formatRelative(ticket.updatedAt ?? ticket.createdAt) }}
          </p>
        </div>
        <DuiBadge :label="TICKET_STATUS_LABELS[ticket.status]" :color="TICKET_STATUS_COLORS[ticket.status]" variant="soft" size="sm" />
      </RouterLink>
    </li>
  </ul>

  <TicketFormModal v-model="formOpen" :unit-id="presetUnit" @saved="onSaved" />
</template>
