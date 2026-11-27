<script setup lang="ts">
import { useId } from 'vue'

export interface UiRadioOption {
  label: string
  value: string
  description?: string
  disabled?: boolean
}
export interface UiRadioProps {
  modelValue?: string
  options: UiRadioOption[]
  name?: string
  groupLabel?: string
  orientation?: 'vertical' | 'horizontal'
  disabled?: boolean
}

const props = withDefaults(defineProps<UiRadioProps>(), { orientation: 'vertical' })
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const groupName = props.name ?? `radio-${useId()}`
</script>

<template>
  <fieldset :disabled="disabled">
    <legend
      v-if="groupLabel"
      class="mb-2 text-[13px] font-medium text-neutral-800 dark:text-neutral-200"
    >
      {{ groupLabel }}
    </legend>
    <div
      class="flex gap-x-5 gap-y-2.5"
      :class="orientation === 'horizontal' ? 'flex-row flex-wrap' : 'flex-col'"
    >
      <label
        v-for="option in options"
        :key="option.value"
        class="inline-flex items-start gap-2.5 text-sm text-neutral-800 dark:text-neutral-200"
        :class="option.disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'"
      >
        <input
          type="radio"
          :name="groupName"
          :value="option.value"
          :checked="modelValue === option.value"
          :disabled="option.disabled"
          class="mt-0.5 size-4 shrink-0 cursor-[inherit] appearance-none rounded-full border border-neutral-300 bg-white transition-all checked:border-[5px] checked:border-brand-700 dark:border-white/20 dark:bg-neutral-900 dark:checked:border-brand-300"
          @change="emit('update:modelValue', option.value)"
        />
        <span>
          {{ option.label }}
          <span
            v-if="option.description"
            class="block text-xs text-neutral-500 dark:text-neutral-400"
            >{{ option.description }}</span
          >
        </span>
      </label>
    </div>
  </fieldset>
</template>
