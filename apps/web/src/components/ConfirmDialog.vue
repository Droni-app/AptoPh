<script setup lang="ts">
import { UiButton, UiModal } from '@aptoph/ui'

defineProps<{ title: string; message: string; confirmLabel?: string; loading?: boolean }>()
const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ confirm: [] }>()
</script>

<template>
  <UiModal v-model="open" :title="title" size="sm" :persistent="loading">
    <p class="text-sm text-neutral-600 dark:text-neutral-200">{{ message }}</p>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UiButton variant="ghost" :disabled="loading" @click="open = false">Cancelar</UiButton>
        <UiButton color="danger" :loading="loading" @click="emit('confirm')">
          {{ confirmLabel ?? 'Eliminar' }}
        </UiButton>
      </div>
    </template>
  </UiModal>
</template>
