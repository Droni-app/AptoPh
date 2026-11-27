<script setup lang="ts">
import { cx, dotClasses, toneClasses, type UiColor } from '../styles'

export interface UiBadgeProps {
  label?: string
  color?: UiColor
  variant?: 'solid' | 'soft' | 'outline'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  rounded?: 'full' | 'md' | 'none'
  dot?: boolean
  icon?: string
}

withDefaults(defineProps<UiBadgeProps>(), {
  color: 'neutral',
  variant: 'soft',
  size: 'sm',
  rounded: 'full',
})
const sizes = {
  xs: 'h-4.5 px-1.5 text-[11px] gap-1',
  sm: 'h-5.5 px-2 text-xs gap-1',
  md: 'h-6 px-2.5 text-xs gap-1.5',
  lg: 'h-7 px-3 text-sm gap-1.5',
}
const radii = { full: 'rounded-full', md: 'rounded-md', none: 'rounded-none' }
</script>

<template>
  <span
    :class="
      cx(
        'inline-flex shrink-0 items-center font-medium whitespace-nowrap',
        sizes[size],
        radii[rounded],
        toneClasses[variant][color],
      )
    "
  >
    <span v-if="dot" :class="['size-1.5 rounded-full', dotClasses[color]]" aria-hidden="true" />
    <i v-if="icon" :class="['mdi', icon]" aria-hidden="true" />
    <slot>{{ label }}</slot>
  </span>
</template>
