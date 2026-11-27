<script setup lang="ts">
import { computed, provide, useId } from 'vue'
import { FIELD_KEY } from '../field'

export interface UiLabelProps {
  title?: string
  icon?: string
  helpText?: string
  error?: string
  size?: 'sm' | 'md' | 'lg' | 's' | 'm' | 'l'
  required?: boolean
}

const props = defineProps<UiLabelProps>()
const id = `field-${useId()}`
const hintId = `${id}-hint`

let taken = false
provide(FIELD_KEY, {
  id,
  takeId() {
    if (taken) return undefined
    taken = true
    return id
  },
  invalid: computed(() => !!props.error),
  describedBy: computed(() => (props.error || props.helpText ? hintId : undefined)),
})
</script>

<template>
  <div class="flex min-w-0 flex-col gap-1.5">
    <label
      v-if="title"
      :for="id"
      class="flex items-center gap-1.5 text-[13px] font-medium text-neutral-800 dark:text-neutral-200"
    >
      <i v-if="icon" :class="['mdi text-base text-neutral-500', icon]" aria-hidden="true" />
      {{ title }}
      <span v-if="required" class="text-red-600 dark:text-red-400" aria-hidden="true">*</span>
    </label>
    <slot />
    <p
      v-if="error"
      :id="hintId"
      class="flex items-start gap-1 text-xs text-red-700 dark:text-red-300"
      role="alert"
    >
      <i class="mdi mdi-alert-circle-outline mt-px" aria-hidden="true" />
      {{ error }}
    </p>
    <p v-else-if="helpText" :id="hintId" class="text-xs text-neutral-500 dark:text-neutral-400">
      {{ helpText }}
    </p>
  </div>
</template>
