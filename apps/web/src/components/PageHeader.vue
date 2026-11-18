<script setup lang="ts">
import { computed } from 'vue'
import reservas900 from '@/assets/img/header-reservas-900.webp'
import reservas1600 from '@/assets/img/header-reservas-1600.webp'
import porteria900 from '@/assets/img/header-porteria-900.webp'
import porteria1600 from '@/assets/img/header-porteria-1600.webp'
import comunicados900 from '@/assets/img/header-comunicados-900.webp'
import comunicados1600 from '@/assets/img/header-comunicados-1600.webp'

/** Module illustrations (branding/headers): the left part is free for the title */
const headers = {
  reservas: [reservas900, reservas1600],
  porteria: [porteria900, porteria1600],
  comunicados: [comunicados900, comunicados1600],
} as const

const props = defineProps<{ title: string; subtitle?: string; art?: keyof typeof headers }>()

const image = computed(() => {
  if (!props.art) return null
  const [small, large] = headers[props.art]
  return { src: large, srcset: `${small} 900w, ${large} 1600w` }
})
</script>

<template>
  <header
    v-if="image"
    class="relative mb-8 overflow-hidden rounded-3xl bg-[#f8f1e7] ring-1 ring-brand-900/5 dark:ring-white/10"
  >
    <!-- Phones: the illustration on top, cropped to its right side -->
    <img
      :src="image.src"
      :srcset="image.srcset"
      sizes="(min-width: 1024px) 64rem, 100vw"
      alt=""
      width="1600"
      height="533"
      class="aspect-[2/1] w-full object-cover object-right sm:absolute sm:inset-0 sm:aspect-auto sm:h-full"
    />
    <div class="relative flex flex-col gap-4 p-6 sm:max-w-[42%] sm:py-10 sm:pr-0 sm:pl-8 lg:py-12">
      <div>
        <slot name="before" />
        <h1 class="text-[1.75rem] leading-tight font-extrabold text-brand-700">{{ title }}</h1>
        <p v-if="subtitle" class="mt-1.5 text-sm text-neutral-600">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2">
        <slot name="actions" />
      </div>
    </div>
  </header>

  <header v-else class="mb-6 flex flex-wrap items-end justify-between gap-4">
    <div class="min-w-0">
      <slot name="before" />
      <h1
        class="truncate text-[1.75rem] leading-tight font-extrabold text-brand-700 dark:text-white"
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
