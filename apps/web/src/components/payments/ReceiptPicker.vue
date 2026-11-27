<script setup lang="ts">
import { ref } from 'vue'
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_MAX_MB,
  RESIDENT_ATTACHMENT_MAX,
  attachmentIcon,
  attachmentProblem,
  formatFileSize,
} from '@aptoph/shared'

/** Receipts picked while reporting a payment, uploaded after the report is saved */
const files = defineModel<File[]>({ required: true })
const props = defineProps<{ disabled?: boolean; max?: number }>()
const limit = () => props.max ?? RESIDENT_ATTACHMENT_MAX

const input = ref<HTMLInputElement | null>(null)
const problems = ref<string[]>([])

function add(list: FileList | null) {
  problems.value = []
  for (const file of Array.from(list ?? [])) {
    const problem = attachmentProblem(file)
    if (problem) problems.value.push(problem)
    else if (files.value.length >= limit())
      problems.value.push(`Puedes adjuntar hasta ${limit()} archivos`)
    else if (!files.value.some((f) => f.name === file.name && f.size === file.size))
      files.value = [...files.value, file]
  }
  if (input.value) input.value.value = ''
}
</script>

<template>
  <fieldset class="flex flex-col gap-2" :disabled="disabled">
    <legend class="mb-1 text-sm font-semibold">Comprobante</legend>
    <ul v-if="files.length" class="flex flex-col gap-1.5">
      <li
        v-for="(file, i) in files"
        :key="`${file.name}-${file.size}`"
        class="flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-white/10"
      >
        <i
          class="mdi text-lg text-neutral-500"
          :class="attachmentIcon(file.name)"
          aria-hidden="true"
        />
        <span class="min-w-0 flex-1 truncate">{{ file.name }}</span>
        <span class="text-xs text-neutral-500 tabular-nums">{{ formatFileSize(file.size) }}</span>
        <button
          type="button"
          class="text-neutral-400 hover:text-red-600"
          :aria-label="`Quitar ${file.name}`"
          @click="files = files.filter((_, index) => index !== i)"
        >
          <i class="mdi mdi-close" aria-hidden="true" />
        </button>
      </li>
    </ul>
    <button
      v-if="files.length < limit()"
      type="button"
      class="flex flex-col items-center gap-1 rounded-xl border border-dashed border-neutral-300 px-4 py-4 text-sm hover:border-mint-500 dark:border-white/20"
      @click="input?.click()"
    >
      <span class="font-semibold text-mint-700 dark:text-mint-300">
        <i class="mdi mdi-paperclip" aria-hidden="true" /> Adjuntar comprobante
      </span>
      <span class="text-xs text-neutral-500 dark:text-neutral-300"
        >Foto o PDF de la transferencia o consignación · hasta {{ ATTACHMENT_MAX_MB }} MB</span
      >
    </button>
    <input
      ref="input"
      type="file"
      class="hidden"
      multiple
      :accept="ATTACHMENT_ACCEPT"
      @change="add(($event.target as HTMLInputElement).files)"
    />
    <p v-for="problem in problems" :key="problem" class="text-sm text-red-700 dark:text-red-300">
      {{ problem }}
    </p>
  </fieldset>
</template>
