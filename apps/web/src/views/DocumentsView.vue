<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { UiAlert, UiButton, UiInput, UiModal, UiPagination, UiSkeleton, useToast } from '@aptoph/ui'
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_CATEGORY_ICONS,
  DOCUMENT_CATEGORY_LABELS,
  attachmentIcon,
  formatFileSize,
  type ApiPaginated,
  type DocumentCategory,
  type DocumentDetail,
  type DocumentFolder,
  type DocumentItem,
} from '@aptoph/shared'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import { residentApi } from '@/api/resident'
import { errorMessage } from '@/lib/errors'
import { formatDate } from '@/lib/format'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const search = ref('')
const category = ref<DocumentCategory | ''>('')
/** '' everything, or a folder id */
const folder = ref('')
const page = ref(1)

const list = ref<(ApiPaginated<DocumentItem> & { categories: DocumentCategory[] }) | null>(null)
/** The categories with something to see, in the usual order */
const categories = computed(() => {
  const present = new Set(list.value?.categories ?? [])
  return DOCUMENT_CATEGORIES.filter((value) => present.has(value) || value === category.value)
})
const folders = ref<DocumentFolder[]>([])
const error = ref<string | null>(null)
const loading = ref(false)

const detail = ref<DocumentDetail | null>(null)
const detailOpen = computed({
  get: () => !!detail.value,
  set: (value) => !value && (detail.value = null),
})
const opening = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    list.value = await residentApi.documents.list({
      search: search.value,
      category: category.value,
      folder: folder.value,
      page: page.value,
    })
  } catch (e) {
    error.value = errorMessage(e, 'No pudimos cargar los documentos')
  } finally {
    loading.value = false
  }
}

let timer: ReturnType<typeof setTimeout> | undefined
watch([category, folder], () => {
  page.value = 1
  load()
})
watch(search, () => {
  clearTimeout(timer)
  timer = setTimeout(() => ((page.value = 1), load()), 300)
})

/* Folders: the ones at the current level, with a trail back */
const byId = computed(() => new Map(folders.value.map((f) => [f.id, f])))
const trail = computed(() => {
  const result: DocumentFolder[] = []
  let current = byId.value.get(folder.value)
  while (current) {
    result.unshift(current)
    current = current.parentId ? byId.value.get(current.parentId) : undefined
  }
  return result
})
const subfolders = computed(() =>
  folders.value.filter(
    (f) =>
      (f.parentId ?? '') === folder.value ||
      (!folder.value && f.parentId && !byId.value.has(f.parentId)),
  ),
)
const countIn = (id: string): number =>
  (byId.value.get(id)?.documentCount ?? 0) +
  folders.value.filter((f) => f.parentId === id).reduce((sum, f) => sum + countIn(f.id), 0)

const filtered = computed(() => !!(search.value || category.value))

async function openDetail(id: string) {
  try {
    detail.value = (await residentApi.documents.show(id)).data
  } catch (e) {
    toast.error(errorMessage(e, 'No encontramos ese documento'))
  }
}

async function openFile(file: NonNullable<DocumentItem['file']>, download = false) {
  opening.value = file.id
  // Open the tab before the await so the browser does not block it
  const tab = download ? null : window.open('', '_blank')
  try {
    const { url } = (await residentApi.documents.fileUrl(file.id, download)).data
    if (download) {
      const link = document.createElement('a')
      link.href = url
      link.rel = 'noopener'
      document.body.appendChild(link)
      link.click()
      link.remove()
    } else if (tab) tab.location.href = url
    else window.location.href = url
  } catch (e) {
    tab?.close()
    toast.error(errorMessage(e, 'No pudimos abrir el archivo'))
  } finally {
    opening.value = null
  }
}

onMounted(async () => {
  load()
  try {
    folders.value = (await residentApi.documents.folders()).data
  } catch {
    // Without folders the list still works
  }
  // Link from a notification: /documentos?documento=…
  const id = route.query.documento
  if (typeof id === 'string' && id) {
    openDetail(id)
    const query = { ...route.query }
    delete query.documento
    router.replace({ query })
  }
})
</script>

<template>
  <PageHeader
    title="Documentos"
    subtitle="Actas, reglamentos, estados financieros y demás documentos que el conjunto comparte contigo"
  />

  <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
    <UiInput
      v-model="search"
      type="search"
      placeholder="Busca por título, número de acta…"
      aria-label="Buscar documentos"
      class="w-full sm:max-w-sm"
    />
  </div>

  <div
    v-if="categories.length > 1"
    class="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
    role="group"
    aria-label="Categoría"
  >
    <button
      type="button"
      class="shrink-0 rounded-full px-3 py-1.5 text-sm ring-1 transition"
      :class="
        category === ''
          ? 'bg-neutral-900 text-white ring-neutral-900 dark:bg-white dark:text-neutral-900 dark:ring-white'
          : 'ring-neutral-200 hover:ring-mint-500 dark:ring-white/15'
      "
      :aria-pressed="category === ''"
      @click="category = ''"
    >
      Todos
    </button>
    <button
      v-for="value in categories"
      :key="value"
      type="button"
      class="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ring-1 transition"
      :class="
        category === value
          ? 'bg-neutral-900 text-white ring-neutral-900 dark:bg-white dark:text-neutral-900 dark:ring-white'
          : 'ring-neutral-200 hover:ring-mint-500 dark:ring-white/15'
      "
      :aria-pressed="category === value"
      @click="category = category === value ? '' : value"
    >
      <i class="mdi" :class="DOCUMENT_CATEGORY_ICONS[value]" aria-hidden="true" />
      {{ DOCUMENT_CATEGORY_LABELS[value] }}
    </button>
  </div>

  <!-- Folders -->
  <nav v-if="folders.length" aria-label="Carpetas" class="mb-5 space-y-3">
    <ol class="flex flex-wrap items-center gap-1 text-sm">
      <li>
        <button
          type="button"
          class="rounded-md px-1.5 py-0.5 font-medium hover:bg-neutral-100 dark:hover:bg-white/10"
          :class="folder ? 'text-mint-700 dark:text-mint-300' : 'text-neutral-900 dark:text-white'"
          :aria-current="folder ? undefined : 'location'"
          @click="folder = ''"
        >
          Todos los documentos
        </button>
      </li>
      <li v-for="(item, index) in trail" :key="item.id" class="flex items-center gap-1">
        <i class="mdi mdi-chevron-right text-neutral-400" aria-hidden="true" />
        <button
          type="button"
          class="rounded-md px-1.5 py-0.5 font-medium hover:bg-neutral-100 dark:hover:bg-white/10"
          :class="
            index < trail.length - 1
              ? 'text-mint-700 dark:text-mint-300'
              : 'text-neutral-900 dark:text-white'
          "
          :aria-current="index === trail.length - 1 ? 'location' : undefined"
          @click="folder = item.id"
        >
          {{ item.name }}
        </button>
      </li>
    </ol>
    <div v-if="subfolders.length" class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      <button
        v-for="item in subfolders"
        :key="item.id"
        type="button"
        class="flex items-center gap-3 rounded-xl bg-white p-3 text-left ring-1 ring-neutral-100 transition hover:ring-mint-500/50 dark:bg-neutral-900 dark:ring-white/10"
        @click="folder = item.id"
      >
        <i class="mdi mdi-folder text-2xl text-amber-500" aria-hidden="true" />
        <span class="min-w-0">
          <span class="block truncate text-sm font-medium">{{ item.name }}</span>
          <span class="block text-xs text-neutral-500"
            >{{ countIn(item.id) }} {{ countIn(item.id) === 1 ? 'documento' : 'documentos' }}</span
          >
        </span>
      </button>
    </div>
  </nav>

  <div v-if="error" class="flex flex-col items-start gap-4">
    <UiAlert color="danger" variant="soft" class="w-full">{{ error }}</UiAlert>
    <UiButton variant="outline" @click="load">Reintentar</UiButton>
  </div>

  <div v-else-if="!list" class="flex flex-col gap-3" aria-busy="true">
    <UiSkeleton v-for="n in 4" :key="n" height="4.5rem" variant="rounded" />
  </div>

  <p
    v-else-if="list.data.length === 0 && subfolders.length && !filtered"
    class="text-sm text-neutral-500 dark:text-neutral-400"
  >
    Abre una carpeta para ver sus documentos.
  </p>

  <EmptyState
    v-else-if="list.data.length === 0"
    class="rounded-2xl border border-neutral-100 bg-white dark:border-white/10 dark:bg-neutral-900"
    :title="filtered ? 'Ningún documento coincide' : 'No hay documentos aquí'"
    :description="
      filtered
        ? 'Prueba con otra búsqueda u otra categoría.'
        : 'Cuando la administración comparta actas, reglamentos u otros documentos contigo, los verás aquí.'
    "
  />

  <template v-else>
    <ul
      class="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-100 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-neutral-900"
      :aria-busy="loading"
    >
      <li v-for="item in list.data" :key="item.id" class="flex items-center gap-3 p-4">
        <span
          class="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-xl text-brand-700 dark:bg-brand-400/15 dark:text-brand-200"
        >
          <i class="mdi" :class="DOCUMENT_CATEGORY_ICONS[item.category]" aria-hidden="true" />
        </span>
        <button type="button" class="min-w-0 flex-1 text-left" @click="openDetail(item.id)">
          <span class="block font-medium hover:underline">{{ item.title }}</span>
          <span
            class="mt-0.5 flex flex-wrap gap-x-3 text-xs text-neutral-500 dark:text-neutral-400"
          >
            <span>{{ DOCUMENT_CATEGORY_LABELS[item.category] }}</span>
            <span v-if="item.reference">{{ item.reference }}</span>
            <span v-if="item.documentDate || item.publishedAt">{{
              formatDate((item.documentDate ?? item.publishedAt)!)
            }}</span>
            <span v-if="item.folder && !folder" class="hidden sm:inline"
              ><i class="mdi mdi-folder-outline" aria-hidden="true" /> {{ item.folder.name }}</span
            >
          </span>
        </button>
        <template v-if="item.file">
          <UiButton
            size="sm"
            variant="outline"
            icon="mdi-eye-outline"
            :loading="opening === item.file.id"
            :aria-label="`Ver ${item.title}`"
            @click="openFile(item.file)"
            ><span class="hidden sm:inline">Ver</span></UiButton
          >
          <UiButton
            size="sm"
            variant="ghost"
            icon="mdi-download"
            :title="`Descargar ${item.file.fileName}`"
            :aria-label="`Descargar ${item.title}`"
            @click="openFile(item.file, true)"
          />
        </template>
      </li>
    </ul>
    <UiPagination
      v-if="list.metadata.lastPage > 1"
      class="mt-4"
      :page="list.metadata.currentPage"
      :per-page="list.metadata.perPage"
      :total="list.metadata.total"
      @paginate="(p: number) => ((page = p), load())"
    />
  </template>

  <UiModal v-model="detailOpen" :title="detail?.title" size="md">
    <div v-if="detail" class="space-y-4">
      <p class="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
        <i class="mdi" :class="DOCUMENT_CATEGORY_ICONS[detail.category]" aria-hidden="true" />
        {{ DOCUMENT_CATEGORY_LABELS[detail.category] }}
        <template v-if="detail.reference"> · {{ detail.reference }}</template>
      </p>
      <p v-if="detail.description" class="text-sm whitespace-pre-line">{{ detail.description }}</p>
      <dl class="grid grid-cols-2 gap-3 text-sm">
        <div v-if="detail.documentDate">
          <dt class="text-xs text-neutral-500">Fecha</dt>
          <dd class="font-medium">{{ formatDate(detail.documentDate) }}</dd>
        </div>
        <div v-if="detail.publishedAt">
          <dt class="text-xs text-neutral-500">Publicado</dt>
          <dd class="font-medium">{{ formatDate(detail.publishedAt) }}</dd>
        </div>
        <div v-if="detail.expiresOn">
          <dt class="text-xs text-neutral-500">Vigente hasta</dt>
          <dd class="font-medium">{{ formatDate(detail.expiresOn) }}</dd>
        </div>
        <div v-if="detail.folder">
          <dt class="text-xs text-neutral-500">Carpeta</dt>
          <dd class="font-medium">{{ detail.folder.name }}</dd>
        </div>
      </dl>
      <div
        v-if="detail.file"
        class="flex items-center gap-3 rounded-xl bg-neutral-50 p-3 ring-1 ring-neutral-200 dark:bg-white/5 dark:ring-white/10"
      >
        <i
          class="mdi text-3xl text-brand-600 dark:text-brand-300"
          :class="attachmentIcon(detail.file.mimeType)"
          aria-hidden="true"
        />
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium">{{ detail.file.fileName }}</p>
          <p class="text-xs text-neutral-500">{{ formatFileSize(detail.file.sizeBytes) }}</p>
        </div>
      </div>
    </div>
    <template v-if="detail?.file" #footer>
      <div class="flex justify-end gap-2">
        <UiButton variant="ghost" icon="mdi-download" @click="openFile(detail.file, true)"
          >Descargar</UiButton
        >
        <UiButton
          color="primary"
          icon="mdi-eye-outline"
          :loading="opening === detail.file.id"
          @click="openFile(detail.file)"
          >Ver documento</UiButton
        >
      </div>
    </template>
  </UiModal>
</template>
