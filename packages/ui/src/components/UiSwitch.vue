<script setup lang="ts">
import { useId } from 'vue'

export interface UiSwitchProps {
  modelValue?: boolean
  label?: string
  description?: string
  labelPosition?: 'left' | 'right'
  block?: boolean
  disabled?: boolean
}

withDefaults(defineProps<UiSwitchProps>(), { labelPosition: 'right' })
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
const id = `switch-${useId()}`
</script>

<template>
  <label
    :for="id"
    class="inline-flex items-start gap-3 text-sm"
    :class="[
      block && 'w-full',
      labelPosition === 'left' && 'flex-row-reverse justify-between',
      disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
    ]"
  >
    <span class="relative mt-0.5 inline-flex shrink-0">
      <input
        :id="id"
        type="checkbox"
        role="switch"
        class="peer h-5 w-9 cursor-[inherit] appearance-none rounded-full bg-neutral-300 transition-colors checked:bg-mint-600 dark:bg-white/15 dark:checked:bg-mint-400"
        :checked="modelValue"
        :disabled="disabled"
        @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
      />
      <span
        class="pointer-events-none absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4"
        aria-hidden="true"
      />
    </span>
    <span v-if="label || description" class="min-w-0">
      <span class="block font-medium text-neutral-800 dark:text-neutral-200">{{ label }}</span>
      <span v-if="description" class="block text-xs text-neutral-500 dark:text-neutral-400">{{
        description
      }}</span>
    </span>
  </label>
</template>
