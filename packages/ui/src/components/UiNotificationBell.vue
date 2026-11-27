<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import {
  NOTIFICATION_CATEGORY_ICONS,
  type AppNotification,
  type NotificationList,
} from '@aptoph/shared'

/**
 * The bell of the navbar (docs/notifications.md): the unread count, polled
 * every minute and when the tab comes back, and the latest notifications.
 * The app passes how to talk to its API and what to do with a path.
 */
export interface UiNotificationBellClient {
  list: () => Promise<NotificationList>
  unread: () => Promise<{ unread: number }>
  read: (id: string) => Promise<{ unread: number }>
  readAll: () => Promise<unknown>
}

const props = withDefaults(
  defineProps<{
    client: UiNotificationBellClient
    /** Seconds between checks of the unread count */
    interval?: number
    /** Where the preferences live, for the footer link */
    preferencesPath?: string
    placement?: 'bottom-end' | 'bottom-start'
    triggerClass?: string
  }>(),
  { interval: 60, preferencesPath: '/perfil#notificaciones', placement: 'bottom-end' }
)
const emit = defineEmits<{ navigate: [path: string] }>()

const id = useId()
const open = ref(false)
const loading = ref(false)
const failed = ref(false)
const unread = ref(0)
const items = ref<AppNotification[]>([])
const wrapper = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)

const badge = computed(() => (unread.value > 99 ? '99+' : String(unread.value)))
const label = computed(() =>
  unread.value
    ? `Notificaciones: ${unread.value} sin leer`
    : 'Notificaciones: no tienes nuevas'
)

async function refreshCount() {
  if (document.visibilityState === 'hidden') return
  try {
    unread.value = (await props.client.unread()).unread
  } catch {
    // A failed check waits for the next one
  }
}

async function load() {
  loading.value = true
  failed.value = false
  try {
    const result = await props.client.list()
    items.value = result.data
    unread.value = result.unread
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}

async function choose(item: AppNotification) {
  open.value = false
  if (!item.readAt) {
    item.readAt = new Date().toISOString()
    props.client
      .read(item.id)
      .then((result) => (unread.value = result.unread))
      .catch(() => {})
  }
  if (item.path) emit('navigate', item.path)
}

async function readAll() {
  const now = new Date().toISOString()
  for (const item of items.value) item.readAt ??= now
  unread.value = 0
  await props.client.readAll().catch(() => load())
}

function toggle() {
  open.value = !open.value
}

function onOutside(event: MouseEvent) {
  if (wrapper.value && !wrapper.value.contains(event.target as Node)) open.value = false
}
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && open.value) {
    open.value = false
    trigger.value?.focus()
  }
}
watch(open, (value) => {
  if (value) {
    load()
    document.addEventListener('mousedown', onOutside)
  } else document.removeEventListener('mousedown', onOutside)
})

let timer: ReturnType<typeof setInterval> | undefined
const onVisible = () => document.visibilityState === 'visible' && refreshCount()
onMounted(() => {
  refreshCount()
  timer = setInterval(refreshCount, props.interval * 1000)
  document.addEventListener('visibilitychange', onVisible)
})
onBeforeUnmount(() => {
  clearInterval(timer)
  document.removeEventListener('visibilitychange', onVisible)
  document.removeEventListener('mousedown', onOutside)
})

const relative = new Intl.RelativeTimeFormat('es-CO', { numeric: 'auto' })
function ago(iso: string) {
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000
  const steps: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['minute', 60],
    ['hour', 3600],
    ['day', 86_400],
    ['week', 604_800],
  ]
  if (Math.abs(seconds) < 60) return 'ahora'
  for (let i = steps.length - 1; i >= 0; i--) {
    const [unit, size] = steps[i]!
    if (Math.abs(seconds) >= size || i === 0) return relative.format(Math.round(seconds / size), unit)
  }
  return ''
}

defineExpose({ refresh: refreshCount })
</script>

<template>
  <div ref="wrapper" class="relative inline-flex" @keydown="onKeydown">
    <button
      ref="trigger"
      type="button"
      class="relative inline-flex items-center justify-center rounded-lg transition-colors"
      :class="triggerClass ?? 'size-9 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-white/8'"
      :aria-label="label"
      aria-haspopup="dialog"
      :aria-expanded="open"
      :aria-controls="`${id}-panel`"
      @click="toggle"
    >
      <i class="mdi text-xl" :class="unread ? 'mdi-bell-badge-outline' : 'mdi-bell-outline'" aria-hidden="true" />
      <span
        v-if="unread"
        class="absolute -top-0.5 -right-0.5 inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-red-600 px-1 text-[0.65rem] leading-none font-semibold text-white ring-2 ring-white dark:ring-neutral-900"
        aria-hidden="true"
        >{{ badge }}</span
      >
    </button>

    <Transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="opacity-0 scale-95"
      leave-active-class="transition duration-75 ease-in"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="open"
        :id="`${id}-panel`"
        role="dialog"
        aria-label="Notificaciones"
        class="absolute top-full z-40 mt-1.5 flex max-h-[min(32rem,80vh)] w-[min(24rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white text-sm text-neutral-800 shadow-overlay dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-100"
        :class="placement === 'bottom-end' ? 'right-0 origin-top-right' : 'left-0 origin-top-left'"
      >
        <header class="flex items-center justify-between gap-2 border-b border-neutral-100 px-4 py-3 dark:border-white/8">
          <h2 class="font-semibold">Notificaciones</h2>
          <button
            v-if="unread"
            type="button"
            class="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
            @click="readAll"
          >
            Marcar todas como leídas
          </button>
        </header>

        <div class="min-h-0 flex-1 overflow-y-auto">
          <div v-if="loading && !items.length" class="space-y-3 p-4" aria-busy="true">
            <div v-for="n in 3" :key="n" class="h-12 animate-pulse rounded-lg bg-neutral-100 dark:bg-white/5" />
          </div>
          <p v-else-if="failed" class="px-4 py-8 text-center text-neutral-500">
            No pudimos cargar tus notificaciones.
            <button type="button" class="font-medium text-brand-600 hover:underline" @click="load">
              Reintentar
            </button>
          </p>
          <div v-else-if="!items.length" class="px-4 py-10 text-center text-neutral-500">
            <i class="mdi mdi-bell-sleep-outline text-3xl text-neutral-300 dark:text-neutral-600" aria-hidden="true" />
            <p class="mt-2">No tienes notificaciones todavía.</p>
          </div>
          <ul v-else class="divide-y divide-neutral-100 dark:divide-white/6">
            <li v-for="item in items" :key="item.id">
              <button
                type="button"
                class="flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-neutral-50 focus-visible:bg-neutral-50 focus-visible:outline-none dark:hover:bg-white/5 dark:focus-visible:bg-white/5"
                :class="!item.readAt && 'bg-brand-50/60 dark:bg-brand-500/8'"
                @click="choose(item)"
              >
                <span
                  class="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full"
                  :class="item.readAt ? 'bg-neutral-100 text-neutral-500 dark:bg-white/8 dark:text-neutral-400' : 'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300'"
                  aria-hidden="true"
                >
                  <i class="mdi text-base" :class="NOTIFICATION_CATEGORY_ICONS[item.category]" />
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block font-medium" :class="item.readAt ? 'text-neutral-700 dark:text-neutral-300' : 'text-neutral-900 dark:text-white'">
                    {{ item.title }}
                  </span>
                  <span v-if="item.body" class="mt-0.5 line-clamp-2 block text-neutral-500 dark:text-neutral-400">
                    {{ item.body }}
                  </span>
                  <span class="mt-1 block text-xs text-neutral-400">
                    <time :datetime="item.createdAt">{{ ago(item.createdAt) }}</time>
                    <span v-if="!item.readAt" class="sr-only"> · sin leer</span>
                  </span>
                </span>
                <span v-if="!item.readAt" class="mt-2 size-2 shrink-0 rounded-full bg-brand-600" aria-hidden="true" />
              </button>
            </li>
          </ul>
        </div>

        <footer class="border-t border-neutral-100 px-4 py-2.5 text-center dark:border-white/8">
          <button
            type="button"
            class="text-xs font-medium text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            @click="(open = false), emit('navigate', preferencesPath)"
          >
            <i class="mdi mdi-cog-outline" aria-hidden="true" /> Elegir cómo me llegan
          </button>
        </footer>
      </div>
    </Transition>
  </div>
</template>
