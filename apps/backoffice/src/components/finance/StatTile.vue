<script setup lang="ts">
import { RouterLink, type RouteLocationRaw } from 'vue-router'

defineProps<{
  label: string
  value: string
  hint?: string
  icon: string
  tone?: 'mint' | 'coral' | 'brand' | 'amber'
  to?: RouteLocationRaw
}>()

const tones = {
  mint: 'bg-mint-50 text-mint-700 dark:bg-mint-400/15 dark:text-mint-300',
  coral: 'bg-coral-50 text-coral-700 dark:bg-coral-400/15 dark:text-coral-300',
  brand: 'bg-brand-50 text-brand-700 dark:bg-brand-400/15 dark:text-brand-200',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200',
}
</script>

<template>
  <component
    :is="to ? RouterLink : 'div'"
    :to="to"
    class="flex items-start gap-3 rounded-2xl bg-white p-4 ring-1 ring-brand-900/5 transition dark:bg-neutral-900 dark:ring-white/10"
    :class="to ? 'hover:ring-mint-500/40' : ''"
  >
    <span
      class="grid size-10 shrink-0 place-items-center rounded-xl text-xl"
      :class="tones[tone ?? 'mint']"
    >
      <i :class="icon" aria-hidden="true" />
    </span>
    <span class="min-w-0">
      <span class="block text-xs font-medium text-neutral-500 dark:text-neutral-400">{{
        label
      }}</span>
      <span class="block truncate text-lg font-bold text-brand-700 tabular-nums dark:text-white">{{
        value
      }}</span>
      <span v-if="hint" class="block text-xs text-neutral-500 dark:text-neutral-400">{{
        hint
      }}</span>
    </span>
  </component>
</template>
