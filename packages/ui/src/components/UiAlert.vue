<script setup lang="ts">
import { computed } from 'vue'
import { cx, statusIcons, toneClasses, type UiColor } from '../styles'

export interface UiAlertProps {
  variant?: 'solid' | 'soft' | 'outline' | 'ghost'
  color?: UiColor
  title?: string
  /** MDI icon; `false` hides it. By default one that matches the color */
  icon?: string | false
}

const props = withDefaults(defineProps<UiAlertProps>(), { variant: 'soft', color: 'neutral' })
const tone = computed(() => (props.variant === 'ghost' ? 'outline' : props.variant))
const iconClass = computed(() => (props.icon === false ? null : (props.icon ?? statusIcons[props.color])))
</script>

<template>
  <div
    :class="
      cx(
        'flex items-start gap-3 rounded-lg px-3.5 py-3 text-sm leading-relaxed',
        toneClasses[tone][color],
        variant === 'ghost' && 'ring-0',
      )
    "
  >
    <i v-if="iconClass" :class="['mdi mt-px shrink-0 text-lg leading-5', iconClass]" aria-hidden="true" />
    <div class="min-w-0 flex-1">
      <p v-if="title" class="mb-0.5 font-semibold">{{ title }}</p>
      <slot />
    </div>
    <slot name="actions" />
  </div>
</template>
