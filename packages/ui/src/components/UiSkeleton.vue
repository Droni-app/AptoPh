<script setup lang="ts">
import { computed } from 'vue'

export interface UiSkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded'
  width?: string | number
  height?: string | number
  animation?: 'pulse' | 'wave' | 'none'
}

const props = withDefaults(defineProps<UiSkeletonProps>(), {
  variant: 'rounded',
  animation: 'pulse',
})
const unit = (value: string | number | undefined) =>
  typeof value === 'number' ? `${value}px` : value
const style = computed(() => ({
  width: unit(props.width) ?? (props.variant === 'circular' ? '2.5rem' : '100%'),
  height:
    unit(props.height) ??
    (props.variant === 'text' ? '0.875rem' : props.variant === 'circular' ? '2.5rem' : '4rem'),
}))
const radius = { text: 'rounded', circular: 'rounded-full', rectangular: '', rounded: 'rounded-xl' }
</script>

<template>
  <div
    aria-hidden="true"
    class="bg-neutral-200/70 dark:bg-white/6"
    :class="[radius[variant], animation !== 'none' && 'animate-pulse']"
    :style="style"
  />
</template>
