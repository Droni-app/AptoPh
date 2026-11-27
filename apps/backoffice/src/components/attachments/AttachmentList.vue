<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { UiButton, UiModal, UiSkeleton, useToast } from '@aptoph/ui'
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_MAX_PER_OWNER,
  type Attachment,
  type AttachmentOwnerType,
} from '@aptoph/shared'
import {
  attachmentsApiFor,
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
    /** Attachments already loaded with the record (skips the request) */
    initial?: Attachment[]
    title?: string
  }>(),
  { editable: false, title: 'Soportes', initial: undefined },
)
const emit = defineEmits<{ change: [attachments: Attachment[]] }>()
const toast = useToast()
const endpoints = computed(() => attachmentsApiFor(props.ownerType))

const items = ref<Attachment[] | null>(null)
const error = ref<string | null>(null)
const uploading = ref(0)
const busyId = ref<string | null>(null)
const removing = ref<Attachment | null>(null)
const input = ref<HTMLInputElement | null>(null)

async function load() {
  error.value = null
  try {
    items.value = (await endpoints.value.list(props.ownerId)).data
  } catch (e) {
    items.value = []
    error.value = errorMessage(e)
  }
}
watch(
  () => [props.ownerType, props.ownerId],
  () => {
    if (props.initial) {
      items.value = [...props.initial]
      return
    }
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
      const { data } = await endpoints.value.upload(props.ownerId, file)
      items.value = [...(items.value ?? []), data]
      emit('change', items.value)
    } catch (e) {
      toast.error(`${file.name}: ${errorMessage(e)}`)
    } finally {
      uploading.value--
    }
  }
}

async function run(
  id: string,
  action: (ownerType: AttachmentOwnerType, id: string) => Promise<void>,
) {
  busyId.value = id
  try {
    await action(props.ownerType, id)
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
    await endpoints.value.remove(attachment.id)
    items.value = (items.value ?? []).filter((item) => item.id !== attachment.id)
    emit('change', items.value)
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
      <UiButton
        v-if="editable && (items?.length ?? 0) < ATTACHMENT_MAX_PER_OWNER"
        size="sm"
        variant="ghost"
        :loading="uploading > 0"
        @click="input?.click()"
        ><i class="mdi mdi-paperclip" aria-hidden="true" /> Adjuntar</UiButton
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
    <UiSkeleton v-if="items === null" class="h-12 rounded-lg" />
    <p v-else-if="error" class="text-coral-700">{{ error }}</p>
    <p v-else-if="!items.length" class="text-neutral-500">
      {{ title === 'Soportes' ? 'Sin soportes adjuntos.' : 'Sin archivos adjuntos.' }}
    </p>
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
  <UiModal
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
        <UiButton variant="ghost" @click="removing = null">Cancelar</UiButton>
        <UiButton color="danger" :loading="busyId === removing?.id" @click="confirmRemove"
          >Quitar</UiButton
        >
      </div>
    </template>
  </UiModal>
</template>
