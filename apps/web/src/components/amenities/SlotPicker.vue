<script setup lang="ts">
import { computed, watch } from 'vue'
import { UiInput, UiLabel, UiSelect } from '@aptoph/ui'
import type { Amenity } from '@aptoph/shared'

/**
 * Chooses the time of a booking according to the area's mode: hour slots,
 * whole days or shifts. What is taken (with its cleaning time) is disabled.
 * Times are Bogotá's (UTC−5). Shared by the backoffice and the portal.
 */
export type BusySlot = { startsAt: string; blockedUntil: string; isBlock?: boolean }
export type SlotValue =
  | { startsAt: string; endsAt: string }
  | { date: string; days: number }
  | { date: string; shiftIds: string[] }
  | null

const props = defineProps<{ amenity: Amenity; busy: BusySlot[]; min: string; max?: string }>()
const date = defineModel<string>('date', { required: true })
const value = defineModel<SlotValue>({ required: true })
const hourRange = defineModel<{ from: number | null; to: number | null }>('range', {
  default: () => ({ from: null, to: null }),
})

const rules = computed(() => props.amenity.rules)
const mode = computed(() => props.amenity.bookingMode)
const buffer = computed(() => (rules.value.bufferMinutes ?? 0) * 60_000)

const toMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number)
  return h! * 60 + m!
}
const pad = (n: number) => String(n).padStart(2, '0')
/** ISO instant of a local date plus minutes (may pass midnight) */
function instant(day: string, minutes: number) {
  const base = new Date(`${day}T00:00:00-05:00`).getTime()
  return new Date(base + minutes * 60_000)
}
const clock = (minutes: number) => {
  const m = ((minutes % 1440) + 1440) % 1440
  const h = Math.floor(m / 60)
  return `${h % 12 === 0 ? 12 : h % 12}:${pad(m % 60)} ${h < 12 ? 'a. m.' : 'p. m.'}`
}

function taken(start: Date, end: Date) {
  const s = start.getTime()
  const e = end.getTime() + buffer.value
  return props.busy.some(
    (b) => new Date(b.startsAt).getTime() < e && new Date(b.blockedUntil).getTime() > s,
  )
}

const weekday = computed(() => {
  const names = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
  return names[new Date(`${date.value}T12:00:00-05:00`).getUTCDay()]!
})
const closed = computed(() => (rules.value.closedOn ?? []).includes(weekday.value as never))

/* ---------- Hours ---------- */
const step = computed(() => rules.value.slotMinutes ?? 60)
const slots = computed(() => {
  const open = toMinutes(rules.value.opensAt ?? '00:00')
  const close = rules.value.closesAt === '24:00' ? 1440 : toMinutes(rules.value.closesAt ?? '24:00')
  const list: Array<{ from: number; busy: boolean; past: boolean }> = []
  const now = Date.now()
  for (let m = open; m + step.value <= close; m += step.value) {
    const start = instant(date.value, m)
    const end = instant(date.value, m + step.value)
    // The cleaning time only counts at the end of the whole booking
    const busy = props.busy.some(
      (b) =>
        new Date(b.startsAt).getTime() < end.getTime() &&
        new Date(b.blockedUntil).getTime() > start.getTime(),
    )
    list.push({ from: m, busy, past: start.getTime() < now })
  }
  return list
})
const maxSlots = computed(() =>
  rules.value.maxHours ? Math.round((rules.value.maxHours * 60) / step.value) : Infinity,
)

function pick(from: number) {
  const r = hourRange.value
  if (r.from === null || r.to !== r.from || from < r.from) {
    hourRange.value = { from, to: from }
    return
  }
  // Second tap: the end, if everything in between is free
  const between = slots.value.filter((s) => s.from >= r.from! && s.from <= from)
  if (between.some((s) => s.busy) || between.length > maxSlots.value) {
    hourRange.value = { from, to: from }
    return
  }
  hourRange.value = { from: r.from, to: from }
}
const selected = (from: number) =>
  hourRange.value.from !== null && from >= hourRange.value.from && from <= hourRange.value.to!
const hoursCount = computed(() =>
  hourRange.value.from === null
    ? 0
    : (hourRange.value.to! - hourRange.value.from + step.value) / 60,
)

/* ---------- Days ---------- */
const days = defineModel<number>('days', { default: 1 })
const dayOptions = computed(() =>
  Array.from({ length: rules.value.maxDays ?? 1 }, (_, i) => ({
    value: i + 1,
    label: i === 0 ? '1 día' : `${i + 1} días`,
  })),
)
const daysTaken = computed(() => {
  if (mode.value !== 'days') return false
  const start = instant(date.value, toMinutes(rules.value.opensAt ?? '00:00'))
  const closeMin =
    rules.value.closesAt === '24:00' ? 1440 : toMinutes(rules.value.closesAt ?? '24:00')
  const end = instant(date.value, (days.value - 1) * 1440 + closeMin)
  return taken(start, end)
})

/* ---------- Shifts ---------- */
const shiftIds = defineModel<string[]>('shifts', { default: () => [] })
const shifts = computed(() =>
  (rules.value.shifts ?? []).map((shift, index) => {
    const from = toMinutes(shift.startsAt)
    let to = shift.endsAt === '24:00' ? 1440 : toMinutes(shift.endsAt)
    if (to <= from) to += 1440
    const start = instant(date.value, from)
    return {
      ...shift,
      index,
      busy: taken(start, instant(date.value, to)),
      past: start.getTime() < Date.now(),
    }
  }),
)
/** A run of consecutive shifts: tapping next to it extends it, elsewhere starts over */
function toggleShift(id: string) {
  const list = shifts.value
  const tapped = list.findIndex((s) => s.id === id)
  const chosen = list.filter((s) => shiftIds.value.includes(s.id)).map((s) => s.index)
  const first = Math.min(...chosen)
  const last = Math.max(...chosen)
  let next: number[]
  if (!chosen.length) next = [tapped]
  else if (chosen.includes(tapped)) {
    next = tapped === first || tapped === last ? chosen.filter((i) => i !== tapped) : [tapped]
  } else if (tapped === first - 1 || tapped === last + 1) next = [...chosen, tapped]
  else next = [tapped]
  shiftIds.value = list.filter((s) => next.includes(s.index)).map((s) => s.id)
}

/* ---------- The value ---------- */
watch(
  [date, hourRange, days, shiftIds, () => props.amenity.id],
  () => {
    if (closed.value) {
      value.value = null
      return
    }
    if (mode.value === 'hours') {
      const r = hourRange.value
      value.value =
        r.from === null
          ? null
          : {
              startsAt: instant(date.value, r.from).toISOString(),
              endsAt: instant(date.value, r.to! + step.value).toISOString(),
            }
    } else if (mode.value === 'days') {
      value.value = { date: date.value, days: days.value }
    } else {
      value.value = shiftIds.value.length
        ? { date: date.value, shiftIds: [...shiftIds.value] }
        : null
    }
  },
  { immediate: true, deep: true },
)
// Another day or area: start over
watch([date, () => props.amenity.id], () => {
  hourRange.value = { from: null, to: null }
  shiftIds.value = []
  if (days.value > (rules.value.maxDays ?? 1)) days.value = 1
})

defineExpose({ clock })
</script>

<template>
  <div class="space-y-3">
    <div class="grid gap-3 sm:grid-cols-2">
      <UiLabel title="Fecha" required>
        <UiInput v-model="date" type="date" :min="min" :max="max" required />
      </UiLabel>
      <UiLabel v-if="mode === 'days'" title="Días">
        <UiSelect v-model="days" :options="dayOptions" block />
      </UiLabel>
    </div>

    <p
      v-if="closed"
      class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300"
    >
      {{ amenity.name }} no abre este día. Elige otra fecha.
    </p>

    <!-- Hours -->
    <div v-else-if="mode === 'hours'">
      <p class="mb-2 text-xs text-neutral-500">
        Toca la hora de inicio y luego la última franja que necesitas.
        <template v-if="rules.minHours">Mínimo {{ rules.minHours }} h.</template>
        <template v-if="rules.maxHours"> Máximo {{ rules.maxHours }} h.</template>
      </p>
      <div
        class="grid grid-cols-3 gap-1.5 sm:grid-cols-4"
        role="group"
        aria-label="Franjas horarias"
      >
        <button
          v-for="slot in slots"
          :key="slot.from"
          type="button"
          class="rounded-lg px-2 py-2 text-xs font-medium ring-1 transition disabled:cursor-not-allowed"
          :class="
            selected(slot.from)
              ? 'bg-brand-700 text-white ring-brand-700'
              : slot.busy
                ? 'bg-neutral-100 text-neutral-400 line-through ring-transparent dark:bg-white/5'
                : slot.past
                  ? 'text-neutral-300 ring-neutral-100 dark:text-neutral-600 dark:ring-white/5'
                  : 'text-neutral-700 ring-neutral-200 hover:bg-brand-50 hover:ring-brand-300 dark:text-neutral-200 dark:ring-white/10 dark:hover:bg-brand-500/10'
          "
          :disabled="slot.busy || slot.past"
          :aria-pressed="selected(slot.from)"
          :aria-label="`${clock(slot.from)}${slot.busy ? ', ocupada' : ''}`"
          @click="pick(slot.from)"
        >
          {{ clock(slot.from) }}
        </button>
      </div>
      <p v-if="!slots.length" class="text-sm text-neutral-500">Sin horario configurado.</p>
      <p v-if="hourRange.from !== null" class="mt-2 text-sm font-medium">
        {{ clock(hourRange.from) }} a {{ clock(hourRange.to! + step) }} ·
        {{ hoursCount === 1 ? '1 hora' : `${hoursCount} horas` }}
      </p>
    </div>

    <!-- Days -->
    <p v-else-if="mode === 'days'" class="text-sm text-neutral-600 dark:text-neutral-300">
      Entrega a las {{ rules.opensAt ?? '00:00' }} del primer día; devolución a las
      {{ rules.closesAt ?? '24:00' }} del último.
      <span v-if="daysTaken" class="mt-1 block font-medium text-red-600 dark:text-red-400">
        Ya hay una reserva en esas fechas.
      </span>
    </p>

    <!-- Shifts -->
    <div v-else>
      <p class="mb-2 text-xs text-neutral-500">Puedes tomar varios turnos seguidos.</p>
      <div class="grid gap-2 sm:grid-cols-3" role="group" aria-label="Turnos">
        <button
          v-for="shift in shifts"
          :key="shift.id"
          type="button"
          class="rounded-xl px-3 py-2.5 text-left ring-1 transition disabled:cursor-not-allowed"
          :class="
            shiftIds.includes(shift.id)
              ? 'bg-brand-700 text-white ring-brand-700'
              : shift.busy || shift.past
                ? 'bg-neutral-100 text-neutral-400 ring-transparent dark:bg-white/5'
                : 'ring-neutral-200 hover:bg-brand-50 hover:ring-brand-300 dark:ring-white/10 dark:hover:bg-brand-500/10'
          "
          :disabled="shift.busy || shift.past"
          :aria-pressed="shiftIds.includes(shift.id)"
          @click="toggleShift(shift.id)"
        >
          <span class="block text-sm font-semibold">{{ shift.name }}</span>
          <span class="block text-xs opacity-80">
            {{ shift.startsAt }} – {{ shift.endsAt }}
            <template v-if="shift.busy"> · ocupado</template>
          </span>
        </button>
      </div>
    </div>
  </div>
</template>
