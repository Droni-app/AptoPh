<script setup lang="ts">
import { computed, inject, nextTick, onMounted, ref, watch } from 'vue'
import { cx, fieldClasses } from '../styles'
import { FIELD_KEY } from '../field'

export interface UiTextareaProps {
  modelValue?: string | null
  size?: 'sm' | 'md' | 'lg'
  block?: boolean
  /** Grows with the content */
  autoheight?: boolean
  resize?: 'none' | 'both' | 'horizontal' | 'vertical'
}

defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<UiTextareaProps>(), { size: 'md', resize: 'vertical' })
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const field = inject(FIELD_KEY, null)
const fieldId = field?.takeId()
const el = ref<HTMLTextAreaElement | null>(null)

const resizes = {
  none: 'resize-none',
  both: 'resize',
  horizontal: 'resize-x',
  vertical: 'resize-y',
}
const classes = computed(() =>
  cx(
    fieldClasses,
    'px-3 py-2 leading-relaxed',
    props.autoheight ? 'resize-none overflow-hidden' : resizes[props.resize],
    props.block ? 'w-full' : 'min-w-0',
  ),
)

function fit() {
  if (!props.autoheight || !el.value) return
  el.value.style.height = 'auto'
  el.value.style.height = `${el.value.scrollHeight + 2}px`
}
watch(
  () => props.modelValue,
  () => nextTick(fit),
)
onMounted(fit)
</script>

<template>
  <textarea
    ref="el"
    v-bind="$attrs"
    :id="($attrs.id as string | undefined) ?? fieldId"
    :class="classes"
    :value="modelValue ?? ''"
    :aria-invalid="field?.invalid.value || undefined"
    :aria-describedby="field?.describedBy.value"
    @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
  />
</template>
