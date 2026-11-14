<script setup lang="ts">
import { DuiButton, DuiModal } from '@dronico/droni-kit'

defineProps<{ title: string; message: string; confirmLabel?: string; loading?: boolean }>()
const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ confirm: [] }>()
</script>

<template>
  <DuiModal v-model="open" :title="title" size="sm" :persistent="loading">
    <p class="text-sm text-navy-600 dark:text-navy-200">{{ message }}</p>
    <template #footer>
      <div class="flex justify-end gap-2">
        <DuiButton variant="ghost" :disabled="loading" @click="open = false">Cancelar</DuiButton>
        <DuiButton color="danger" :loading="loading" @click="emit('confirm')">
          {{ confirmLabel ?? 'Eliminar' }}
        </DuiButton>
      </div>
    </template>
  </DuiModal>
</template>
