<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  UiBadge,
  UiButton,
  UiInput,
  UiTable,
  UiTabs,
  useToast,
  type TableColumn,
} from '@aptoph/ui'
import {
  ANNOUNCEMENT_AUDIENCE_LABELS,
  ANNOUNCEMENT_STATUS_LABELS,
  type Announcement,
  type AnnouncementDetail,
  type AnnouncementStatus,
  type ApiPaginated,
} from '@aptoph/shared'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import AnnouncementFormModal from '@/components/announcements/AnnouncementFormModal.vue'
import AnnouncementDetailModal from '@/components/announcements/AnnouncementDetailModal.vue'
import { announcementsApi } from '@/api/announcements'
import { errorMessage } from '@/lib/errors'
import { formatDateTime } from '@/lib/format'
import { useTenantStore } from '@/stores/tenant'

const route = useRoute()
const router = useRouter()
const tenant = useTenantStore()
const toast = useToast()

const status = ref<AnnouncementStatus | ''>('')
const search = ref('')
const page = ref(1)
const list = ref<ApiPaginated<Announcement> | null>(null)
const loading = ref(false)

const formOpen = ref(false)
const editing = ref<AnnouncementDetail | null>(null)
const detailOpen = ref(false)
const detailId = ref<string | null>(null)

const tabs = [
  { label: 'Todos', value: '' },
  { label: 'Publicados', value: 'published' },
  { label: 'Programados', value: 'scheduled' },
  { label: 'Borradores', value: 'draft' },
]
const columns: TableColumn[] = [
  { name: 'title', label: 'Comunicado' },
  { name: 'audience', label: 'Para' },
  { name: 'publishedAt', label: 'Publicación' },
  { name: 'reads', label: 'Lectura', classes: 'text-right' },
  { name: 'status', label: 'Estado' },
]
const statusColor = (value: AnnouncementStatus) =>
  value === 'published' ? 'success' : value === 'scheduled' ? 'primary' : 'neutral'

async function load() {
  loading.value = true
  try {
    list.value = await announcementsApi.list({
      status: status.value,
      search: search.value || undefined,
      page: page.value,
    })
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    loading.value = false
  }
}
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(status, () => ((page.value = 1), load()))
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => ((page.value = 1), load()), 300)
})

function openDetail(id: string) {
  detailId.value = id
  detailOpen.value = true
}
function create() {
  editing.value = null
  formOpen.value = true
}
function edit(announcement: AnnouncementDetail) {
  editing.value = announcement
  detailOpen.value = false
  formOpen.value = true
}
function onSaved(announcement: AnnouncementDetail) {
  load()
  openDetail(announcement.id)
}

onMounted(() => {
  load()
  // Link from the announcement email: /comunicados?id=…
  const id = route.query.id
  if (typeof id === 'string' && id) {
    openDetail(id)
    router.replace({ query: {} })
  }
})
</script>

<template>
  <PageHeader
    title="Comunicados"
    subtitle="Circulares y avisos para los residentes, el consejo y el personal"
  >
    <template v-if="tenant.canManageAnnouncements" #actions>
      <UiButton color="primary" @click="create">
        <span class="mr-1"><i class="mdi mdi-plus" aria-hidden="true" /></span>Nuevo comunicado
      </UiButton>
    </template>
  </PageHeader>

  <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
    <UiTabs v-model="status" :tabs="tabs" aria-label="Estado" />
    <UiInput
      v-model="search"
      type="search"
      placeholder="Buscar por título"
      aria-label="Buscar"
      class="w-full sm:w-64"
    />
  </div>

  <UiTable
    :columns="columns"
    :rows="list?.data ?? []"
    :loading="loading"
    :pagination="
      list
        ? {
            page: list.metadata.currentPage,
            perPage: list.metadata.perPage,
            total: list.metadata.total,
          }
        : undefined
    "
    @paginate="(p: number) => ((page = p), load())"
  >
    <template #title="row">
      <button
        type="button"
        class="flex max-w-md items-center gap-1.5 text-left font-medium hover:underline"
        @click="openDetail(row.id)"
      >
        <i v-if="row.isPinned" class="mdi mdi-pin text-amber-500" aria-label="Fijado" role="img" />
        <span class="truncate">{{ row.title }}</span>
      </button>
      <span class="mt-0.5 flex gap-3 text-xs text-neutral-500">
        <span v-if="row.attachmentCount"
          ><i class="mdi mdi-paperclip" aria-hidden="true" /> {{ row.attachmentCount }}</span
        >
        <span v-if="row.emailSkipped" class="text-coral-700 dark:text-coral-300"
          ><i class="mdi mdi-email-alert-outline" aria-hidden="true" /> Sin cupo</span
        >
        <span v-else-if="row.emailedAt"
          ><i class="mdi mdi-email-check-outline" aria-hidden="true" /> Enviado</span
        >
        <span v-else-if="row.sendEmail"
          ><i class="mdi mdi-email-outline" aria-hidden="true" /> Por correo</span
        >
      </span>
    </template>
    <template #audience="row">
      <span>{{ ANNOUNCEMENT_AUDIENCE_LABELS[row.audience as Announcement['audience']] }}</span>
      <span v-if="row.buildings.length" class="block text-xs text-neutral-500">{{
        row.buildings.map((b: { name: string }) => b.name).join(', ')
      }}</span>
    </template>
    <template #publishedAt="{ publishedAt }">
      <span class="whitespace-nowrap">{{ publishedAt ? formatDateTime(publishedAt) : '—' }}</span>
    </template>
    <template #reads="{ reads }">
      <span v-if="reads" class="tabular-nums">{{ reads.read }}/{{ reads.total }}</span>
      <span v-else class="text-neutral-400">—</span>
    </template>
    <template #status="row">
      <UiBadge
        :label="ANNOUNCEMENT_STATUS_LABELS[row.status as AnnouncementStatus]"
        :color="statusColor(row.status)"
        variant="soft"
        size="sm"
      />
    </template>
    <template #empty>
      <EmptyState
        art="sin-mensajes"
        title="No hay comunicados aquí"
        description="Publica circulares y avisos: cortes de agua, asambleas, mantenimientos. Llegan al portal de residentes y, si quieres, por correo."
      />
    </template>
  </UiTable>

  <AnnouncementFormModal v-model="formOpen" :announcement="editing" @saved="onSaved" />
  <AnnouncementDetailModal
    v-model="detailOpen"
    :announcement-id="detailId"
    @changed="load"
    @edit="edit"
  />
</template>
