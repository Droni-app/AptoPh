<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { UiButton } from '@aptoph/ui'
import {
  ANNOUNCEMENT_IMAGE_ACCEPT,
  ANNOUNCEMENT_IMAGE_MAX_MB,
  announcementImageProblem,
} from '@aptoph/shared'

/**
 * The image (poster) of a comunicado. It does not upload: the form uploads
 * `file` after saving, and removes the current one when `remove` is set.
 */
export interface ImageChange {
  file: File | null
  remove: boolean
}

const props = defineProps<{
  /** Signed link of the image it has now */
  currentUrl?: string | null
  disabled?: boolean
  error?: string | null
}>()
const change = defineModel<ImageChange>({ required: true })

const input = ref<HTMLInputElement | null>(null)
const problem = ref<string | null>(null)
const dragging = ref(false)
const objectUrl = ref<string | null>(null)

watch(
  () => change.value.file,
  (file) => {
    if (objectUrl.value) URL.revokeObjectURL(objectUrl.value)
    objectUrl.value = file ? URL.createObjectURL(file) : null
  },
  { immediate: true },
)
onBeforeUnmount(() => objectUrl.value && URL.revokeObjectURL(objectUrl.value))

const shown = computed(
  () => objectUrl.value ?? (change.value.remove ? null : (props.currentUrl ?? null)),
)
const message = computed(() => problem.value ?? props.error ?? null)

function take(file: File | undefined) {
  if (!file) return
  problem.value = announcementImageProblem(file)
  if (problem.value) return
  change.value = { file, remove: false }
}
function pick(event: Event) {
  const target = event.target as HTMLInputElement
  take(target.files?.[0])
  target.value = ''
}
function drop(event: DragEvent) {
  dragging.value = false
  if (!props.disabled) take(event.dataTransfer?.files[0])
}
function clear() {
  problem.value = null
  change.value = { file: null, remove: !!props.currentUrl }
}
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <div class="flex items-baseline justify-between gap-3">
      <span class="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Imagen</span>
      <span class="text-xs text-neutral-500">Opcional. Se muestra arriba del mensaje.</span>
    </div>

    <input
      ref="input"
      type="file"
      class="sr-only"
      :accept="ANNOUNCEMENT_IMAGE_ACCEPT"
      :disabled="disabled"
      aria-label="Elegir imagen del comunicado"
      @change="pick"
    />

    <figure
      v-if="shown"
      class="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 dark:border-white/10 dark:bg-white/5"
    >
      <img
        :src="shown"
        alt="Vista previa de la imagen"
        class="mx-auto max-h-80 w-auto object-contain"
      />
      <figcaption
        class="flex items-center justify-between gap-2 border-t border-neutral-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-neutral-900"
      >
        <span class="truncate text-xs text-neutral-500">
          {{ change.file ? change.file.name : 'Imagen actual' }}
        </span>
        <span class="flex shrink-0 gap-1">
          <UiButton size="sm" variant="ghost" :disabled="disabled" @click="input?.click()">
            <span class="mdi mdi-image-edit-outline" aria-hidden="true" /> Cambiar
          </UiButton>
          <UiButton size="sm" variant="ghost" color="danger" :disabled="disabled" @click="clear">
            <span class="mdi mdi-trash-can-outline" aria-hidden="true" /> Quitar
          </UiButton>
        </span>
      </figcaption>
    </figure>

    <button
      v-else
      type="button"
      :disabled="disabled"
      :class="[
        'flex flex-col items-center gap-1 rounded-lg border border-dashed px-4 py-6 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-60',
        dragging
          ? 'border-brand-500 bg-brand-50 dark:border-brand-300 dark:bg-brand-400/10'
          : 'border-neutral-300 hover:border-brand-400 hover:bg-neutral-50 dark:border-white/15 dark:hover:bg-white/5',
      ]"
      @click="input?.click()"
      @dragover.prevent="dragging = true"
      @dragleave="dragging = false"
      @drop.prevent="drop"
    >
      <span class="mdi mdi-image-plus-outline text-3xl text-neutral-400" aria-hidden="true" />
      <span class="text-sm font-medium text-neutral-700 dark:text-neutral-200">
        Agregar una imagen o afiche
      </span>
      <span class="text-xs text-neutral-500">
        Arrástrala aquí o haz clic. JPG, PNG, WEBP o GIF de hasta
        {{ ANNOUNCEMENT_IMAGE_MAX_MB }} MB.
      </span>
    </button>

    <p v-if="message" class="text-sm text-coral-700" role="alert">{{ message }}</p>
  </div>
</template>
