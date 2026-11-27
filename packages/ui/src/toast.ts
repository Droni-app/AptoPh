import { readonly, ref } from 'vue'
import type { UiColor } from './styles'

export type ToastColor = UiColor
export type ToastPosition =
  | 'top-right'
  | 'top-left'
  | 'top-center'
  | 'bottom-right'
  | 'bottom-left'
  | 'bottom-center'

export interface ToastOptions {
  title?: string
  message: string
  color?: ToastColor
  /** Milliseconds; 0 keeps it until it is closed */
  duration?: number
  closable?: boolean
  icon?: string
}

export interface ToastItem {
  id: string
  title?: string
  message: string
  color: ToastColor
  duration: number
  closable: boolean
  icon?: string
}

const toasts = ref<ToastItem[]>([])
const timers = new Map<string, ReturnType<typeof setTimeout>>()
let sequence = 0

function remove(id: string) {
  toasts.value = toasts.value.filter((toast) => toast.id !== id)
  const timer = timers.get(id)
  if (timer) clearTimeout(timer)
  timers.delete(id)
}

function add(options: ToastOptions) {
  const id = `toast-${++sequence}`
  const color = options.color ?? 'neutral'
  const item: ToastItem = {
    id,
    title: options.title,
    message: options.message,
    color,
    // Errors stay a little longer: they usually need reading
    duration: options.duration ?? (color === 'danger' ? 7000 : 4500),
    closable: options.closable ?? true,
    icon: options.icon,
  }
  toasts.value = [...toasts.value, item]
  if (item.duration > 0) timers.set(id, setTimeout(() => remove(id), item.duration))
  return id
}

function clear() {
  for (const toast of toasts.value) remove(toast.id)
}

type Shortcut = (message: string, options?: Omit<ToastOptions, 'message' | 'color'>) => string
const shortcut =
  (color: ToastColor): Shortcut =>
  (message, options) =>
    add({ ...options, message, color })

/** Notifications of the app; render them with a single <UiToast /> in App.vue */
export function useToast() {
  return {
    toasts: readonly(toasts),
    add,
    remove,
    clear,
    success: shortcut('success'),
    error: shortcut('danger'),
    warning: shortcut('warning'),
    info: shortcut('primary'),
  }
}
