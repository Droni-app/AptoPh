<script setup lang="ts">
import { ref, watch } from 'vue'
import { DuiButton, DuiLabel, DuiModal, DuiTextarea } from '@dronico/droni-kit'

const props = withDefaults(
  defineProps<{
    title: string
    message?: string
    confirmLabel?: string
    color?: 'danger' | 'primary'
    loading?: boolean
    placeholder?: string
  }>(),
  { message: undefined, confirmLabel: 'Confirmar', color: 'danger', placeholder: undefined },
)
const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ confirm: [reason: string] }>()
const reason = ref('')

watch(open, (isOpen) => {
  if (isOpen) reason.value = ''
})

function submit() {
  if (reason.value.trim().length >= 3) emit('confirm', reason.value.trim())
}
void props
</script>

<template>
  <DuiModal v-model="open" :title="title" size="sm" :persistent="loading">
    <form class="flex flex-col gap-3" @submit.prevent="submit">
      <p v-if="message" class="text-sm text-neutral-600 dark:text-neutral-300">{{ message }}</p>
      <slot />
      <DuiLabel title="Motivo" required help-text="Queda en el historial y en el comprobante">
        <DuiTextarea
          v-model="reason"
          rows="3"
          maxlength="255"
          required
          :placeholder="placeholder"
          autofocus
        />
      </DuiLabel>
    </form>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <DuiButton variant="ghost" :disabled="loading" @click="open = false">Cancelar</DuiButton>
        <DuiButton
          :color="color"
          :loading="loading"
          :disabled="reason.trim().length < 3"
          @click="submit"
        >
          {{ confirmLabel }}
        </DuiButton>
      </div>
    </template>
  </DuiModal>
</template>
