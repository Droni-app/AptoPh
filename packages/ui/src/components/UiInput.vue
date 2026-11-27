<script setup lang="ts">
import { computed, inject } from 'vue'
import { cx, fieldClasses, fieldSizeClasses, normalizeSize } from '../styles'
import { FIELD_KEY } from '../field'

export interface UiInputProps {
  modelValue?: string | number | null
  size?: 'sm' | 'md' | 'lg'
  block?: boolean
}

defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<UiInputProps>(), { size: 'md' })
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const field = inject(FIELD_KEY, null)
const fieldId = field?.takeId()

const classes = computed(() =>
  cx(fieldClasses, fieldSizeClasses[normalizeSize(props.size)], props.block ? 'w-full' : 'min-w-0'),
)
</script>

<template>
  <input
    v-bind="$attrs"
    :id="($attrs.id as string | undefined) ?? fieldId"
    :class="classes"
    :value="modelValue ?? ''"
    :aria-invalid="field?.invalid.value || undefined"
    :aria-describedby="field?.describedBy.value"
    @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
  />
</template>
