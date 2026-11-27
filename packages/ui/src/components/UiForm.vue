<script setup lang="ts">
export interface UiFormProps {
  novalidate?: boolean
  loading?: boolean
  disabled?: boolean
  gap?: 'sm' | 'md' | 'lg'
}

withDefaults(defineProps<UiFormProps>(), { gap: 'md' })
const emit = defineEmits<{ submit: [event: SubmitEvent] }>()
const gaps = { sm: 'gap-3', md: 'gap-4', lg: 'gap-6' }
</script>

<template>
  <form
    :novalidate="novalidate"
    :aria-busy="loading || undefined"
    @submit.prevent="emit('submit', $event as SubmitEvent)"
  >
    <slot name="header" />
    <fieldset :disabled="disabled || loading" class="flex min-w-0 flex-col" :class="gaps[gap]">
      <slot />
      <div v-if="$slots.footer" class="mt-2 flex flex-wrap items-center justify-end gap-2">
        <slot name="footer" />
      </div>
    </fieldset>
  </form>
</template>
