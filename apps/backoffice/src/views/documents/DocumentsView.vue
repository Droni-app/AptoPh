<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  UiBadge,
  UiButton,
  UiDropdown,
  UiDropdownItem,
  UiInput,
  UiModal,
  UiSelect,
  UiTable,
  UiTabs,
  useToast,
  type TableColumn,
} from '@aptoph/ui'
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_CATEGORY_ICONS,
  DOCUMENT_CATEGORY_LABELS,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_VISIBILITIES,
  DOCUMENT_VISIBILITY_ICONS,
  DOCUMENT_VISIBILITY_LABELS,
  type ApiPaginated,
  type DocumentCategory,
  type DocumentDetail,
  type DocumentFolder,
  type DocumentItem,
  type DocumentStats,
  type DocumentStatus,
  type DocumentVisibility,
} from '@aptoph/shared'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import DocumentFormModal from '@/components/documents/DocumentFormModal.vue'
import DocumentDetailModal from '@/components/documents/DocumentDetailModal.vue'
import { documentsApi } from '@/api/documents'
import {
  STATUS_COLORS,
  daysToExpiry,
  descendantsOf,
  expiryLabel,
  folderTree,
  openDocumentFile,
} from '@/lib/documents'
import { errorMessage, fieldErrors } from '@/lib/errors'
import { formatDate } from '@/lib/format'
import { useTenantStore } from '@/stores/tenant'

const route = useRoute()
const router = useRouter()
const tenant = useTenantStore()
const toast = useToast()
const manage = computed(() => tenant.canManage)

type Tab = 'published' | 'draft' | 'expiring' | 'archived' | ''

const tab = ref<Tab>('published')
const search = ref('')
/** '' all, 'root' outside folders, or a folder id */
const folder = ref('')
const category = ref<DocumentCategory | ''>('')
const visibility = ref<DocumentVisibility | ''>('')
const year = ref<number | ''>('')
const page = ref(1)

const list = ref<ApiPaginated<DocumentItem> | null>(null)
const folders = ref<DocumentFolder[]>([])
const stats = ref<DocumentStats | null>(null)
const loading = ref(false)

const detailId = ref<string | null>(null)
const formOpen = ref(false)
const editing = ref<DocumentDetail | null>(null)

const tabs = computed(() => [
  { label: 'Publicados', value: 'published' },
  { label: 'Borradores', value: 'draft', badge: stats.value?.drafts || undefined },
  { label: 'Por vencer', value: 'expiring', badge: stats.value?.expiring || undefined },
  { label: 'Archivados', value: 'archived' },
  { label: 'Todos', value: '' },
])

const tree = computed(() => folderTree(folders.value))
const categoryOptions = [
  { value: '', label: 'Todas las categorías' },
  ...DOCUMENT_CATEGORIES.map((value) => ({ value, label: DOCUMENT_CATEGORY_LABELS[value] })),
]
const visibilityOptions = [
  { value: '', label: 'Cualquier visibilidad' },
  ...DOCUMENT_VISIBILITIES.map((value) => ({ value, label: DOCUMENT_VISIBILITY_LABELS[value] })),
]
const thisYear = new Date().getFullYear()
const yearOptions = [
  { value: '', label: 'Cualquier año' },
  ...Array.from({ length: 12 }, (_, i) => ({ value: thisYear - i, label: String(thisYear - i) })),
]

const columns = computed<TableColumn[]>(() => [
  { name: 'title', label: 'Documento' },
  { name: 'folder', label: 'Carpeta', classes: 'hidden lg:table-cell' },
  ...(manage.value ? [{ name: 'visibility', label: 'Quién lo ve' }] : []),
  { name: 'date', label: 'Fecha' },
  ...(manage.value ? [{ name: 'status', label: 'Estado' }] : []),
  { name: 'actions', label: '', classes: 'w-px' },
])

const filtered = computed(
  () => !!(search.value || category.value || visibility.value || year.value),
)

async function load() {
  loading.value = true
  try {
    const [rows, counts] = await Promise.all([
      documentsApi.list({
        search: search.value,
        category: category.value,
        folder: folder.value,
        visibility: manage.value ? visibility.value : '',
        year: year.value || undefined,
        status: manage.value && tab.value !== 'expiring' ? (tab.value as DocumentStatus | '') : '',
        expiring: manage.value && tab.value === 'expiring',
        page: page.value,
      }),
      manage.value ? documentsApi.stats() : Promise.resolve(null),
    ])
    list.value = rows
    if (counts) stats.value = counts.data
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    loading.value = false
  }
}

async function loadFolders() {
  try {
    folders.value = (await documentsApi.folders()).data
  } catch (e) {
    toast.error(errorMessage(e))
  }
}

function reload() {
  load()
  loadFolders()
}

let timer: ReturnType<typeof setTimeout> | undefined
watch([tab, folder, category, visibility, year], () => {
  page.value = 1
  load()
})
watch(search, () => {
  clearTimeout(timer)
  timer = setTimeout(() => ((page.value = 1), load()), 300)
})

function clearFilters() {
  search.value = ''
  category.value = ''
  visibility.value = ''
  year.value = ''
}

function newDocument() {
  editing.value = null
  formOpen.value = true
}

function onSaved(document: DocumentDetail) {
  reload()
  detailId.value = document.id
}

function onEdit(document: DocumentDetail) {
  editing.value = document
  formOpen.value = true
}

const openFile = (row: DocumentItem) =>
  row.file &&
  openDocumentFile(() => documentsApi.fileUrl(row.file!.id)).catch((e) =>
    toast.error(errorMessage(e)),
  )

const folderCount = (id: string) => {
  const ids = descendantsOf(folders.value, id)
  return folders.value.filter((f) => ids.has(f.id)).reduce((sum, f) => sum + f.documentCount, 0)
}

/* Folder management */
const folderModal = ref(false)
const folderForm = ref<{ id: string | null; name: string; parentId: string | null }>({
  id: null,
  name: '',
  parentId: null,
})
const folderErrors = ref<Record<string, string>>({})
const folderSaving = ref(false)
const removingFolder = ref<DocumentFolder | null>(null)

const parentOptions = computed(() => {
  const excluded = folderForm.value.id
    ? descendantsOf(folders.value, folderForm.value.id)
    : new Set()
  return [
    { value: null, label: 'En la raíz' },
    ...tree.value
      .filter((f) => !excluded.has(f.id))
      .map((f) => ({ value: f.id, label: `${'  '.repeat(f.depth)}${f.name}` })),
  ]
})

function editFolder(target: DocumentFolder | null, parentId: string | null = null) {
  folderErrors.value = {}
  folderForm.value = target
    ? { id: target.id, name: target.name, parentId: target.parentId }
    : { id: null, name: '', parentId }
  folderModal.value = true
}

async function saveFolder() {
  folderSaving.value = true
  folderErrors.value = {}
  try {
    const input = { name: folderForm.value.name, parentId: folderForm.value.parentId }
    if (folderForm.value.id) await documentsApi.updateFolder(folderForm.value.id, input)
    else {
      const { data } = await documentsApi.createFolder(input)
      folder.value = data.id
    }
    folderModal.value = false
    toast.success(folderForm.value.id ? 'Carpeta actualizada' : 'Carpeta creada')
    loadFolders()
  } catch (e) {
    folderErrors.value = fieldErrors(e)
    if (!Object.keys(folderErrors.value).length) toast.error(errorMessage(e))
  } finally {
    folderSaving.value = false
  }
}

async function removeFolder() {
  folderSaving.value = true
  try {
    await documentsApi.removeFolder(removingFolder.value!.id)
    if (folder.value === removingFolder.value!.id) folder.value = ''
    removingFolder.value = null
    toast.success('Carpeta eliminada')
    loadFolders()
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    folderSaving.value = false
  }
}

/** Classes of a folder entry in the side list */
const folderClass = (active: boolean) => [
  'flex w-full min-w-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition',
  active
    ? 'bg-mint-50 font-medium text-mint-800 dark:bg-mint-400/10 dark:text-mint-200'
    : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-white/5',
]

const selectedFolder = computed(() => folders.value.find((f) => f.id === folder.value) ?? null)

onMounted(() => {
  reload()
  // Link from a notification: /documentos?documento=…
  const id = route.query.documento
  if (typeof id === 'string' && id) {
    detailId.value = id
    const query = { ...route.query }
    delete query.documento
    router.replace({ query })
  }
})
</script>

<template>
  <PageHeader
    title="Documentos"
    :subtitle="
      manage
        ? 'Actas, reglamentos, contratos, pólizas y soportes del conjunto, con control de quién ve cada uno'
        : 'Los documentos del conjunto que tu rol te permite consultar'
    "
  >
    <template v-if="manage" #actions>
      <UiButton
        variant="outline"
        icon="mdi-folder-plus-outline"
        @click="editFolder(null, selectedFolder?.id ?? null)"
        >Nueva carpeta</UiButton
      >
      <UiButton color="primary" icon="mdi-plus" @click="newDocument">Nuevo documento</UiButton>
    </template>
  </PageHeader>

  <div v-if="manage && stats" class="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
    <div
      class="flex items-start gap-3 rounded-2xl bg-white p-4 ring-1 ring-brand-900/5 dark:bg-neutral-900 dark:ring-white/10"
    >
      <span
        class="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-xl text-brand-700 dark:bg-brand-400/15 dark:text-brand-200"
      >
        <i class="mdi mdi-folder-file-outline" aria-hidden="true" />
      </span>
      <span>
        <span class="block text-xs font-medium text-neutral-500 dark:text-neutral-400"
          >Documentos vigentes</span
        >
        <span class="block text-lg font-bold text-brand-700 tabular-nums dark:text-white">{{
          stats.total
        }}</span>
      </span>
    </div>
    <button
      type="button"
      class="flex items-start gap-3 rounded-2xl bg-white p-4 text-left ring-1 ring-brand-900/5 transition hover:ring-mint-500/40 dark:bg-neutral-900 dark:ring-white/10"
      @click="tab = 'draft'"
    >
      <span
        class="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-xl text-amber-700 dark:bg-amber-400/15 dark:text-amber-200"
      >
        <i class="mdi mdi-file-document-edit-outline" aria-hidden="true" />
      </span>
      <span>
        <span class="block text-xs font-medium text-neutral-500 dark:text-neutral-400"
          >Borradores</span
        >
        <span class="block text-lg font-bold text-brand-700 tabular-nums dark:text-white">{{
          stats.drafts
        }}</span>
      </span>
    </button>
    <button
      type="button"
      class="flex items-start gap-3 rounded-2xl bg-white p-4 text-left ring-1 ring-brand-900/5 transition hover:ring-mint-500/40 dark:bg-neutral-900 dark:ring-white/10"
      @click="tab = 'expiring'"
    >
      <span
        class="grid size-10 shrink-0 place-items-center rounded-xl bg-coral-50 text-xl text-coral-700 dark:bg-coral-400/15 dark:text-coral-300"
      >
        <i class="mdi mdi-calendar-alert" aria-hidden="true" />
      </span>
      <span>
        <span class="block text-xs font-medium text-neutral-500 dark:text-neutral-400"
          >Vencen en 30 días</span
        >
        <span class="block text-lg font-bold text-brand-700 tabular-nums dark:text-white">{{
          stats.expiring
        }}</span>
      </span>
    </button>
    <div
      class="flex items-start gap-3 rounded-2xl bg-white p-4 ring-1 ring-brand-900/5 dark:bg-neutral-900 dark:ring-white/10"
    >
      <span
        class="grid size-10 shrink-0 place-items-center rounded-xl bg-mint-50 text-xl text-mint-700 dark:bg-mint-400/15 dark:text-mint-300"
      >
        <i class="mdi mdi-file-document-multiple-outline" aria-hidden="true" />
      </span>
      <span>
        <span class="block text-xs font-medium text-neutral-500 dark:text-neutral-400">Actas</span>
        <span class="block text-lg font-bold text-brand-700 tabular-nums dark:text-white">{{
          stats.byCategory.minutes ?? 0
        }}</span>
      </span>
    </div>
  </div>

  <div class="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
    <!-- Folders -->
    <nav aria-label="Carpetas" class="space-y-1 lg:sticky lg:top-20 lg:self-start">
      <p class="px-3 pb-1 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
        Carpetas
      </p>
      <button
        type="button"
        :class="folderClass(folder === '')"
        :aria-current="folder === '' ? 'true' : undefined"
        @click="folder = ''"
      >
        <i class="mdi mdi-folder-multiple-outline" aria-hidden="true" />
        <span class="flex-1 truncate">Todos los documentos</span>
      </button>
      <div v-for="item in tree" :key="item.id" class="flex items-center gap-0.5">
        <button
          type="button"
          :class="folderClass(folder === item.id)"
          :style="{ paddingLeft: `${0.75 + item.depth * 1}rem` }"
          :aria-current="folder === item.id ? 'true' : undefined"
          @click="folder = item.id"
        >
          <i
            class="mdi"
            :class="folder === item.id ? 'mdi-folder-open-outline' : 'mdi-folder-outline'"
            aria-hidden="true"
          />
          <span class="flex-1 truncate">{{ item.name }}</span>
          <span class="text-xs text-neutral-400 tabular-nums">{{
            folderCount(item.id) || ''
          }}</span>
        </button>
        <UiDropdown
          v-if="manage"
          placement="bottom-end"
          min-width="12rem"
          trigger-class="grid size-8 shrink-0 place-items-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-white/10"
          :aria-label="`Opciones de la carpeta ${item.name}`"
        >
          <template #trigger><i class="mdi mdi-dots-horizontal" aria-hidden="true" /></template>
          <UiDropdownItem icon="mdi-folder-plus-outline" @click="editFolder(null, item.id)"
            >Nueva subcarpeta</UiDropdownItem
          >
          <UiDropdownItem icon="mdi-pencil-outline" @click="editFolder(item)"
            >Renombrar o mover</UiDropdownItem
          >
          <UiDropdownItem icon="mdi-delete-outline" danger @click="removingFolder = item"
            >Eliminar</UiDropdownItem
          >
        </UiDropdown>
      </div>
      <button
        type="button"
        :class="folderClass(folder === 'root')"
        :aria-current="folder === 'root' ? 'true' : undefined"
        @click="folder = 'root'"
      >
        <i class="mdi mdi-file-outline" aria-hidden="true" />
        <span class="flex-1 truncate">Sin carpeta</span>
      </button>
    </nav>

    <section class="min-w-0">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
        <UiTabs v-if="manage" v-model="tab" :tabs="tabs" aria-label="Estado" />
        <h2 v-else class="text-base font-semibold">
          {{ selectedFolder?.name ?? (folder === 'root' ? 'Sin carpeta' : 'Todos los documentos') }}
        </h2>
        <UiInput
          v-model="search"
          type="search"
          placeholder="Título, descripción o referencia"
          aria-label="Buscar documentos"
          class="w-full sm:w-72"
        />
      </div>

      <div class="mb-4 flex flex-wrap items-center gap-2">
        <UiSelect v-model="category" :options="categoryOptions" size="sm" aria-label="Categoría" />
        <UiSelect
          v-if="manage"
          v-model="visibility"
          :options="visibilityOptions"
          size="sm"
          aria-label="Quién lo ve"
        />
        <UiSelect v-model="year" :options="yearOptions" size="sm" aria-label="Año" />
        <UiButton v-if="filtered" variant="ghost" size="sm" @click="clearFilters"
          >Quitar filtros</UiButton
        >
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
            class="flex max-w-lg items-start gap-3 text-left"
            @click="detailId = row.id"
          >
            <span
              class="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-lg text-brand-700 dark:bg-brand-400/15 dark:text-brand-200"
            >
              <i
                class="mdi"
                :class="DOCUMENT_CATEGORY_ICONS[row.category as DocumentCategory]"
                aria-hidden="true"
              />
            </span>
            <span class="min-w-0">
              <span class="block font-medium hover:underline">{{ row.title }}</span>
              <span class="flex flex-wrap gap-x-3 text-xs text-neutral-500">
                <span>{{ DOCUMENT_CATEGORY_LABELS[row.category as DocumentCategory] }}</span>
                <span v-if="row.reference">{{ row.reference }}</span>
                <span v-if="manage && row.versionCount > 1">{{ row.versionCount }} versiones</span>
                <span v-if="manage && row.viewCount"
                  ><i class="mdi mdi-eye-outline" aria-hidden="true" /> {{ row.viewCount }}</span
                >
              </span>
            </span>
          </button>
        </template>
        <template #folder="{ folder: f }">
          <span v-if="f" class="text-sm whitespace-nowrap">{{ f.name }}</span>
          <span v-else class="text-neutral-400">—</span>
        </template>
        <template #visibility="row">
          <span class="flex items-center gap-1.5 text-sm whitespace-nowrap">
            <i
              class="mdi text-neutral-400"
              :class="DOCUMENT_VISIBILITY_ICONS[row.visibility as DocumentVisibility]"
              aria-hidden="true"
            />
            {{ DOCUMENT_VISIBILITY_LABELS[row.visibility as DocumentVisibility] }}
          </span>
          <span v-if="row.visibility === 'units'" class="text-xs text-neutral-500">
            {{ row.units.map((u: { code: string }) => u.code).join(', ') }}
          </span>
        </template>
        <template #date="row">
          <span class="block whitespace-nowrap">{{
            formatDate(row.documentDate ?? row.publishedAt ?? row.updatedAt)
          }}</span>
          <span
            v-if="row.expiresOn && daysToExpiry(row)! <= 30"
            class="flex items-center gap-1 text-xs font-medium whitespace-nowrap"
            :class="
              daysToExpiry(row)! < 0
                ? 'text-coral-700 dark:text-coral-300'
                : 'text-amber-700 dark:text-amber-300'
            "
            ><i class="mdi mdi-calendar-alert" aria-hidden="true" />{{
              expiryLabel(daysToExpiry(row))
            }}</span
          >
          <span v-else-if="row.expiresOn" class="block text-xs whitespace-nowrap text-neutral-500"
            >Vence el {{ formatDate(row.expiresOn) }}</span
          >
        </template>
        <template #status="row">
          <UiBadge
            :label="DOCUMENT_STATUS_LABELS[row.status as DocumentStatus]"
            :color="STATUS_COLORS[row.status as DocumentStatus]"
            variant="soft"
            size="sm"
          />
        </template>
        <template #actions="row">
          <UiButton
            v-if="row.file"
            size="sm"
            variant="ghost"
            icon="mdi-open-in-new"
            :title="`Abrir ${row.file.fileName}`"
            @click="openFile(row)"
          />
        </template>
        <template #empty>
          <EmptyState
            :title="filtered ? 'Ningún documento coincide' : 'No hay documentos aquí'"
            :description="
              filtered
                ? 'Prueba con otra búsqueda o quita los filtros.'
                : manage
                  ? 'Sube actas, reglamentos, contratos, pólizas o cualquier documento del conjunto y decide quién lo puede ver.'
                  : 'Cuando la administración comparta documentos con tu rol, aparecerán aquí.'
            "
          />
        </template>
      </UiTable>
    </section>
  </div>

  <DocumentDetailModal
    :document-id="detailId"
    :manage="manage"
    @close="detailId = null"
    @changed="reload"
    @edit="onEdit"
  />
  <DocumentFormModal
    v-model="formOpen"
    :document="editing"
    :folders="folders"
    :folder-id="selectedFolder?.id ?? null"
    @saved="onSaved"
  />

  <UiModal
    v-model="folderModal"
    :title="folderForm.id ? 'Carpeta' : 'Nueva carpeta'"
    size="sm"
    :persistent="folderSaving"
  >
    <form class="space-y-4" @submit.prevent="saveFolder">
      <label class="block space-y-1 text-sm font-medium">
        <span>Nombre</span>
        <UiInput v-model="folderForm.name" required maxlength="100" placeholder="Asambleas" block />
        <span v-if="folderErrors.name" class="block text-xs font-normal text-coral-700">{{
          folderErrors.name
        }}</span>
      </label>
      <label class="block space-y-1 text-sm font-medium">
        <span>Dentro de</span>
        <UiSelect v-model="folderForm.parentId" :options="parentOptions" block />
        <span v-if="folderErrors.parentId" class="block text-xs font-normal text-coral-700">{{
          folderErrors.parentId
        }}</span>
      </label>
      <p class="text-xs text-neutral-500">
        Las carpetas ordenan los documentos; quién ve cada uno lo decide su visibilidad. Un
        residente solo ve las carpetas donde hay algo para él.
      </p>
    </form>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UiButton variant="ghost" :disabled="folderSaving" @click="folderModal = false"
          >Cancelar</UiButton
        >
        <UiButton color="primary" :loading="folderSaving" @click="saveFolder">Guardar</UiButton>
      </div>
    </template>
  </UiModal>

  <ConfirmDialog
    :model-value="!!removingFolder"
    title="Eliminar carpeta"
    :message="`Se elimina «${removingFolder?.name}». Solo se puede si está vacía: mueve antes sus documentos y subcarpetas.`"
    :loading="folderSaving"
    @update:model-value="(value: boolean) => !value && (removingFolder = null)"
    @confirm="removeFolder"
  />
</template>
