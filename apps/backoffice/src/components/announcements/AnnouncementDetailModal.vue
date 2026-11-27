<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  UiAlert,
  UiBadge,
  UiButton,
  UiModal,
  UiRichText,
  UiSkeleton,
  UiTabs,
  useToast,
} from '@aptoph/ui'
import {
  ANNOUNCEMENT_AUDIENCE_LABELS,
  ANNOUNCEMENT_STATUS_LABELS,
  type AnnouncementDetail,
  type AnnouncementReader,
  type AnnouncementStatus,
} from '@aptoph/shared'
import { announcementsApi } from '@/api/announcements'
import AttachmentList from '@/components/attachments/AttachmentList.vue'
import { errorMessage } from '@/lib/errors'
import { formatDateTime } from '@/lib/format'
import { useTenantStore } from '@/stores/tenant'

const props = defineProps<{ announcementId: string | null }>()
const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ changed: []; edit: [AnnouncementDetail] }>()
const tenant = useTenantStore()
const toast = useToast()

const announcement = ref<AnnouncementDetail | null>(null)
const readers = ref<AnnouncementReader[] | null>(null)
const readersTab = ref('pending')
const error = ref<string | null>(null)
const busy = ref(false)
const confirmDelete = ref(false)

async function load() {
  if (!props.announcementId) return
  announcement.value = null
  readers.value = null
  error.value = null
  try {
    announcement.value = (await announcementsApi.get(props.announcementId)).data
    if (announcement.value.status === 'published') {
      readers.value = (await announcementsApi.readers(props.announcementId)).data
    }
  } catch (e) {
    error.value = errorMessage(e)
  }
}
watch(open, (isOpen) => isOpen && load())

const statusColor = (status: AnnouncementStatus) =>
  status === 'published' ? 'success' : status === 'scheduled' ? 'primary' : 'neutral'

const audience = computed(() => {
  const a = announcement.value
  if (!a) return ''
  const label = ANNOUNCEMENT_AUDIENCE_LABELS[a.audience]
  return a.buildings.length ? `${label} · ${a.buildings.map((b) => b.name).join(', ')}` : label
})
const read = computed(() => readers.value?.filter((r) => r.readAt) ?? [])
const pending = computed(() => readers.value?.filter((r) => !r.readAt) ?? [])
const readerTabs = computed(() => [
  { label: `Sin leer (${pending.value.length})`, value: 'pending' },
  { label: `Leído (${read.value.length})`, value: 'read' },
])

async function act(action: () => Promise<unknown>, message: string) {
  busy.value = true
  try {
    await action()
    toast.success(message)
    emit('changed')
    await load()
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    busy.value = false
  }
}

async function remove() {
  busy.value = true
  try {
    await announcementsApi.remove(props.announcementId!)
    toast.success('Comunicado eliminado')
    confirmDelete.value = false
    open.value = false
    emit('changed')
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <UiModal v-model="open" :title="announcement?.title ?? 'Comunicado'" size="lg" scrollable>
    <UiAlert v-if="error" color="danger" variant="soft">{{ error }}</UiAlert>
    <UiSkeleton v-else-if="!announcement" class="h-64 rounded-xl" />
    <div v-else class="flex flex-col gap-5 text-sm">
      <div class="flex flex-wrap items-center gap-2">
        <UiBadge
          :label="ANNOUNCEMENT_STATUS_LABELS[announcement.status]"
          :color="statusColor(announcement.status)"
          variant="soft"
          size="sm"
        />
        <UiBadge
          v-if="announcement.isPinned"
          label="Fijado"
          color="warning"
          variant="soft"
          size="sm"
        />
        <span class="text-neutral-500">{{ audience }}</span>
      </div>

      <dl
        class="grid grid-cols-1 gap-3 rounded-xl bg-neutral-50 p-4 sm:grid-cols-3 dark:bg-white/5"
      >
        <div>
          <dt class="text-neutral-500">
            {{ announcement.status === 'scheduled' ? 'Se publica' : 'Publicado' }}
          </dt>
          <dd class="font-medium">
            {{ announcement.publishedAt ? formatDateTime(announcement.publishedAt) : '—' }}
          </dd>
        </div>
        <div>
          <dt class="text-neutral-500">Correo</dt>
          <dd class="font-medium">
            <template v-if="announcement.emailSkipped">
              <span class="text-coral-700 dark:text-coral-300">No enviado: sin cupo</span>
            </template>
            <template v-else-if="announcement.emailedAt"
              >Enviado a {{ announcement.emailCount ?? 0 }}
              {{ announcement.emailCount === 1 ? 'persona' : 'personas' }}</template
            >
            <template v-else-if="announcement.sendEmail">Al publicarse</template>
            <template v-else>No</template>
          </dd>
        </div>
        <div>
          <dt class="text-neutral-500">Creado por</dt>
          <dd class="font-medium">{{ announcement.createdBy ?? '—' }}</dd>
        </div>
      </dl>

      <article class="flex flex-col gap-4">
        <a
          v-if="announcement.image"
          :href="announcement.image.url"
          target="_blank"
          rel="noopener"
          class="block overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 dark:border-white/10 dark:bg-white/5"
          title="Abrir la imagen completa"
        >
          <img
            :src="announcement.image.url"
            :alt="`Imagen del comunicado ${announcement.title}`"
            class="mx-auto max-h-[32rem] w-auto object-contain"
          />
        </a>
        <UiRichText v-if="announcement.body" :html="announcement.body" />
      </article>

      <AttachmentList
        owner-type="announcement"
        :owner-id="announcement.id"
        :initial="announcement.attachments"
        title="Adjuntos"
        :editable="tenant.canManageAnnouncements"
      />

      <section v-if="announcement.status === 'published'">
        <div class="mb-2 flex items-center justify-between gap-2">
          <h3 class="font-semibold">Lectura</h3>
          <span v-if="announcement.reads" class="text-neutral-500 tabular-nums"
            >{{ announcement.reads.read }} de {{ announcement.reads.total }} lo leyeron</span
          >
        </div>
        <div
          v-if="announcement.reads && announcement.reads.total > 0"
          class="mb-3 h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-white/10"
          role="progressbar"
          :aria-valuenow="announcement.reads.read"
          :aria-valuemax="announcement.reads.total"
          aria-label="Personas que lo leyeron"
        >
          <div
            class="h-full rounded-full bg-mint-500"
            :style="{ width: `${(announcement.reads.read / announcement.reads.total) * 100}%` }"
          />
        </div>
        <UiSkeleton v-if="readers === null" class="h-24 rounded-lg" />
        <template v-else-if="readers.length">
          <UiTabs v-model="readersTab" :tabs="readerTabs" class="mb-2" aria-label="Lectura" />
          <ul class="max-h-72 divide-y divide-neutral-100 overflow-y-auto dark:divide-white/10">
            <li
              v-for="reader in readersTab === 'read' ? read : pending"
              :key="reader.userId"
              class="flex items-center justify-between gap-3 py-2"
            >
              <span class="min-w-0">
                <span class="block truncate font-medium">{{ reader.fullName }}</span>
                <span v-if="reader.detail" class="block truncate text-xs text-neutral-500">{{
                  reader.detail
                }}</span>
              </span>
              <span v-if="reader.readAt" class="shrink-0 text-xs text-neutral-500">{{
                formatDateTime(reader.readAt)
              }}</span>
            </li>
            <li
              v-if="(readersTab === 'read' ? read : pending).length === 0"
              class="py-3 text-neutral-500"
            >
              {{ readersTab === 'read' ? 'Nadie lo ha leído todavía.' : 'Todos lo leyeron.' }}
            </li>
          </ul>
        </template>
        <p v-else class="text-neutral-500">Nadie está en la audiencia de este comunicado.</p>
      </section>
    </div>

    <template v-if="announcement && tenant.canManageAnnouncements" #footer>
      <div class="flex flex-wrap justify-end gap-2">
        <UiButton variant="ghost" color="danger" :disabled="busy" @click="confirmDelete = true"
          >Eliminar</UiButton
        >
        <UiButton
          v-if="announcement.status !== 'draft'"
          variant="ghost"
          :loading="busy"
          @click="act(() => announcementsApi.unpublish(announcement!.id), 'Volvió a borrador')"
          >Despublicar</UiButton
        >
        <UiButton variant="outline" :disabled="busy" @click="emit('edit', announcement)"
          >Editar</UiButton
        >
        <UiButton
          v-if="announcement.status !== 'published'"
          color="primary"
          :loading="busy"
          @click="act(() => announcementsApi.publish(announcement!.id), 'Comunicado publicado')"
          >Publicar ahora</UiButton
        >
      </div>
    </template>
  </UiModal>

  <UiModal v-model="confirmDelete" title="Eliminar comunicado" size="sm">
    <p class="text-sm">
      Se quita del portal y del backoffice. Los residentes ya no podrán verlo ni abrir sus adjuntos.
    </p>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UiButton variant="ghost" @click="confirmDelete = false">Cancelar</UiButton>
        <UiButton color="danger" :loading="busy" @click="remove">Eliminar</UiButton>
      </div>
    </template>
  </UiModal>
</template>
