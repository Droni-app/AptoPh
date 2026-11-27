<script setup lang="ts">
import { ref, watch } from 'vue'
import { useToast } from '@aptoph/ui'
import {
  ATTACHMENT_ACCEPT,
  RESIDENT_ATTACHMENT_MAX,
  attachmentIcon,
  attachmentProblem,
  type Attachment,
  type ResidentPayment,
} from '@aptoph/shared'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { residentApi } from '@/api/resident'
import { openReceipt } from '@/lib/attachments'
import { errorMessage } from '@/lib/errors'

/** Receipts of a payment in "Tus pagos": open them, and add or remove while in review */
const props = defineProps<{ payment: ResidentPayment }>()
const toast = useToast()

const items = ref<Attachment[]>([])
watch(
  () => props.payment.attachments,
  (attachments) => (items.value = [...attachments]),
  { immediate: true },
)
const input = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const removing = ref<Attachment | null>(null)
const busy = ref(false)

async function open(item: Attachment) {
  try {
    await openReceipt(item.id)
  } catch (e) {
    toast.error(errorMessage(e))
  }
}

async function add(list: FileList | null) {
  const files = Array.from(list ?? [])
  if (input.value) input.value.value = ''
  uploading.value = true
  try {
    for (const file of files) {
      const problem = attachmentProblem(file)
      if (problem) {
        toast.error(problem)
        continue
      }
      try {
        const { data } = await residentApi.finance.attach(props.payment.id, file)
        items.value = [...items.value, data]
      } catch (e) {
        toast.error(`${file.name}: ${errorMessage(e)}`)
      }
    }
  } finally {
    uploading.value = false
  }
}

async function remove() {
  if (!removing.value) return
  busy.value = true
  try {
    await residentApi.finance.detach(removing.value.id)
    const id = removing.value.id
    items.value = items.value.filter((item) => item.id !== id)
    removing.value = null
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div v-if="items.length || payment.canAttach" class="mt-2 flex flex-wrap items-center gap-2">
    <span
      v-for="item in items"
      :key="item.id"
      class="inline-flex max-w-full items-center gap-1 rounded-full bg-neutral-100 py-1 pr-2 pl-2.5 text-xs dark:bg-white/10"
    >
      <button
        type="button"
        class="inline-flex min-w-0 items-center gap-1 hover:underline"
        :title="`Ver ${item.fileName}`"
        @click="open(item)"
      >
        <i class="mdi" :class="attachmentIcon(item.fileName)" aria-hidden="true" />
        <span class="max-w-40 truncate">{{ item.fileName }}</span>
      </button>
      <button
        v-if="payment.canAttach"
        type="button"
        class="text-neutral-400 hover:text-red-600"
        :aria-label="`Quitar ${item.fileName}`"
        @click="removing = item"
      >
        <i class="mdi mdi-close" aria-hidden="true" />
      </button>
    </span>
    <button
      v-if="payment.canAttach && items.length < RESIDENT_ATTACHMENT_MAX"
      type="button"
      class="text-xs font-semibold text-mint-700 disabled:opacity-60 dark:text-mint-300"
      :disabled="uploading"
      @click="input?.click()"
    >
      <i
        class="mdi"
        :class="uploading ? 'mdi-loading mdi-spin' : 'mdi-paperclip'"
        aria-hidden="true"
      />
      {{ items.length ? 'Agregar' : 'Adjuntar comprobante' }}
    </button>
    <input
      ref="input"
      type="file"
      class="hidden"
      multiple
      :accept="ATTACHMENT_ACCEPT"
      @change="add(($event.target as HTMLInputElement).files)"
    />
  </div>
  <ConfirmDialog
    :model-value="removing !== null"
    title="Quitar comprobante"
    :message="`¿Quitar ${removing?.fileName ?? ''} de este pago?`"
    confirm-label="Quitar"
    :loading="busy"
    @update:model-value="(value: boolean) => !value && (removing = null)"
    @confirm="remove"
  />
</template>
