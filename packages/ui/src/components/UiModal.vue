<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'

export interface UiModalProps {
  modelValue?: boolean
  title?: string
  description?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full'
  showClose?: boolean
  closeOnBackdrop?: boolean
  closeOnEsc?: boolean
  /** Cannot be dismissed with Esc or the backdrop (a form in progress) */
  persistent?: boolean
  /** The body scrolls inside the dialog, header and footer stay visible */
  scrollable?: boolean
}

const props = withDefaults(defineProps<UiModalProps>(), {
  size: 'md',
  showClose: true,
  closeOnBackdrop: true,
  closeOnEsc: true,
})
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; close: [] }>()

const id = useId()
const panel = ref<HTMLElement | null>(null)
let returnFocus: HTMLElement | null = null

const widths = {
  xs: 'sm:max-w-sm',
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
  full: 'sm:max-w-[calc(100vw-3rem)]',
}
const dismissible = computed(() => !props.persistent)

function close() {
  emit('update:modelValue', false)
  emit('close')
}
function onBackdrop() {
  if (dismissible.value && props.closeOnBackdrop) close()
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && dismissible.value && props.closeOnEsc) {
    event.stopPropagation()
    close()
  }
  // Keep the focus inside the dialog
  if (event.key === 'Tab' && panel.value) {
    const items = [...panel.value.querySelectorAll<HTMLElement>(FOCUSABLE)]
    if (!items.length) return
    const first = items[0]!
    const last = items[items.length - 1]!
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }
}

let openCount = 0
watch(
  () => props.modelValue,
  async (open) => {
    if (open) {
      returnFocus = document.activeElement as HTMLElement | null
      openCount++
      document.body.style.overflow = 'hidden'
      await nextTick()
      const target =
        panel.value?.querySelector<HTMLElement>('[autofocus]') ??
        panel.value?.querySelector<HTMLElement>(
          'input:not([disabled]):not([type="hidden"]), select, textarea',
        ) ??
        panel.value
      target?.focus()
    } else if (openCount) {
      openCount--
      document.body.style.overflow = ''
      returnFocus?.focus?.()
    }
  },
  { immediate: true },
)
onBeforeUnmount(() => {
  if (openCount) document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition duration-100 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-end justify-center bg-neutral-950/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
        @mousedown.self="onBackdrop"
        @keydown="onKeydown"
      >
        <div
          ref="panel"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="title ? `${id}-title` : undefined"
          :aria-describedby="description ? `${id}-description` : undefined"
          tabindex="-1"
          class="flex max-h-[92dvh] w-full animate-ui-in flex-col rounded-t-2xl bg-white text-neutral-900 shadow-overlay outline-none sm:rounded-xl dark:bg-neutral-900 dark:text-neutral-100 dark:ring-1 dark:ring-white/10"
          :class="[widths[size], scrollable ? '' : 'overflow-y-auto']"
        >
          <header
            v-if="title || $slots.header || showClose"
            class="flex shrink-0 items-start gap-4 px-5 pt-5 pb-1 sm:px-6"
          >
            <div class="min-w-0 flex-1">
              <slot name="header">
                <h2
                  v-if="title"
                  :id="`${id}-title`"
                  class="text-base font-semibold text-neutral-900 dark:text-white"
                >
                  {{ title }}
                </h2>
                <p
                  v-if="description"
                  :id="`${id}-description`"
                  class="mt-1 text-sm text-neutral-500 dark:text-neutral-400"
                >
                  {{ description }}
                </p>
              </slot>
            </div>
            <button
              v-if="showClose"
              type="button"
              class="-mt-1 -mr-2 grid size-8 shrink-0 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 disabled:opacity-40 dark:hover:bg-white/8 dark:hover:text-white"
              aria-label="Cerrar"
              :disabled="persistent"
              @click="close"
            >
              <i class="mdi mdi-close text-xl" aria-hidden="true" />
            </button>
          </header>
          <div class="px-5 py-4 sm:px-6" :class="scrollable && 'min-h-0 flex-1 overflow-y-auto'">
            <slot />
          </div>
          <footer
            v-if="$slots.footer"
            class="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-neutral-200 px-5 py-3.5 sm:px-6 dark:border-white/8"
          >
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
