<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import { cx, normalizeSize, variantClasses, type UiColor, type UiVariant } from '../styles'

export interface UiButtonProps {
  variant?: UiVariant
  color?: UiColor
  size?: 'sm' | 'md' | 'lg'
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  loading?: boolean
  block?: boolean
  title?: string
  /** Renders a router link */
  to?: RouteLocationRaw
  /** Leading MDI icon, e.g. "mdi-plus" */
  icon?: string
}

const props = withDefaults(defineProps<UiButtonProps>(), {
  variant: 'solid',
  color: 'neutral',
  size: 'md',
  type: 'button',
})

const sizes = {
  sm: 'h-8 gap-1.5 px-3 text-[13px]',
  md: 'h-9 gap-2 px-3.5 text-sm',
  lg: 'h-11 gap-2 px-5 text-[15px]',
}

const classes = computed(() =>
  cx(
    'inline-flex shrink-0 items-center justify-center rounded-lg font-medium whitespace-nowrap transition-colors select-none',
    'disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50',
    sizes[normalizeSize(props.size)],
    variantClasses[props.variant][props.color],
    props.block && 'w-full',
  ),
)
const inactive = computed(() => props.disabled || props.loading)
</script>

<template>
  <RouterLink
    v-if="to && !inactive"
    :to="to"
    :class="classes"
    :title="title"
  >
    <i v-if="icon" :class="['mdi text-[1.15em]', icon]" aria-hidden="true" />
    <slot />
  </RouterLink>
  <button
    v-else
    :type="type"
    :class="classes"
    :title="title"
    :disabled="inactive"
    :aria-busy="loading || undefined"
  >
    <i v-if="loading" class="mdi mdi-loading mdi-spin text-[1.15em]" aria-hidden="true" />
    <i v-else-if="icon" :class="['mdi text-[1.15em]', icon]" aria-hidden="true" />
    <slot />
  </button>
</template>
