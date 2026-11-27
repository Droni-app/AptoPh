<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  UiAlert,
  UiBadge,
  UiButton,
  UiModal,
  UiSelect,
  UiSkeleton,
  UiTabs,
  UiTextarea,
  useToast,
} from '@aptoph/ui'
import {
  ROLE_LABELS,
  TICKET_COMMENT_MAX,
  TICKET_DUE_DAYS,
  TICKET_PRIORITIES,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUSES,
  TICKET_STATUS_LABELS,
  TICKET_TYPE_LABELS,
  type TicketAssignee,
  type TicketDetail,
  type TicketStatus,
  type TicketUpdateInput,
} from '@aptoph/shared'
import { ticketsApi } from '@/api/tickets'
import AttachmentList from '@/components/attachments/AttachmentList.vue'
import TicketPriorityBadge from '@/components/tickets/TicketPriorityBadge.vue'
import TicketStatusBadge from '@/components/tickets/TicketStatusBadge.vue'
import { errorMessage } from '@/lib/errors'
import { formatDate, formatDateTime } from '@/lib/format'
import { useTenantStore } from '@/stores/tenant'

const props = defineProps<{ ticketId: string | null; assignees: TicketAssignee[] }>()
const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ changed: [] }>()
const tenant = useTenantStore()
const toast = useToast()

const ticket = ref<TicketDetail | null>(null)
const error = ref<string | null>(null)
const saving = ref(false)
const sending = ref(false)
const mode = ref<'reply' | 'note'>('reply')
const body = ref('')

async function load() {
  if (!props.ticketId) return
  error.value = null
  try {
    ticket.value = (await ticketsApi.get(props.ticketId)).data
  } catch (e) {
    error.value = errorMessage(e)
  }
}
watch(open, (isOpen) => {
  if (!isOpen) return
  ticket.value = null
  body.value = ''
  mode.value = 'reply'
  load()
})

const statusOptions = TICKET_STATUSES.map((value) => ({
  value,
  label: TICKET_STATUS_LABELS[value],
}))
const priorityOptions = TICKET_PRIORITIES.map((value) => ({
  value,
  label: `${TICKET_PRIORITY_LABELS[value]} · ${TICKET_DUE_DAYS[value]} ${TICKET_DUE_DAYS[value] === 1 ? 'día' : 'días'}`,
}))
const assigneeOptions = computed(() => {
  const options = props.assignees.map((a) => ({
    value: a.id,
    label: `${a.fullName} · ${ROLE_LABELS[a.role]}`,
  }))
  // The current assignee may no longer be active
  const current = ticket.value?.assignedTo
  if (current && !options.some((o) => o.value === current.id))
    options.unshift({ value: current.id, label: current.fullName })
  return options
})

const isActive = computed(
  () => ticket.value?.status === 'open' || ticket.value?.status === 'in_progress',
)
const isClosed = computed(() => ticket.value?.status === 'closed')
const modeTabs = [
  { label: 'Responder al residente', value: 'reply', icon: 'mdi-reply-outline' },
  { label: 'Nota interna', value: 'note', icon: 'mdi-lock-outline' },
]

async function update(change: TicketUpdateInput, message: string) {
  if (!ticket.value) return
  saving.value = true
  try {
    ticket.value = (await ticketsApi.update(ticket.value.id, change)).data
    toast.success(message)
    emit('changed')
  } catch (e) {
    toast.error(errorMessage(e))
    await load()
  } finally {
    saving.value = false
  }
}

function onStatus(status: TicketStatus) {
  if (status !== ticket.value?.status)
    update({ status }, `Solicitud ${TICKET_STATUS_LABELS[status].toLowerCase()}`)
}
function onPriority(priority: TicketDetail['priority']) {
  if (priority !== ticket.value?.priority) update({ priority }, 'Prioridad actualizada')
}
function onAssignee(id: string | null) {
  const assignedToId = id || null
  if (assignedToId === (ticket.value?.assignedTo?.id ?? null)) return
  update({ assignedToId }, assignedToId ? 'Solicitud asignada' : 'Se quitó el responsable')
}

async function send(status?: TicketStatus) {
  if (!ticket.value || !body.value.trim()) return
  sending.value = true
  try {
    const isInternal = mode.value === 'note'
    await ticketsApi.comment(ticket.value.id, { body: body.value.trim(), isInternal, status })
    body.value = ''
    toast.success(
      isInternal
        ? 'Nota interna guardada'
        : status === 'resolved'
          ? 'Respuesta enviada y solicitud resuelta'
          : 'Respuesta enviada al residente',
    )
    emit('changed')
    await load()
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <UiModal
    v-model="open"
    :title="ticket ? `#${ticket.number} · ${ticket.subject}` : 'Solicitud'"
    size="xl"
    scrollable
  >
    <UiAlert v-if="error" color="danger" variant="soft">{{ error }}</UiAlert>
    <UiSkeleton v-else-if="!ticket" class="h-72 rounded-xl" />
    <div v-else class="grid gap-6 text-sm lg:grid-cols-[minmax(0,1fr)_17rem]">
      <!-- Conversation -->
      <div class="flex min-w-0 flex-col gap-5">
        <div class="flex flex-wrap items-center gap-2">
          <TicketStatusBadge :status="ticket.status" />
          <TicketPriorityBadge :priority="ticket.priority" />
          <UiBadge :label="TICKET_TYPE_LABELS[ticket.type]" variant="outline" size="sm" />
          <UiBadge
            v-if="ticket.isOverdue"
            label="Vencida"
            color="danger"
            variant="soft"
            size="sm"
            icon="mdi-clock-alert-outline"
          />
        </div>

        <article class="rounded-xl bg-neutral-50 p-4 dark:bg-white/5">
          <header class="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <span class="font-semibold">{{ ticket.createdBy?.fullName ?? 'Residente' }}</span>
            <time class="text-xs text-neutral-500" :datetime="ticket.createdAt">{{
              formatDateTime(ticket.createdAt)
            }}</time>
          </header>
          <p class="leading-relaxed whitespace-pre-line">{{ ticket.description }}</p>
        </article>

        <ol v-if="ticket.comments.length" class="flex flex-col gap-3" aria-label="Conversación">
          <li
            v-for="comment in ticket.comments"
            :key="comment.id"
            class="rounded-xl p-4"
            :class="
              comment.isInternal
                ? 'bg-amber-50 ring-1 ring-amber-200 dark:bg-amber-400/10 dark:ring-amber-400/20'
                : comment.isFromRequester
                  ? 'bg-neutral-50 dark:bg-white/5'
                  : 'bg-mint-50 ring-1 ring-mint-200 sm:ml-8 dark:bg-mint-400/10 dark:ring-mint-400/20'
            "
          >
            <header class="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
              <span class="flex items-center gap-2 font-semibold">
                {{ comment.author?.fullName ?? 'Administración' }}
                <span
                  v-if="comment.isInternal"
                  class="inline-flex items-center gap-1 text-xs font-medium text-amber-800 dark:text-amber-200"
                  ><i class="mdi mdi-lock-outline" aria-hidden="true" />Nota interna</span
                >
              </span>
              <time class="text-xs text-neutral-500" :datetime="comment.createdAt">{{
                formatDateTime(comment.createdAt)
              }}</time>
            </header>
            <p class="leading-relaxed whitespace-pre-line">{{ comment.body }}</p>
          </li>
        </ol>
        <p v-else class="text-neutral-500">Nadie ha respondido esta solicitud todavía.</p>

        <!-- Composer -->
        <section
          v-if="tenant.canWorkTickets"
          class="flex flex-col gap-3 border-t border-neutral-100 pt-4 dark:border-white/10"
          aria-label="Responder"
        >
          <UiTabs v-model="mode" :tabs="modeTabs" variant="pills" size="sm" aria-label="Tipo" />
          <UiAlert v-if="mode === 'reply' && isClosed" color="warning" variant="soft">
            La solicitud está cerrada. Al responder se reabre y queda en trámite.
          </UiAlert>
          <UiTextarea
            v-model="body"
            :placeholder="
              mode === 'reply'
                ? 'Escribe la respuesta. Le llega al residente en el portal y por correo.'
                : 'Solo la ve el equipo de la administración.'
            "
            :maxlength="TICKET_COMMENT_MAX"
            rows="4"
            autoheight
            block
            :aria-label="mode === 'reply' ? 'Respuesta' : 'Nota interna'"
          />
          <div class="flex flex-wrap justify-end gap-2">
            <template v-if="mode === 'reply'">
              <UiButton
                v-if="isActive"
                variant="outline"
                :disabled="!body.trim()"
                :loading="sending"
                @click="send('resolved')"
                >Responder y resolver</UiButton
              >
              <UiButton
                color="primary"
                :disabled="!body.trim()"
                :loading="sending"
                @click="send(isClosed ? 'in_progress' : undefined)"
              >
                {{ isClosed ? 'Reabrir y responder' : 'Enviar respuesta' }}
              </UiButton>
            </template>
            <UiButton
              v-else
              color="primary"
              :disabled="!body.trim()"
              :loading="sending"
              @click="send()"
              >Guardar nota</UiButton
            >
          </div>
        </section>
      </div>

      <!-- Side panel -->
      <aside class="flex flex-col gap-5">
        <section v-if="tenant.canWorkTickets" class="flex flex-col gap-3" aria-label="Gestión">
          <label
            class="flex flex-col gap-1 text-xs font-medium text-neutral-600 dark:text-neutral-300"
          >
            Estado
            <UiSelect
              :model-value="ticket.status"
              :options="statusOptions"
              :disabled="saving"
              size="sm"
              block
              @update:model-value="onStatus"
            />
          </label>
          <template v-if="tenant.canManageTickets">
            <label
              class="flex flex-col gap-1 text-xs font-medium text-neutral-600 dark:text-neutral-300"
            >
              Prioridad
              <UiSelect
                :model-value="ticket.priority"
                :options="priorityOptions"
                :disabled="saving"
                size="sm"
                block
                @update:model-value="onPriority"
              />
            </label>
            <label
              class="flex flex-col gap-1 text-xs font-medium text-neutral-600 dark:text-neutral-300"
            >
              Responsable
              <UiSelect
                :model-value="ticket.assignedTo?.id ?? ''"
                :options="assigneeOptions"
                placeholder="Sin asignar"
                :disabled="saving"
                size="sm"
                block
                @update:model-value="onAssignee"
              />
            </label>
          </template>
        </section>

        <dl class="flex flex-col gap-3 rounded-xl bg-neutral-50 p-4 dark:bg-white/5">
          <div v-if="!tenant.canManageTickets">
            <dt class="text-xs text-neutral-500">Responsable</dt>
            <dd class="font-medium">{{ ticket.assignedTo?.fullName ?? 'Sin asignar' }}</dd>
          </div>
          <div>
            <dt class="text-xs text-neutral-500">Radicada por</dt>
            <dd class="font-medium">{{ ticket.createdBy?.fullName ?? '—' }}</dd>
            <dd v-if="ticket.createdBy" class="flex flex-col text-xs text-neutral-500">
              <a :href="`mailto:${ticket.createdBy.email}`" class="truncate hover:underline">{{
                ticket.createdBy.email
              }}</a>
              <a
                v-if="ticket.createdBy.phone"
                :href="`tel:${ticket.createdBy.phone}`"
                class="hover:underline"
                >{{ ticket.createdBy.phone }}</a
              >
            </dd>
          </div>
          <div>
            <dt class="text-xs text-neutral-500">Unidad</dt>
            <dd class="font-medium">
              <RouterLink
                v-if="ticket.unit"
                :to="{ name: 'unit', params: { id: ticket.unit.id } }"
                class="hover:underline"
                >{{ ticket.unit.building ? `${ticket.unit.building.name} · ` : ''
                }}{{ ticket.unit.code }}</RouterLink
              >
              <span v-else>Zonas comunes</span>
            </dd>
          </div>
          <div>
            <dt class="text-xs text-neutral-500">Radicada</dt>
            <dd class="font-medium">{{ formatDateTime(ticket.createdAt) }}</dd>
          </div>
          <div v-if="ticket.resolvedAt">
            <dt class="text-xs text-neutral-500">Resuelta</dt>
            <dd class="font-medium">{{ formatDateTime(ticket.resolvedAt) }}</dd>
          </div>
          <div v-else>
            <dt class="text-xs text-neutral-500">Fecha límite</dt>
            <dd
              class="font-medium"
              :class="ticket.isOverdue ? 'text-coral-700 dark:text-coral-300' : ''"
            >
              {{ formatDate(ticket.dueAt) }}
            </dd>
          </div>
        </dl>

        <AttachmentList
          owner-type="ticket"
          :owner-id="ticket.id"
          :initial="ticket.attachments"
          title="Fotos y soportes"
          :editable="tenant.canWorkTickets"
        />
      </aside>
    </div>
  </UiModal>
</template>
