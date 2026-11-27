<script setup lang="ts">
import { computed, inject } from 'vue'
import { cx, fieldClasses, fieldSizeClasses, normalizeSize } from '../styles'
import { FIELD_KEY } from '../field'

export interface UiSelectProps {
  modelValue?: string | number | boolean | null
  options?: Array<Record<string, any>>
  size?: 'sm' | 'md' | 'lg'
  block?: boolean
  itemLabel?: string
  itemValue?: string
  /** First, empty option */
  placeholder?: string
}

defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<UiSelectProps>(), {
  options: () => [],
  size: 'md',
  itemLabel: 'label',
  itemValue: 'value',
})
const emit = defineEmits<{ 'update:modelValue': [value: any] }>()
const field = inject(FIELD_KEY, null)
const fieldId = field?.takeId()

/** Native <select> keeps the option's real value (number, boolean, null…) */
const model = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})
const classes = computed(() =>
  cx(
    fieldClasses,
    fieldSizeClasses[normalizeSize(props.size)],
    'cursor-pointer appearance-none truncate pr-9',
  ),
)
</script>

<template>
  <span
    class="relative inline-flex"
    :class="[block ? 'w-full' : 'min-w-0', $attrs.class as string]"
  >
    <select
      v-bind="{ ...$attrs, class: undefined }"
      :id="($attrs.id as string | undefined) ?? fieldId"
      v-model="model"
      :class="[classes, 'w-full']"
      :aria-invalid="field?.invalid.value || undefined"
      :aria-describedby="field?.describedBy.value"
    >
      <option v-if="placeholder" :value="null" disabled>{{ placeholder }}</option>
      <option
        v-for="(option, index) in options"
        :key="index"
        :value="option[itemValue]"
        :disabled="option.disabled"
      >
        {{ option[itemLabel] }}
      </option>
    </select>
    <i
      class="mdi mdi-chevron-down pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-lg text-neutral-400"
      aria-hidden="true"
    />
  </span>
</template>
