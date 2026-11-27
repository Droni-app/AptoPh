<script setup lang="ts">
import { inject } from 'vue'
import { DROPDOWN_KEY } from '../dropdown'

export interface UiDropdownItemProps {
  label?: string
  icon?: string
  href?: string
  target?: string
  disabled?: boolean
  danger?: boolean
}

const props = defineProps<UiDropdownItemProps>()
const emit = defineEmits<{ click: [event: MouseEvent] }>()
const dropdown = inject(DROPDOWN_KEY, null)

function onClick(event: MouseEvent) {
  if (props.disabled) return
  emit('click', event)
  dropdown?.close()
}
const classes = (danger?: boolean) => [
  'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors focus:outline-none disabled:pointer-events-none disabled:opacity-40',
  danger
    ? 'text-red-700 hover:bg-red-50 focus:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/15 dark:focus:bg-red-500/15'
    : 'hover:bg-neutral-100 focus:bg-neutral-100 dark:hover:bg-white/8 dark:focus:bg-white/8',
]
</script>

<template>
  <a
    v-if="href"
    role="menuitem"
    :href="href"
    :target="target"
    :rel="target === '_blank' ? 'noopener' : undefined"
    :class="classes(danger)"
    @click="onClick"
  >
    <i v-if="icon" :class="['mdi text-lg leading-none opacity-75', icon]" aria-hidden="true" />
    <span class="min-w-0 flex-1 truncate"><slot>{{ label }}</slot></span>
    <slot name="trailing" />
  </a>
  <button
    v-else
    type="button"
    role="menuitem"
    :disabled="disabled"
    :class="classes(danger)"
    @click="onClick"
  >
    <i v-if="icon" :class="['mdi text-lg leading-none opacity-75', icon]" aria-hidden="true" />
    <span class="min-w-0 flex-1 truncate"><slot>{{ label }}</slot></span>
    <slot name="trailing" />
  </button>
</template>
