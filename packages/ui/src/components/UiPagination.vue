<script setup lang="ts">
import { computed } from 'vue'

export interface UiPaginationProps {
  page: number
  perPage: number
  total: number
}

const props = defineProps<UiPaginationProps>()
const emit = defineEmits<{ paginate: [page: number] }>()

const pages = computed(() => Math.max(1, Math.ceil(props.total / props.perPage)))
const from = computed(() => (props.total ? (props.page - 1) * props.perPage + 1 : 0))
const to = computed(() => Math.min(props.total, props.page * props.perPage))
const number = (value: number) => value.toLocaleString('es-CO')

/** 1 … 4 5 6 … 12 */
const items = computed(() => {
  const last = pages.value
  const current = props.page
  const set = new Set([1, last, current - 1, current, current + 1].filter((p) => p >= 1 && p <= last))
  const sorted = [...set].sort((a, b) => a - b)
  const result: Array<number | 'gap'> = []
  sorted.forEach((value, index) => {
    if (index && value - sorted[index - 1]! > 1) result.push('gap')
    result.push(value)
  })
  return result
})
const go = (value: number) => {
  if (value >= 1 && value <= pages.value && value !== props.page) emit('paginate', value)
}
const button =
  'grid h-8 min-w-8 place-items-center rounded-md px-2 text-[13px] tabular-nums transition-colors disabled:pointer-events-none disabled:opacity-40'
</script>

<template>
  <nav
    class="flex flex-wrap items-center justify-between gap-3 text-[13px] text-neutral-500 dark:text-neutral-400"
    aria-label="Paginación"
  >
    <p class="tabular-nums">{{ number(from) }}–{{ number(to) }} de {{ number(total) }}</p>
    <div v-if="pages > 1" class="flex items-center gap-1">
      <button
        type="button"
        :class="[button, 'hover:bg-neutral-100 dark:hover:bg-white/8']"
        :disabled="page <= 1"
        aria-label="Página anterior"
        @click="go(page - 1)"
      >
        <i class="mdi mdi-chevron-left text-lg" aria-hidden="true" />
      </button>
      <template v-for="(item, index) in items" :key="index">
        <span v-if="item === 'gap'" class="px-1" aria-hidden="true">…</span>
        <button
          v-else
          type="button"
          :class="[
            button,
            item === page
              ? 'bg-brand-700 font-semibold text-white dark:bg-brand-300 dark:text-neutral-950'
              : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-white/8',
          ]"
          :aria-current="item === page ? 'page' : undefined"
          @click="go(item)"
        >
          {{ item }}
        </button>
      </template>
      <button
        type="button"
        :class="[button, 'hover:bg-neutral-100 dark:hover:bg-white/8']"
        :disabled="page >= pages"
        aria-label="Página siguiente"
        @click="go(page + 1)"
      >
        <i class="mdi mdi-chevron-right text-lg" aria-hidden="true" />
      </button>
    </div>
  </nav>
</template>
