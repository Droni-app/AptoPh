<script setup lang="ts">
import { computed } from 'vue'
import { BOOKING_STATUS_LABELS, type Booking } from '@aptoph/shared'
import { bookedFor, formatTime } from '@/lib/amenities'

/**
 * The booking calendar: a week with time slots or a month with the day's
 * bookings. Times are Bogotá's (UTC−5, no daylight saving).
 */
const props = defineProps<{
  bookings: Booking[]
  view: 'week' | 'month'
  /** First day shown (YYYY-MM-DD): Monday of the week, or the 1st of the month */
  start: string
  today: string
}>()
const emit = defineEmits<{ select: [booking: Booking]; create: [date: string, hour: number] }>()

const OFFSET_MS = -5 * 3_600_000
const HOUR_PX = 44

/** Local date and minutes since midnight of an instant */
function local(iso: string) {
  const shifted = new Date(new Date(iso).getTime() + OFFSET_MS)
  return {
    date: shifted.toISOString().slice(0, 10),
    minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  }
}
const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
const weekdayOf = (date: string) => (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7
const dayNames = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom']

/** A booking cut to one day of the grid */
type Piece = {
  booking: Booking
  date: string
  from: number
  to: number
  cleanTo: number
  lane: number
  lanes: number
}

function piecesOf(booking: Booking): Piece[] {
  const start = local(booking.startsAt)
  const end = local(booking.endsAt)
  const clean = local(booking.blockedUntil)
  const pieces: Piece[] = []
  let date = start.date
  for (let guard = 0; guard < 40; guard++) {
    const first = date === start.date
    const last = date === end.date || (end.minutes === 0 && addDays(date, 1) === end.date)
    const to = last ? (end.date === date ? end.minutes : 1440) : 1440
    const cleanTo = clean.date === date ? clean.minutes : clean.date > date ? 1440 : to
    pieces.push({
      booking,
      date,
      from: first ? start.minutes : 0,
      to,
      cleanTo: Math.max(to, last ? cleanTo : to),
      lane: 0,
      lanes: 1,
    })
    if (last) break
    date = addDays(date, 1)
  }
  return pieces
}

const days = computed(() => {
  const count = props.view === 'week' ? 7 : 42
  return Array.from({ length: count }, (_, i) => addDays(props.start, i))
})

/** Pieces of each day, with side-by-side lanes when they overlap */
const byDay = computed(() => {
  const map = new Map<string, Piece[]>()
  for (const booking of props.bookings) {
    for (const piece of piecesOf(booking)) {
      const list = map.get(piece.date) ?? []
      list.push(piece)
      map.set(piece.date, list)
    }
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.from - b.from || b.to - a.to)
    const ends: number[] = []
    for (const piece of list) {
      let lane = ends.findIndex((end) => end <= piece.from)
      if (lane < 0) lane = ends.push(0) - 1
      ends[lane] = piece.cleanTo
      piece.lane = lane
    }
    for (const piece of list) piece.lanes = Math.max(1, ends.length)
  }
  return map
})

/** Hours shown in the week: 6:00 to midnight, more if something is earlier */
const firstHour = computed(() => {
  let min = 6
  for (const list of byDay.value.values()) {
    for (const piece of list) min = Math.min(min, Math.floor(piece.from / 60))
  }
  return min
})
const hours = computed(() =>
  Array.from({ length: 24 - firstHour.value }, (_, i) => firstHour.value + i),
)
const hourLabel = (hour: number) =>
  `${hour % 12 === 0 ? 12 : hour % 12} ${hour < 12 ? 'a. m.' : 'p. m.'}`

function style(piece: Piece) {
  const top = ((piece.from - firstHour.value * 60) / 60) * HOUR_PX
  const height = Math.max(((piece.to - piece.from) / 60) * HOUR_PX, 18)
  const clean = ((piece.cleanTo - piece.to) / 60) * HOUR_PX
  const width = 100 / piece.lanes
  return {
    top: `${top}px`,
    height: `${height}px`,
    left: `calc(${piece.lane * width}% + 2px)`,
    width: `calc(${width}% - 4px)`,
    '--clean': `${clean}px`,
    '--color': piece.booking.amenity.color ?? '#64748b',
  }
}

const isBlock = (booking: Booking) => booking.bookingType === 'block'
const label = (booking: Booking) =>
  `${booking.amenity.name}, ${bookedFor(booking)}, ${formatTime(booking.startsAt)} a ${formatTime(booking.endsAt)}, ${BOOKING_STATUS_LABELS[booking.status]}`
const monthOf = (date: string) => date.slice(0, 7)
const currentMonth = computed(() => addDays(props.start, 10).slice(0, 7))
</script>

<template>
  <!-- Week -->
  <div
    v-if="view === 'week'"
    class="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-white/10 dark:bg-neutral-900"
  >
    <div class="min-w-[760px]">
      <div
        class="sticky top-0 z-10 grid grid-cols-[3.5rem_repeat(7,1fr)] border-b border-neutral-200 bg-white dark:border-white/10 dark:bg-neutral-900"
      >
        <div />
        <div
          v-for="(date, i) in days"
          :key="date"
          class="border-l border-neutral-100 px-2 py-2 text-center dark:border-white/6"
        >
          <p class="text-xs text-neutral-500 uppercase">{{ dayNames[i] }}</p>
          <p
            class="mx-auto mt-0.5 grid size-7 place-items-center rounded-full text-sm font-semibold"
            :class="date === today ? 'bg-brand-700 text-white' : ''"
          >
            {{ Number(date.slice(8)) }}
          </p>
        </div>
      </div>
      <div class="grid grid-cols-[3.5rem_repeat(7,1fr)]">
        <div>
          <div
            v-for="hour in hours"
            :key="hour"
            class="relative pr-2 text-right text-[0.65rem] text-neutral-400"
            :style="{ height: `${HOUR_PX}px` }"
          >
            <span class="relative -top-2">{{ hourLabel(hour) }}</span>
          </div>
        </div>
        <div
          v-for="date in days"
          :key="date"
          class="relative border-l border-neutral-100 dark:border-white/6"
          :class="date === today && 'bg-brand-50/40 dark:bg-brand-500/5'"
        >
          <button
            v-for="hour in hours"
            :key="hour"
            type="button"
            class="block w-full border-b border-neutral-100 hover:bg-neutral-50 focus-visible:bg-neutral-100 focus-visible:outline-none dark:border-white/5 dark:hover:bg-white/4"
            :style="{ height: `${HOUR_PX}px` }"
            :aria-label="`Reservar el ${date} a las ${hourLabel(hour)}`"
            @click="emit('create', date, hour)"
          />
          <button
            v-for="piece in byDay.get(date) ?? []"
            :key="`${piece.booking.id}-${piece.date}`"
            type="button"
            class="amenity-booking absolute rounded-md px-1.5 py-1 text-left text-[0.7rem] leading-tight shadow-sm transition hover:z-20 hover:shadow-md focus-visible:z-20 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
            :class="[
              isBlock(piece.booking) ? 'blocked' : '',
              piece.booking.status === 'pending' ? 'pending' : '',
            ]"
            :style="style(piece)"
            :aria-label="label(piece.booking)"
            @click="emit('select', piece.booking)"
          >
            <span class="block truncate font-semibold">
              <i
                v-if="piece.booking.status === 'pending'"
                class="mdi mdi-clock-outline"
                aria-hidden="true"
              />
              <i v-if="isBlock(piece.booking)" class="mdi mdi-wrench-outline" aria-hidden="true" />
              {{ piece.booking.amenity.name }}
            </span>
            <span class="block truncate opacity-80">{{ bookedFor(piece.booking) }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Month -->
  <div
    v-else
    class="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-white/10 dark:bg-neutral-900"
  >
    <div class="grid grid-cols-7 border-b border-neutral-200 dark:border-white/10">
      <p
        v-for="name in dayNames"
        :key="name"
        class="py-2 text-center text-xs text-neutral-500 uppercase"
      >
        {{ name }}
      </p>
    </div>
    <div class="grid grid-cols-7">
      <div
        v-for="date in days"
        :key="date"
        class="min-h-28 border-b border-l border-neutral-100 p-1.5 first:border-l-0 dark:border-white/6"
        :class="[
          monthOf(date) !== currentMonth && 'bg-neutral-50/60 dark:bg-white/2',
          weekdayOf(date) === 0 && 'border-l-0',
        ]"
      >
        <button
          type="button"
          class="mb-1 grid size-6 place-items-center rounded-full text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-white/8"
          :class="[
            date === today && 'bg-brand-700 text-white hover:bg-brand-800',
            monthOf(date) !== currentMonth && 'text-neutral-400',
          ]"
          :aria-label="`Reservar el ${date}`"
          @click="emit('create', date, 10)"
        >
          {{ Number(date.slice(8)) }}
        </button>
        <ul class="space-y-0.5">
          <li v-for="piece in (byDay.get(date) ?? []).slice(0, 3)" :key="piece.booking.id">
            <button
              type="button"
              class="flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[0.7rem] hover:bg-neutral-100 dark:hover:bg-white/6"
              :aria-label="label(piece.booking)"
              @click="emit('select', piece.booking)"
            >
              <span
                class="size-2 shrink-0 rounded-full"
                :class="piece.booking.status === 'pending' && 'ring-2 ring-amber-400'"
                :style="{ background: piece.booking.amenity.color ?? '#64748b' }"
                aria-hidden="true"
              />
              <span class="truncate">
                {{ piece.from ? formatTime(piece.booking.startsAt) : '' }}
                {{ piece.booking.amenity.name }}
              </span>
            </button>
          </li>
          <li
            v-if="(byDay.get(date)?.length ?? 0) > 3"
            class="px-1 text-[0.65rem] text-neutral-500"
          >
            + {{ (byDay.get(date)?.length ?? 0) - 3 }} más
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style>
.amenity-booking {
  background: color-mix(in srgb, var(--color) 16%, white);
  color: color-mix(in srgb, var(--color) 70%, black);
  border-left: 3px solid var(--color);
  overflow: visible;
}
.dark .amenity-booking {
  background: color-mix(in srgb, var(--color) 28%, #0f172a);
  color: color-mix(in srgb, var(--color) 35%, white);
}
/* Cleaning time after the booking */
.amenity-booking::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 100%;
  height: var(--clean);
  background: repeating-linear-gradient(
    45deg,
    color-mix(in srgb, var(--color) 18%, transparent) 0 4px,
    transparent 4px 8px
  );
}
.amenity-booking.pending {
  border-left-style: dashed;
  background: repeating-linear-gradient(
    -45deg,
    color-mix(in srgb, var(--color) 12%, white) 0 6px,
    color-mix(in srgb, var(--color) 20%, white) 6px 12px
  );
}
.dark .amenity-booking.pending {
  background: repeating-linear-gradient(
    -45deg,
    color-mix(in srgb, var(--color) 18%, #0f172a) 0 6px,
    color-mix(in srgb, var(--color) 28%, #0f172a) 6px 12px
  );
}
.amenity-booking.blocked {
  --color: #64748b;
  background: repeating-linear-gradient(45deg, #e2e8f0 0 6px, #f1f5f9 6px 12px);
  color: #334155;
}
.dark .amenity-booking.blocked {
  background: repeating-linear-gradient(45deg, #1e293b 0 6px, #273449 6px 12px);
  color: #cbd5e1;
}
</style>
