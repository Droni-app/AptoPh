<script setup lang="ts">
import { computed } from 'vue'
import { DuiLabel, DuiSelect } from '@dronico/droni-kit'
import { useUnitsStore } from '@/stores/units'

/** Unit selector; hidden when the resident has a single unit (it is preselected) */
withDefaults(defineProps<{ error?: string; optional?: boolean; optionalLabel?: string }>(), {
  error: undefined,
  optionalLabel: 'Ninguna en particular',
})
const model = defineModel<string>({ required: true })
const units = useUnitsStore()
const options = computed(() => units.options())
</script>

<template>
  <DuiLabel
    v-if="options.length > 1 || optional"
    title="Unidad"
    :required="!optional"
    :error="error"
  >
    <DuiSelect
      v-model="model"
      :options="optional ? [{ value: '', label: optionalLabel }, ...options] : options"
    />
  </DuiLabel>
</template>
