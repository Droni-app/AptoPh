<script setup lang="ts">
import { ref, watch } from 'vue'
import { DuiButton, DuiModal, DuiSkeleton, useToast } from '@dronico/droni-kit'
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_MAX_PER_OWNER,
  type Attachment,
  type AttachmentOwnerType,
} from '@aptoph/shared'
import { financeApi } from '@/api/finance'
import {
  downloadAttachment,
  fileIcon,
  fileProblem,
  formatFileSize,
  openAttachment,
} from '@/lib/attachments'
import { errorMessage } from '@/lib/errors'
import { formatDateTime } from '@/lib/format'

/**
 * Attachments of a saved record: open, download, add and remove.
 */
const props = withDefaults(
  defineProps<{
    ownerType: AttachmentOwnerType
    ownerId: string
    /** Can add and remove files (finance write roles) */
    editable?: boolean
    title?: string
  }>(),
  { editable: false, title: 'Soportes' },
)
const toast = useToast()

const items = ref<Attachment[] | null>(null)
const error = ref<string | null>(null)
const uploading = ref(0)
const busyId = ref<string | null>(null)
const removing = ref<Attachment | null>(null)
const input = ref<HTMLInputElement | null>(null)

async function load() {
  error.value = null
  try {
    items.value = (await financeApi.attachments(props.ownerType, props.ownerId)).data
  } catch (e) {
    items.value = []
    error.value = errorMessage(e)
  }
}
watch(
  () => [props.ownerType, props.ownerId],
  () => {
    items.value = null
    load()
  },
  { immediate: true },
)

async function add(list: FileList | null) {
  const files = Array.from(list ?? [])
  if (input.value) input.value.value = ''
  for (const file of files) {
    const problem = fileProblem(file)
    if (problem) {
      toast.error(problem)
      continue
    }
    uploading.value++
    try {
      const { data } = await financeApi.uploadAttachment(props.ownerType, props.ownerId, file)
      items.value = [...(items.value ?? []), data]
    } catch (e) {
      toast.error(`${file.name}: ${errorMessage(e)}`)
    } finally {
      uploading.value--
    }
  }
}

async function run(id: string, action: (id: string) => Promise<void>) {
  busyId.value = id
  try {
    await action(id)
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    busyId.value = null
  }
}

async function confirmRemove() {
  const attachment = removing.value
  if (!attachment) return
  busyId.value = attachment.id
  try {
    await financeApi.removeAttachment(attachment.id)
    items.value = (items.value ?? []).filter((item) => item.id !== attachment.id)
    toast.success('Soporte quitado')
    removing.value = null
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    busyId.value = null
  }
}
</script>

<template>
  <section>
    <div class="mb-2 flex items-center justify-between gap-2">
      <h3 class="font-semibold">{{ title }}</h3>
      <DuiButton
        v-if="editable && (items?.length ?? 0) < ATTACHMENT_MAX_PER_OWNER"
        size="sm"
        variant="ghost"
        :loading="uploading > 0"
        @click="input?.click()"
        ><i class="mdi mdi-paperclip" aria-hidden="true" /> Adjuntar</DuiButton
      >
      <input
        ref="input"
        type="file"
        class="hidden"
        multiple
        :accept="ATTACHMENT_ACCEPT"
        @change="add(($event.target as HTMLInputElement).files)"
      />
    </div>
    <DuiSkeleton v-if="items === null" class="h-12 rounded-lg" />
    <p v-else-if="error" class="text-coral-700">{{ error }}</p>
    <p v-else-if="!items.length" class="text-neutral-500">Sin soportes adjuntos.</p>
    <ul v-else class="divide-y divide-neutral-100 dark:divide-white/10">
      <li v-for="item in items" :key="item.id" class="flex items-center gap-3 py-2">
        <i
          class="mdi text-xl text-neutral-500"
          :class="fileIcon(item.fileName)"
          aria-hidden="true"
        />
        <button
          type="button"
          class="min-w-0 flex-1 text-left"
          :disabled="busyId === item.id"
          @click="run(item.id, openAttachment)"
        >
          <span class="block truncate font-medium hover:underline">{{ item.fileName }}</span>
          <span class="block text-xs text-neutral-500">
            {{ formatFileSize(item.sizeBytes) }} · {{ formatDateTime(item.createdAt) }}
            <template v-if="item.uploadedBy"> · {{ item.uploadedBy }}</template>
          </span>
        </button>
        <button
          type="button"
          class="text-neutral-500 hover:text-mint-700"
          :aria-label="`Descargar ${item.fileName}`"
          :disabled="busyId === item.id"
          @click="run(item.id, downloadAttachment)"
        >
          <i class="mdi mdi-download" aria-hidden="true" />
        </button>
        <button
          v-if="editable"
          type="button"
          class="text-neutral-400 hover:text-coral-600"
          :aria-label="`Quitar ${item.fileName}`"
          :disabled="busyId === item.id"
          @click="removing = item"
        >
          <i class="mdi mdi-trash-can-outline" aria-hidden="true" />
        </button>
      </li>
    </ul>
  </section>
  <DuiModal
    :model-value="removing !== null"
    title="Quitar soporte"
    size="sm"
    @update:model-value="(value: boolean) => !value && (removing = null)"
  >
    <p class="text-sm">
      ¿Quitar <strong>{{ removing?.fileName }}</strong> de este registro? Queda guardado en el
      historial del conjunto.
    </p>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <DuiButton variant="ghost" @click="removing = null">Cancelar</DuiButton>
        <DuiButton color="danger" :loading="busyId === removing?.id" @click="confirmRemove"
          >Quitar</DuiButton
        >
      </div>
    </template>
  </DuiModal>
</template>
