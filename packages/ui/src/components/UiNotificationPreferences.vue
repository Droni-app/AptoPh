<script setup lang="ts">
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CATEGORY_DESCRIPTIONS,
  NOTIFICATION_CATEGORY_ICONS,
  NOTIFICATION_CATEGORY_LABELS,
  type NotificationCategory,
  type NotificationChannel,
  type NotificationPreferences,
} from '@aptoph/shared'

/**
 * Which channel each kind of notice uses (docs/notifications.md). The bell
 * always gets everything; this only turns email and push on or off.
 */
const props = withDefaults(
  defineProps<{
    modelValue: NotificationPreferences
    /** Categories shown (staff do not need, e.g., portería) */
    categories?: readonly NotificationCategory[]
    disabled?: boolean
  }>(),
  { categories: () => NOTIFICATION_CATEGORIES }
)
const emit = defineEmits<{ 'update:modelValue': [value: NotificationPreferences] }>()

const channels: Array<{ key: NotificationChannel; label: string; icon: string }> = [
  { key: 'email', label: 'Correo', icon: 'mdi-email-outline' },
  { key: 'push', label: 'App móvil', icon: 'mdi-cellphone' },
]

function set(category: NotificationCategory, channel: NotificationChannel, value: boolean) {
  emit('update:modelValue', {
    ...props.modelValue,
    [category]: { ...props.modelValue[category], [channel]: value },
  })
}
</script>

<template>
  <div class="overflow-hidden rounded-xl border border-neutral-200 dark:border-white/10">
    <table class="w-full text-sm">
      <thead class="bg-neutral-50 text-xs text-neutral-500 dark:bg-white/4 dark:text-neutral-400">
        <tr>
          <th scope="col" class="px-4 py-2.5 text-left font-medium">Aviso</th>
          <th v-for="channel in channels" :key="channel.key" scope="col" class="w-20 px-2 py-2.5 text-center font-medium sm:w-24">
            <i class="mdi mr-1 hidden sm:inline" :class="channel.icon" aria-hidden="true" />{{ channel.label }}
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-neutral-100 dark:divide-white/6">
        <tr v-for="category in categories" :key="category">
          <th scope="row" class="px-4 py-3 text-left font-normal">
            <span class="flex items-start gap-3">
              <i class="mdi mt-0.5 text-lg text-neutral-400" :class="NOTIFICATION_CATEGORY_ICONS[category]" aria-hidden="true" />
              <span>
                <span class="block font-medium text-neutral-800 dark:text-neutral-100">{{ NOTIFICATION_CATEGORY_LABELS[category] }}</span>
                <span class="block text-xs text-neutral-500 dark:text-neutral-400">{{ NOTIFICATION_CATEGORY_DESCRIPTIONS[category] }}</span>
              </span>
            </span>
          </th>
          <td v-for="channel in channels" :key="channel.key" class="px-2 py-3 text-center">
            <span class="relative inline-flex">
              <input
                type="checkbox"
                role="switch"
                class="peer h-5 w-9 cursor-pointer appearance-none rounded-full bg-neutral-300 transition-colors checked:bg-mint-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white/15 dark:checked:bg-mint-400"
                :aria-label="`${NOTIFICATION_CATEGORY_LABELS[category]} por ${channel.label.toLowerCase()}`"
                :checked="modelValue[category][channel.key]"
                :disabled="disabled"
                @change="set(category, channel.key, ($event.target as HTMLInputElement).checked)"
              />
              <span class="pointer-events-none absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" aria-hidden="true" />
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
