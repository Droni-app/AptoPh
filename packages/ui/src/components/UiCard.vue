<script setup lang="ts">
import { computed } from 'vue'
import { normalizeSize } from '../styles'

export interface UiCardProps {
  size?: 'sm' | 'md' | 'lg' | 's' | 'm' | 'l'
  title?: string
  subtitle?: string
  /** No inner padding (tables that reach the edges) */
  flush?: boolean
}

const props = defineProps<UiCardProps>()
const paddings = { sm: 'p-4', md: 'p-5', lg: 'p-6 sm:p-7' }
const padding = computed(() => (props.flush ? '' : paddings[normalizeSize(props.size)]))
</script>

<template>
  <section
    class="min-w-0 rounded-xl border border-neutral-200 bg-white text-neutral-900 dark:border-white/8 dark:bg-neutral-900 dark:text-neutral-100"
    :class="padding"
  >
    <header
      v-if="title || subtitle || $slots.actions"
      class="mb-4 flex flex-wrap items-start justify-between gap-3"
      :class="flush && 'mb-0 border-b border-neutral-200 px-5 py-4 dark:border-white/8'"
    >
      <div class="min-w-0">
        <h2 v-if="title" class="text-[15px] font-semibold text-neutral-900 dark:text-white">
          {{ title }}
        </h2>
        <p v-if="subtitle" class="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
          {{ subtitle }}
        </p>
      </div>
      <div v-if="$slots.actions" class="flex shrink-0 items-center gap-2">
        <slot name="actions" />
      </div>
    </header>
    <slot />
  </section>
</template>
