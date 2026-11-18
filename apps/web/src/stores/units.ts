import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { ResidentHome } from '@aptoph/shared'
import { residentApi } from '@/api/resident'
import { unitName } from '@/lib/format'

/**
 * The resident's units in the current conjunto (from /resident/home), cached for
 * the unit pickers of visits, bookings and PQRS. Reset when switching conjunto.
 */
export const useUnitsStore = defineStore('units', () => {
  const home = ref<ResidentHome | null>(null)
  let loading: Promise<ResidentHome> | null = null

  async function load(force = false) {
    if (home.value && !force) return home.value
    loading ??= residentApi
      .home()
      .then(({ data }) => (home.value = data))
      .finally(() => (loading = null))
    return loading
  }

  /** Options for <DuiSelect> */
  function options() {
    return (home.value?.units ?? []).map((unit) => ({ value: unit.id, label: unitName(unit) }))
  }

  function reset() {
    home.value = null
  }

  return { home, load, options, reset }
})
