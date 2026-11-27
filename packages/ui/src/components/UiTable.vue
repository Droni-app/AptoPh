<script setup lang="ts">
import UiPagination from './UiPagination.vue'

export interface TableColumn {
  label: string
  name: string
  /** Classes for the header and the cells of the column (e.g. "text-right") */
  classes?: string
}
export interface PaginationData {
  page: number
  perPage: number
  total: number
}
export interface UiTableProps {
  columns: TableColumn[]
  rows: Array<any>
  loading?: boolean
  pagination?: PaginationData
  /** Key of each row (defaults to `id`, then the index) */
  rowKey?: string
}

const props = withDefaults(defineProps<UiTableProps>(), { rowKey: 'id' })
const emit = defineEmits<{ paginate: [page: number] }>()
defineSlots<Record<string, (props: any) => any>>()

const keyOf = (row: any, index: number) => row?.[props.rowKey] ?? index
const align = (classes?: string) => classes ?? ''
</script>

<template>
  <div class="min-w-0">
    <div
      class="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-white/8 dark:bg-neutral-900"
    >
      <table class="w-full border-collapse text-sm">
        <thead>
          <tr
            class="border-b border-neutral-200 bg-neutral-50/80 text-left dark:border-white/8 dark:bg-white/3"
          >
            <th
              v-for="column in columns"
              :key="column.name"
              scope="col"
              class="h-10 px-4 text-xs font-semibold whitespace-nowrap text-neutral-500 first:pl-5 last:pr-5 dark:text-neutral-400"
              :class="align(column.classes)"
            >
              {{ column.label }}
            </th>
          </tr>
        </thead>
        <tbody :aria-busy="loading || undefined">
          <template v-if="loading && !rows.length">
            <tr v-for="n in 5" :key="`skeleton-${n}`" class="border-b border-neutral-100 last:border-0 dark:border-white/5">
              <td v-for="column in columns" :key="column.name" class="h-12 px-4 first:pl-5 last:pr-5">
                <div class="h-3.5 w-3/4 animate-pulse rounded bg-neutral-200/70 dark:bg-white/6" />
              </td>
            </tr>
          </template>
          <tr v-else-if="!rows.length">
            <td :colspan="columns.length" class="px-5 py-12 text-center text-neutral-500 dark:text-neutral-400">
              <slot name="empty">No hay registros.</slot>
            </td>
          </tr>
          <tr
            v-for="(row, index) in rows"
            v-else
            :key="keyOf(row, index)"
            class="border-b border-neutral-100 transition-colors last:border-0 hover:bg-neutral-50/70 dark:border-white/5 dark:hover:bg-white/3"
            :class="loading && 'opacity-60'"
          >
            <td
              v-for="column in columns"
              :key="column.name"
              class="h-12 px-4 py-2.5 align-middle text-neutral-800 first:pl-5 last:pr-5 dark:text-neutral-200"
              :class="align(column.classes)"
            >
              <slot :name="column.name" v-bind="row">{{ row?.[column.name] ?? '' }}</slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <UiPagination
      v-if="pagination && pagination.total > 0"
      class="mt-3 px-1"
      v-bind="pagination"
      @paginate="emit('paginate', $event)"
    />
  </div>
</template>
