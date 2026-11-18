<script setup lang="ts">
defineProps<{ title: string; subtitle?: string }>()
</script>

<template>
  <header class="mb-6 flex flex-wrap items-end justify-between gap-4">
    <div class="min-w-0">
      <slot name="before" />
      <h1
        class="truncate text-[1.75rem] leading-tight font-extrabold tracking-tight text-brand-700 dark:text-white"
      >
        {{ title }}
      </h1>
      <p v-if="subtitle" class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
        {{ subtitle }}
      </p>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </header>
</template>
