<script setup lang="ts">
import { computed } from 'vue'
import { UiLabel, UiSelect } from '@aptoph/ui'
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
  <UiLabel
    v-if="options.length > 1 || optional"
    title="Unidad"
    :required="!optional"
    :error="error"
  >
    <UiSelect
      v-model="model"
      :options="optional ? [{ value: '', label: optionalLabel }, ...options] : options"
    />
  </UiLabel>
</template>
