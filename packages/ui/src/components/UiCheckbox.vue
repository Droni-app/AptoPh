<script setup lang="ts">
import { computed, useId } from 'vue'

export interface UiCheckboxProps {
  modelValue?: boolean | unknown[]
  value?: unknown
  label?: string
  /** Second line under the label */
  description?: string
  labelPosition?: 'left' | 'right'
  block?: boolean
  disabled?: boolean
}

defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<UiCheckboxProps>(), { labelPosition: 'right' })
const emit = defineEmits<{ 'update:modelValue': [value: boolean | unknown[]] }>()
const id = `check-${useId()}`

const checked = computed(() =>
  Array.isArray(props.modelValue) ? props.modelValue.includes(props.value) : !!props.modelValue,
)
function toggle(event: Event) {
  const on = (event.target as HTMLInputElement).checked
  if (Array.isArray(props.modelValue)) {
    const rest = props.modelValue.filter((item) => item !== props.value)
    emit('update:modelValue', on ? [...rest, props.value] : rest)
  } else emit('update:modelValue', on)
}
</script>

<template>
  <label
    :for="id"
    class="group inline-flex items-start gap-2.5 text-sm text-neutral-800 dark:text-neutral-200"
    :class="[
      block && 'w-full',
      labelPosition === 'left' && 'flex-row-reverse justify-between',
      disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
      $attrs.class as string,
    ]"
  >
    <span class="relative mt-0.5 grid size-4 shrink-0 place-items-center">
      <input
        :id="id"
        v-bind="{ ...$attrs, class: undefined }"
        type="checkbox"
        class="peer size-4 cursor-[inherit] appearance-none rounded border border-neutral-300 bg-white transition-colors checked:border-brand-700 checked:bg-brand-700 hover:border-neutral-400 dark:border-white/20 dark:bg-neutral-900 dark:checked:border-brand-300 dark:checked:bg-brand-300"
        :checked="checked"
        :disabled="disabled"
        @change="toggle"
      />
      <i
        class="mdi mdi-check pointer-events-none absolute text-[13px] leading-none text-white opacity-0 peer-checked:opacity-100 dark:text-neutral-950"
        aria-hidden="true"
      />
    </span>
    <span v-if="label || description || $slots.default" class="min-w-0">
      <slot>{{ label }}</slot>
      <span v-if="description" class="block text-xs text-neutral-500 dark:text-neutral-400">{{
        description
      }}</span>
    </span>
  </label>
</template>
