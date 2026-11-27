<script setup lang="ts">
import { computed } from 'vue'
import { statusIcons } from '../styles'
import { useToast, type ToastPosition } from '../toast'

export interface UiToastProps {
  position?: ToastPosition
  maxToasts?: number
}

const props = withDefaults(defineProps<UiToastProps>(), { position: 'top-right', maxToasts: 4 })
const toast = useToast()
const visible = computed(() => toast.toasts.value.slice(-props.maxToasts))

const positions: Record<ToastPosition, string> = {
  'top-right': 'top-4 right-4 items-end',
  'top-left': 'top-4 left-4 items-start',
  'top-center': 'top-4 left-1/2 -translate-x-1/2 items-center',
  'bottom-right': 'bottom-4 right-4 items-end',
  'bottom-left': 'bottom-4 left-4 items-start',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2 items-center',
}
const accents = {
  neutral: 'text-neutral-500',
  primary: 'text-brand-500 dark:text-brand-300',
  secondary: 'text-coral-500',
  success: 'text-mint-600 dark:text-mint-400',
  warning: 'text-amber-500',
  danger: 'text-red-600 dark:text-red-400',
}
</script>

<template>
  <Teleport to="body">
    <div
      class="pointer-events-none fixed z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
      :class="positions[position]"
    >
      <TransitionGroup
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0 translate-y-1"
        leave-active-class="transition duration-100 ease-in"
        leave-to-class="opacity-0"
      >
        <div
          v-for="item in visible"
          :key="item.id"
          :role="item.color === 'danger' ? 'alert' : 'status'"
          class="pointer-events-auto flex w-full items-start gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-800 shadow-overlay dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-100"
        >
          <i
            :class="['mdi mt-px text-lg leading-5', item.icon ?? statusIcons[item.color], accents[item.color]]"
            aria-hidden="true"
          />
          <div class="min-w-0 flex-1">
            <p v-if="item.title" class="font-semibold">{{ item.title }}</p>
            <p class="leading-5">{{ item.message }}</p>
          </div>
          <button
            v-if="item.closable"
            type="button"
            class="-mt-0.5 -mr-1.5 grid size-6 place-items-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Cerrar aviso"
            @click="toast.remove(item.id)"
          >
            <i class="mdi mdi-close" aria-hidden="true" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
