<script setup lang="ts">
import { ref } from 'vue'
import { ATTACHMENT_ACCEPT, ATTACHMENT_MAX_MB } from '@aptoph/shared'
import { fileIcon, fileProblem, formatFileSize } from '@/lib/attachments'

/**
 * Files picked in a form before its record exists. The form uploads them with
 * `uploadAttachments` after saving.
 */
const files = defineModel<File[]>({ required: true })
withDefaults(defineProps<{ label?: string; disabled?: boolean }>(), {
  label: 'Soportes',
  disabled: false,
})

const input = ref<HTMLInputElement | null>(null)
const problems = ref<string[]>([])
const dragging = ref(false)

function add(list: FileList | null | undefined) {
  problems.value = []
  for (const file of Array.from(list ?? [])) {
    const problem = fileProblem(file)
    if (problem) problems.value.push(problem)
    else if (!files.value.some((f) => f.name === file.name && f.size === file.size))
      files.value = [...files.value, file]
  }
  if (input.value) input.value.value = ''
}

function onDrop(event: DragEvent) {
  dragging.value = false
  add(event.dataTransfer?.files)
}

function remove(index: number) {
  files.value = files.value.filter((_, i) => i !== index)
}
</script>

<template>
  <fieldset class="flex flex-col gap-2" :disabled="disabled">
    <legend class="mb-1 text-sm font-semibold">{{ label }}</legend>
    <ul v-if="files.length" class="flex flex-col gap-1.5">
      <li
        v-for="(file, i) in files"
        :key="`${file.name}-${file.size}`"
        class="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10"
      >
        <i class="mdi text-lg text-neutral-500" :class="fileIcon(file.name)" aria-hidden="true" />
        <span class="min-w-0 flex-1 truncate">{{ file.name }}</span>
        <span class="text-xs text-neutral-500 tabular-nums">{{ formatFileSize(file.size) }}</span>
        <button
          type="button"
          class="text-neutral-400 hover:text-coral-600"
          :aria-label="`Quitar ${file.name}`"
          @click="remove(i)"
        >
          <i class="mdi mdi-close" aria-hidden="true" />
        </button>
      </li>
    </ul>
    <button
      type="button"
      class="flex flex-col items-center gap-1 rounded-xl border border-dashed px-4 py-4 text-sm transition-colors"
      :class="
        dragging
          ? 'border-mint-500 bg-mint-50 dark:bg-mint-500/10'
          : 'border-neutral-300 hover:border-mint-500 dark:border-white/20'
      "
      @click="input?.click()"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="onDrop"
    >
      <span class="font-semibold text-mint-700 dark:text-mint-300">
        <i class="mdi mdi-paperclip" aria-hidden="true" /> Adjuntar archivos
      </span>
      <span class="text-xs text-neutral-500"
        >o arrástralos aquí · PDF, imágenes, Excel o Word hasta {{ ATTACHMENT_MAX_MB }} MB</span
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
    <p v-for="problem in problems" :key="problem" class="text-sm text-coral-700">{{ problem }}</p>
  </fieldset>
</template>
