<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, provide, ref, useId, watch } from 'vue'
import { DROPDOWN_KEY } from '../dropdown'

export interface UiDropdownProps {
  modelValue?: boolean
  placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end' | 'bottom' | 'top'
  minWidth?: string
  ariaLabel?: string
  disabled?: boolean
  /** Classes of the trigger button */
  triggerClass?: string
}

const props = withDefaults(defineProps<UiDropdownProps>(), {
  modelValue: undefined,
  placement: 'bottom-start',
  minWidth: '12rem',
})
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const id = useId()
const wrapper = ref<HTMLElement | null>(null)
const menu = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
const inner = ref(false)
const open = computed({
  get: () => props.modelValue ?? inner.value,
  set: (value: boolean) => {
    inner.value = value
    emit('update:modelValue', value)
  },
})

const positions = {
  'bottom-start': 'top-full left-0 mt-1.5 origin-top-left',
  'bottom-end': 'top-full right-0 mt-1.5 origin-top-right',
  bottom: 'top-full left-1/2 mt-1.5 -translate-x-1/2 origin-top',
  'top-start': 'bottom-full left-0 mb-1.5 origin-bottom-left',
  'top-end': 'bottom-full right-0 mb-1.5 origin-bottom-right',
  top: 'bottom-full left-1/2 mb-1.5 -translate-x-1/2 origin-bottom',
}

const items = () => [...(menu.value?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? [])]

function close(focusTrigger = false) {
  open.value = false
  if (focusTrigger) trigger.value?.focus()
}
provide(DROPDOWN_KEY, { close: () => close(true) })

async function toggle() {
  if (props.disabled) return
  open.value = !open.value
  if (open.value) {
    await nextTick()
    items()[0]?.focus()
  }
}
function onKeydown(event: KeyboardEvent) {
  if (!open.value) return
  const list = items()
  const index = list.indexOf(document.activeElement as HTMLElement)
  if (event.key === 'Escape') {
    event.preventDefault()
    close(true)
  } else if (event.key === 'ArrowDown') {
    event.preventDefault()
    list[(index + 1) % list.length]?.focus()
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    list[(index - 1 + list.length) % list.length]?.focus()
  } else if (event.key === 'Tab') close()
}
function onOutside(event: MouseEvent) {
  if (wrapper.value && !wrapper.value.contains(event.target as Node)) close()
}
watch(open, (value) => {
  if (value) document.addEventListener('mousedown', onOutside)
  else document.removeEventListener('mousedown', onOutside)
})
onBeforeUnmount(() => document.removeEventListener('mousedown', onOutside))
</script>

<template>
  <div ref="wrapper" class="relative inline-flex" @keydown="onKeydown">
    <button
      ref="trigger"
      type="button"
      class="inline-flex items-center rounded-lg transition-colors disabled:opacity-50"
      :class="triggerClass ?? 'h-9 px-2 hover:bg-neutral-100 dark:hover:bg-white/8'"
      :aria-label="ariaLabel"
      aria-haspopup="menu"
      :aria-expanded="open"
      :aria-controls="`${id}-menu`"
      :disabled="disabled"
      @click="toggle"
    >
      <slot name="trigger">
        <i class="mdi mdi-dots-vertical text-xl text-neutral-500" aria-hidden="true" />
      </slot>
    </button>
    <Transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="opacity-0 scale-95"
      leave-active-class="transition duration-75 ease-in"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="open"
        :id="`${id}-menu`"
        ref="menu"
        role="menu"
        class="absolute z-40 rounded-xl border border-neutral-200 bg-white p-1 text-sm text-neutral-800 shadow-overlay dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-100"
        :class="positions[placement]"
        :style="{ minWidth }"
      >
        <slot />
      </div>
    </Transition>
  </div>
</template>
