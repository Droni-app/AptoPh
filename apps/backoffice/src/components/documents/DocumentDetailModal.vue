<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  UiAlert,
  UiBadge,
  UiButton,
  UiModal,
  UiSkeleton,
  UiSwitch,
  UiTabs,
  useToast,
} from '@aptoph/ui'
import {
  DOCUMENT_ACCEPT,
  DOCUMENT_CATEGORY_ICONS,
  DOCUMENT_CATEGORY_LABELS,
  DOCUMENT_MAX_MB,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_VISIBILITY_ICONS,
  DOCUMENT_VISIBILITY_LABELS,
  attachmentIcon,
  formatFileSize,
  type DocumentDetail,
  type DocumentFile,
} from '@aptoph/shared'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { documentsApi } from '@/api/documents'
import {
  STATUS_COLORS,
  daysToExpiry,
  downloadDocumentFile,
  expiryLabel,
  openDocumentFile,
} from '@/lib/documents'
import { errorMessage } from '@/lib/errors'
import { formatDate, formatDateTime } from '@/lib/format'

const props = defineProps<{ documentId: string | null; manage: boolean }>()
const emit = defineEmits<{ changed: []; close: []; edit: [document: DocumentDetail] }>()
const toast = useToast()

const open = computed({
  get: () => !!props.documentId,
  set: (value) => !value && emit('close'),
})

const doc = ref<DocumentDetail | null>(null)
const loading = ref(false)
const busy = ref(false)
const tab = ref('info')
const publishing = ref(false)
const notify = ref(true)
const confirm = ref<'archive' | 'delete' | 'unpublish' | null>(null)
const removingVersion = ref<DocumentFile | null>(null)

watch(
  () => props.documentId,
  async (id) => {
    doc.value = null
    tab.value = 'info'
    publishing.value = false
    if (!id) return
    loading.value = true
    try {
      doc.value = (await documentsApi.get(id)).data
    } catch (e) {
      toast.error(errorMessage(e))
      emit('close')
    } finally {
      loading.value = false
    }
  },
  { immediate: true },
)

const tabs = computed(() => {
  const d = doc.value
  if (!props.manage || !d) return []
  return [
    { label: 'Información', value: 'info' },
    { label: 'Versiones', value: 'versions', badge: d.versions?.length },
    { label: 'Consultas', value: 'access', badge: d.viewCount || undefined },
  ]
})

const expiry = computed(() => (doc.value ? daysToExpiry(doc.value) : null))

function updated(next: DocumentDetail, message?: string) {
  doc.value = next
  if (message) toast.success(message)
  emit('changed')
}

async function run(action: () => Promise<void>) {
  busy.value = true
  try {
    await action()
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    busy.value = false
  }
}

const view = (file: DocumentFile, download = false) =>
  run(async () => {
    const load = () => documentsApi.fileUrl(file.id, download)
    if (download) await downloadDocumentFile(load)
    else await openDocumentFile(load)
    // The opening is logged: refresh the counter and the log
    if (props.manage && doc.value) doc.value = (await documentsApi.get(doc.value.id)).data
  })

const doPublish = () =>
  run(async () => {
    const d = doc.value!
    const canNotify = d.visibility !== 'private'
    const { data, notified } = await documentsApi.publish(d.id, canNotify && notify.value)
    publishing.value = false
    updated(
      data,
      notified
        ? `Publicado. Se avisó a ${notified} ${notified === 1 ? 'persona' : 'personas'}`
        : 'Documento publicado',
    )
  })

const doConfirm = () =>
  run(async () => {
    const d = doc.value!
    if (confirm.value === 'delete') {
      await documentsApi.remove(d.id)
      confirm.value = null
      toast.success('Documento eliminado')
      emit('changed')
      emit('close')
      return
    }
    const { data } =
      confirm.value === 'archive'
        ? await documentsApi.archive(d.id)
        : await documentsApi.unpublish(d.id)
    const message =
      confirm.value === 'archive' ? 'Documento archivado' : 'Retirado: vuelve a ser un borrador'
    confirm.value = null
    updated(data, message)
  })

const restore = () =>
  run(async () => updated((await documentsApi.restore(doc.value!.id)).data, 'Documento restaurado'))

const versionInput = ref<HTMLInputElement | null>(null)
const uploadVersion = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (file.size > DOCUMENT_MAX_MB * 1024 * 1024) {
    toast.error(`El archivo supera ${DOCUMENT_MAX_MB} MB`)
    return
  }
  return run(async () => {
    const { data } = await documentsApi.addVersion(doc.value!.id, file)
    tab.value = 'versions'
    updated(data, `Versión ${data.file?.version} cargada: es la vigente`)
  })
}

const removeVersion = () =>
  run(async () => {
    const { data } = await documentsApi.removeVersion(removingVersion.value!.id)
    removingVersion.value = null
    updated(data, 'Versión retirada')
  })

const unitLabel = (u: NonNullable<DocumentDetail['units']>[number]) =>
  u.building ? `${u.building.name} · ${u.code}` : u.code
</script>

<template>
  <UiModal v-model="open" :title="doc?.title ?? 'Documento'" size="lg" scrollable>
    <div v-if="loading || !doc" class="space-y-3">
      <UiSkeleton class="h-6 w-1/2" />
      <UiSkeleton class="h-24 w-full" />
    </div>

    <div v-else class="space-y-5">
      <div class="flex flex-wrap items-center gap-2">
        <UiBadge
          :label="DOCUMENT_CATEGORY_LABELS[doc.category]"
          :icon="DOCUMENT_CATEGORY_ICONS[doc.category]"
          variant="soft"
          color="primary"
        />
        <UiBadge
          v-if="manage"
          :label="DOCUMENT_STATUS_LABELS[doc.status]"
          :color="STATUS_COLORS[doc.status]"
          variant="soft"
        />
        <UiBadge
          v-if="doc.visibility"
          :label="DOCUMENT_VISIBILITY_LABELS[doc.visibility]"
          :icon="DOCUMENT_VISIBILITY_ICONS[doc.visibility]"
          variant="outline"
        />
        <UiBadge
          v-if="expiry !== null && expiry <= 30"
          :label="expiryLabel(expiry)!"
          :color="expiry < 0 ? 'danger' : 'warning'"
          icon="mdi-calendar-alert"
          variant="soft"
        />
      </div>

      <UiTabs v-if="tabs.length" v-model="tab" :tabs="tabs" size="sm" aria-label="Secciones" />

      <!-- Information -->
      <div v-show="tab === 'info'" class="space-y-5">
        <div
          v-if="doc.file"
          class="flex items-center gap-3 rounded-xl bg-neutral-50 p-3 ring-1 ring-neutral-200 dark:bg-white/5 dark:ring-white/10"
        >
          <i
            class="mdi text-3xl text-brand-600 dark:text-brand-300"
            :class="attachmentIcon(doc.file.mimeType)"
            aria-hidden="true"
          />
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium">{{ doc.file.fileName }}</p>
            <p class="text-xs text-neutral-500">
              {{ formatFileSize(doc.file.sizeBytes) }}
              <template v-if="doc.file.version > 1"> · versión {{ doc.file.version }}</template>
              · {{ formatDate(doc.file.uploadedAt) }}
            </p>
          </div>
          <UiButton
            size="sm"
            variant="outline"
            icon="mdi-eye-outline"
            :disabled="busy"
            @click="view(doc.file)"
            >Ver</UiButton
          >
          <UiButton
            size="sm"
            variant="ghost"
            icon="mdi-download"
            :disabled="busy"
            :title="'Descargar'"
            @click="view(doc.file, true)"
          />
        </div>

        <p
          v-if="doc.description"
          class="text-sm whitespace-pre-line text-neutral-700 dark:text-neutral-200"
        >
          {{ doc.description }}
        </p>

        <dl class="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <div v-if="doc.reference">
            <dt class="text-xs text-neutral-500">Referencia</dt>
            <dd class="font-medium">{{ doc.reference }}</dd>
          </div>
          <div v-if="doc.documentDate">
            <dt class="text-xs text-neutral-500">Fecha del documento</dt>
            <dd class="font-medium">{{ formatDate(doc.documentDate) }}</dd>
          </div>
          <div v-if="doc.expiresOn">
            <dt class="text-xs text-neutral-500">Vence</dt>
            <dd class="font-medium">{{ formatDate(doc.expiresOn) }}</dd>
          </div>
          <div v-if="doc.folder">
            <dt class="text-xs text-neutral-500">Carpeta</dt>
            <dd class="font-medium">{{ doc.folder.name }}</dd>
          </div>
          <div v-if="doc.vendor">
            <dt class="text-xs text-neutral-500">Proveedor</dt>
            <dd class="font-medium">{{ doc.vendor.name }}</dd>
          </div>
          <div v-if="doc.publishedAt">
            <dt class="text-xs text-neutral-500">Publicado</dt>
            <dd class="font-medium">{{ formatDateTime(doc.publishedAt) }}</dd>
          </div>
          <div v-if="manage">
            <dt class="text-xs text-neutral-500">Subido por</dt>
            <dd class="font-medium">
              {{ doc.uploadedBy ?? '—' }} · {{ formatDate(doc.createdAt) }}
            </dd>
          </div>
          <div v-if="doc.units?.length" class="sm:col-span-2">
            <dt class="text-xs text-neutral-500">Lo ven los propietarios de</dt>
            <dd class="mt-1 flex flex-wrap gap-1.5">
              <UiBadge
                v-for="unit in doc.units"
                :key="unit.id"
                :label="unitLabel(unit)"
                variant="outline"
                size="sm"
              />
            </dd>
          </div>
        </dl>

        <UiAlert v-if="manage && doc.status === 'draft'" color="warning" variant="soft">
          Es un borrador: solo la administración lo ve. Publícalo para que llegue a
          {{ doc.visibility ? DOCUMENT_VISIBILITY_LABELS[doc.visibility].toLowerCase() : '' }}.
        </UiAlert>
        <UiAlert v-if="manage && doc.status === 'archived'" color="neutral" variant="soft">
          Archivado: nadie más lo ve ni recibe avisos de vencimiento. Restáuralo si vuelve a estar
          vigente.
        </UiAlert>

        <div
          v-if="publishing"
          class="space-y-3 rounded-xl bg-mint-50 p-4 ring-1 ring-mint-500/30 dark:bg-mint-400/10"
        >
          <p class="text-sm font-medium">
            Publicar para {{ DOCUMENT_VISIBILITY_LABELS[doc.visibility!].toLowerCase() }}
          </p>
          <UiSwitch
            v-if="doc.visibility !== 'private'"
            v-model="notify"
            label="Avisar a quienes lo pueden ver"
          />
          <div class="flex justify-end gap-2">
            <UiButton variant="ghost" size="sm" :disabled="busy" @click="publishing = false"
              >Cancelar</UiButton
            >
            <UiButton color="primary" size="sm" :loading="busy" @click="doPublish"
              >Publicar</UiButton
            >
          </div>
        </div>
      </div>

      <!-- Versions -->
      <div v-if="manage" v-show="tab === 'versions'" class="space-y-3">
        <p class="text-sm text-neutral-600 dark:text-neutral-300">
          La última versión es la vigente: es la que ven los demás. Las anteriores quedan como
          historial y solo las ve la administración.
        </p>
        <ul
          class="divide-y divide-neutral-100 rounded-xl ring-1 ring-neutral-200 dark:divide-white/5 dark:ring-white/10"
        >
          <li
            v-for="(version, index) in doc.versions"
            :key="version.id"
            class="flex items-center gap-3 p-3"
          >
            <span
              class="grid size-9 shrink-0 place-items-center rounded-lg text-xs font-bold"
              :class="
                index === 0
                  ? 'bg-mint-100 text-mint-800 dark:bg-mint-400/20 dark:text-mint-200'
                  : 'bg-neutral-100 text-neutral-500 dark:bg-white/10'
              "
              >v{{ version.version }}</span
            >
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium">
                {{ version.fileName }}
                <span
                  v-if="index === 0"
                  class="ml-1 text-xs font-normal text-mint-700 dark:text-mint-300"
                  >vigente</span
                >
              </p>
              <p class="text-xs text-neutral-500">
                {{ formatFileSize(version.sizeBytes) }} · {{ formatDateTime(version.uploadedAt) }}
                <template v-if="version.uploadedBy"> · {{ version.uploadedBy }}</template>
              </p>
            </div>
            <UiButton
              size="sm"
              variant="ghost"
              icon="mdi-eye-outline"
              title="Ver"
              :disabled="busy"
              @click="view(version)"
            />
            <UiButton
              v-if="(doc.versions?.length ?? 0) > 1"
              size="sm"
              variant="ghost"
              color="danger"
              icon="mdi-delete-outline"
              title="Retirar versión"
              :disabled="busy"
              @click="removingVersion = version"
            />
          </li>
        </ul>
        <div v-if="doc.status !== 'archived'">
          <input
            ref="versionInput"
            type="file"
            class="sr-only"
            :accept="DOCUMENT_ACCEPT"
            @change="uploadVersion"
          />
          <UiButton
            variant="outline"
            icon="mdi-upload"
            :loading="busy"
            @click="versionInput?.click()"
            >Subir nueva versión</UiButton
          >
          <p class="mt-1 text-xs text-neutral-500">
            Un acta corregida, el contrato con su otrosí, la póliza renovada…
          </p>
        </div>
      </div>

      <!-- Access log -->
      <div v-if="manage" v-show="tab === 'access'" class="space-y-3">
        <p class="text-sm text-neutral-600 dark:text-neutral-300">
          Cada vez que alguien abre o descarga el documento queda registrado. Aquí ves las últimas
          50 consultas.
        </p>
        <p v-if="!doc.access?.length" class="py-6 text-center text-sm text-neutral-500">
          Nadie lo ha consultado todavía
        </p>
        <ul v-else class="divide-y divide-neutral-100 text-sm dark:divide-white/5">
          <li v-for="entry in doc.access" :key="entry.id" class="flex items-center gap-3 py-2">
            <i
              class="mdi text-lg text-neutral-400"
              :class="entry.action === 'download' ? 'mdi-download' : 'mdi-eye-outline'"
              aria-hidden="true"
            />
            <span class="min-w-0 flex-1">
              <span class="font-medium">{{ entry.user.fullName }}</span>
              <span class="text-neutral-500">
                {{ entry.action === 'download' ? 'descargó' : 'abrió' }}
                {{ entry.version ? `la versión ${entry.version}` : 'una versión retirada' }}</span
              >
            </span>
            <span class="text-xs whitespace-nowrap text-neutral-500">{{
              formatDateTime(entry.at)
            }}</span>
          </li>
        </ul>
      </div>
    </div>

    <template v-if="manage && doc" #footer>
      <div class="flex flex-wrap justify-between gap-2">
        <div class="flex gap-2">
          <UiButton
            variant="ghost"
            color="danger"
            icon="mdi-delete-outline"
            :disabled="busy"
            @click="confirm = 'delete'"
            >Eliminar</UiButton
          >
          <UiButton
            v-if="doc.status !== 'archived'"
            variant="ghost"
            icon="mdi-archive-outline"
            :disabled="busy"
            @click="confirm = 'archive'"
            >Archivar</UiButton
          >
        </div>
        <div class="flex gap-2">
          <UiButton
            v-if="doc.status === 'archived'"
            variant="outline"
            icon="mdi-archive-arrow-up-outline"
            :loading="busy"
            @click="restore"
            >Restaurar</UiButton
          >
          <UiButton
            v-if="doc.status === 'published'"
            variant="outline"
            :disabled="busy"
            @click="confirm = 'unpublish'"
            >Retirar publicación</UiButton
          >
          <UiButton
            variant="outline"
            icon="mdi-pencil-outline"
            :disabled="busy"
            @click="emit('edit', doc)"
            >Editar</UiButton
          >
          <UiButton
            v-if="doc.status === 'draft'"
            color="primary"
            icon="mdi-send-outline"
            :disabled="busy || publishing"
            @click="((publishing = true), (tab = 'info'))"
            >Publicar</UiButton
          >
        </div>
      </div>
    </template>
  </UiModal>

  <ConfirmDialog
    :model-value="!!confirm"
    :title="
      confirm === 'delete'
        ? 'Eliminar documento'
        : confirm === 'archive'
          ? 'Archivar documento'
          : 'Retirar publicación'
    "
    :message="
      confirm === 'delete'
        ? 'Desaparece para todos. El registro de quién lo consultó se conserva para la auditoría.'
        : confirm === 'archive'
          ? 'Deja de verse en el portal y en el backoffice, salvo para la administración. Lo puedes restaurar.'
          : 'Vuelve a ser un borrador: deja de verse hasta que lo publiques de nuevo.'
    "
    :confirm-label="
      confirm === 'delete' ? 'Eliminar' : confirm === 'archive' ? 'Archivar' : 'Retirar'
    "
    :loading="busy"
    @update:model-value="(value: boolean) => !value && (confirm = null)"
    @confirm="doConfirm"
  />
  <ConfirmDialog
    :model-value="!!removingVersion"
    title="Retirar versión"
    :message="`Se retira «${removingVersion?.fileName}». Si es la vigente, la anterior pasa a serlo.`"
    confirm-label="Retirar"
    :loading="busy"
    @update:model-value="(value: boolean) => !value && (removingVersion = null)"
    @confirm="removeVersion"
  />
</template>
