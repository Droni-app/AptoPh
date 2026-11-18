<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { UNIT_TYPE_LABELS, type Unit } from '@aptoph/shared'
import { unitsApi } from '@/api/backoffice'

export type PickedUnit = { id: string; code: string; label: string }

const props = withDefaults(
  defineProps<{ placeholder?: string; exclude?: string[]; autofocus?: boolean }>(),
  { placeholder: 'Busca por número de unidad', exclude: () => [] },
)
const emit = defineEmits<{ pick: [unit: PickedUnit] }>()

const search = ref('')
const results = ref<Unit[]>([])
const open = ref(false)
const loading = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

const label = (unit: Unit) =>
  [unit.building?.name, `${UNIT_TYPE_LABELS[unit.type]} ${unit.code}`].filter(Boolean).join(' · ')

watch(search, (value) => {
  clearTimeout(timer)
  if (!value.trim()) {
    results.value = []
    return
  }
  timer = setTimeout(async () => {
    loading.value = true
    try {
      const { data } = await unitsApi.list({ search: value.trim(), perPage: 15 })
      results.value = data.filter((unit) => !props.exclude.includes(unit.id))
      open.value = true
    } finally {
      loading.value = false
    }
  }, 250)
})

onBeforeUnmount(() => clearTimeout(timer))

function pick(unit: Unit) {
  emit('pick', { id: unit.id, code: unit.code, label: label(unit) })
  search.value = ''
  results.value = []
  open.value = false
}
</script>

<template>
  <div class="relative">
    <input
      v-model="search"
      type="search"
      :placeholder="placeholder"
      :autofocus="autofocus"
      autocomplete="off"
      class="block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-mint-500 focus:ring-2 focus:ring-mint-500/30 focus:outline-none dark:border-white/15 dark:bg-neutral-900 dark:text-white"
      aria-label="Buscar unidad"
      @focus="open = results.length > 0"
      @keydown.enter.prevent="results[0] && pick(results[0])"
      @keydown.esc="open = false"
    />
    <span v-if="loading" class="absolute top-2 right-3 text-neutral-400" aria-hidden="true">
      <i class="mdi mdi-loading mdi-spin" />
    </span>
    <ul
      v-if="open && results.length"
      class="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-lg bg-white py-1 text-sm shadow-lg ring-1 ring-black/10 dark:bg-neutral-800 dark:ring-white/10"
      role="listbox"
    >
      <li v-for="unit in results" :key="unit.id">
        <button
          type="button"
          class="w-full px-3 py-2 text-left hover:bg-mint-50 dark:hover:bg-white/5"
          @mousedown.prevent="pick(unit)"
        >
          {{ label(unit) }}
        </button>
      </li>
    </ul>
  </div>
</template>
