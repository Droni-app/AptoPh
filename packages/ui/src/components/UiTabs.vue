<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { cx, type UiColor } from '../styles'

export interface UiTab {
  label: string
  value: string
  icon?: string
  badge?: number | string
  disabled?: boolean
}
export interface UiTabsProps {
  modelValue: string
  tabs: UiTab[]
  variant?: 'underline' | 'pills' | 'boxed'
  color?: UiColor
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  ariaLabel?: string
}

const props = withDefaults(defineProps<UiTabsProps>(), { variant: 'underline', size: 'md' })
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const buttons = ref<HTMLButtonElement[]>([])

function select(value: string) {
  if (value !== props.modelValue) emit('update:modelValue', value)
}
/** Arrow keys move between tabs (WAI-ARIA tabs pattern) */
async function onKeydown(event: KeyboardEvent, index: number) {
  const enabled = props.tabs.map((tab, i) => (tab.disabled ? -1 : i)).filter((i) => i >= 0)
  const position = enabled.indexOf(index)
  let next: number | undefined
  if (event.key === 'ArrowRight') next = enabled[(position + 1) % enabled.length]
  else if (event.key === 'ArrowLeft') next = enabled[(position - 1 + enabled.length) % enabled.length]
  else if (event.key === 'Home') next = enabled[0]
  else if (event.key === 'End') next = enabled[enabled.length - 1]
  if (next === undefined) return
  event.preventDefault()
  select(props.tabs[next]!.value)
  await nextTick()
  buttons.value[next]?.focus()
}

const containers = {
  underline: 'gap-1 border-b border-neutral-200 dark:border-white/10',
  pills: 'gap-1',
  boxed: 'gap-1 rounded-lg bg-neutral-100 p-1 dark:bg-white/5',
}
function tabClasses(active: boolean) {
  const sizes = { sm: 'h-8 px-2.5 text-[13px]', md: 'h-9 px-3 text-sm', lg: 'h-10 px-4 text-sm' }
  const base = cx(
    'inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-40',
    sizes[props.size],
    props.fullWidth && 'flex-1',
  )
  if (props.variant === 'underline')
    return cx(
      base,
      '-mb-px border-b-2',
      active
        ? 'border-mint-500 text-neutral-900 dark:border-mint-400 dark:text-white'
        : 'border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-100',
    )
  if (props.variant === 'pills')
    return cx(
      base,
      'rounded-lg',
      active
        ? 'bg-brand-700 text-white dark:bg-brand-300 dark:text-neutral-950'
        : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-white/8',
    )
  return cx(
    base,
    'rounded-md',
    active
      ? 'bg-white text-neutral-900 shadow-xs dark:bg-neutral-800 dark:text-white'
      : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white',
  )
}
</script>

<template>
  <div
    role="tablist"
    :aria-label="ariaLabel"
    class="flex max-w-full overflow-x-auto"
    :class="containers[variant]"
  >
    <button
      v-for="(tab, index) in tabs"
      :key="tab.value"
      ref="buttons"
      type="button"
      role="tab"
      :aria-selected="tab.value === modelValue"
      :tabindex="tab.value === modelValue ? 0 : -1"
      :disabled="tab.disabled"
      :class="tabClasses(tab.value === modelValue)"
      @click="select(tab.value)"
      @keydown="onKeydown($event, index)"
    >
      <i v-if="tab.icon" :class="['mdi text-base', tab.icon]" aria-hidden="true" />
      {{ tab.label }}
      <span
        v-if="tab.badge !== undefined && tab.badge !== ''"
        class="rounded-full bg-neutral-200 px-1.5 text-[11px] leading-4 font-semibold text-neutral-700 tabular-nums dark:bg-white/10 dark:text-neutral-200"
        >{{ tab.badge }}</span
      >
    </button>
  </div>
</template>
