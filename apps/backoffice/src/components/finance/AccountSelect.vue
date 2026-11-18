<script setup lang="ts">
import { computed, onMounted } from 'vue'
import type { AccountClass } from '@aptoph/shared'
import { useFinanceCatalog } from '@/composables/useFinanceCatalog'

const props = withDefaults(
  defineProps<{
    /** Only accounts of these classes */
    classes?: AccountClass[]
    /** Only codes starting with these prefixes */
    prefixes?: string[]
    /** Leave out codes starting with these prefixes */
    excludePrefixes?: string[]
    placeholder?: string
    id?: string
    required?: boolean
  }>(),
  {
    classes: undefined,
    prefixes: undefined,
    excludePrefixes: () => [],
    placeholder: 'Selecciona una cuenta',
    id: undefined,
  },
)
const model = defineModel<string>({ default: '' })
const emit = defineEmits<{ change: [] }>()
const catalog = useFinanceCatalog()

onMounted(() => catalog.load())

/** Postable accounts grouped by their 4-digit account */
const groups = computed(() => {
  const accounts = catalog.postable.value.filter(
    (account) =>
      (!props.classes || props.classes.includes(account.class)) &&
      (!props.prefixes || props.prefixes.some((prefix) => account.code.startsWith(prefix))) &&
      !props.excludePrefixes.some((prefix) => account.code.startsWith(prefix)),
  )
  const parents = new Map(catalog.accounts.value.map((account) => [account.code, account.name]))
  const grouped = new Map<string, { label: string; options: typeof accounts }>()
  for (const account of accounts) {
    const key = account.code.slice(0, 4)
    const group = grouped.get(key) ?? { label: `${key} · ${parents.get(key) ?? ''}`, options: [] }
    group.options.push(account)
    grouped.set(key, group)
  }
  return [...grouped.values()]
})
</script>

<template>
  <select
    :id="id"
    v-model="model"
    :required="required"
    @change="emit('change')"
    class="block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-mint-500 focus:ring-2 focus:ring-mint-500/30 focus:outline-none dark:border-white/15 dark:bg-neutral-900 dark:text-white"
  >
    <option value="" disabled>{{ placeholder }}</option>
    <optgroup v-for="group in groups" :key="group.label" :label="group.label">
      <option v-for="account in group.options" :key="account.id" :value="account.id">
        {{ account.code }} · {{ account.name }}
      </option>
    </optgroup>
  </select>
</template>
