<script setup lang="ts">
import {
  Building2,
  CalendarCheck,
  DoorOpen,
  LayoutDashboard,
  Megaphone,
  Package,
  Wallet,
  Wrench,
} from '@lucide/vue'

// Illustrative only (decorative): sample figures, not real data
const menu = [
  { icon: LayoutDashboard, label: 'Inicio', active: true },
  { icon: Building2, label: 'Unidades' },
  { icon: Wallet, label: 'Cartera' },
  { icon: CalendarCheck, label: 'Reservas' },
  { icon: Wrench, label: 'PQRS' },
  { icon: DoorOpen, label: 'Portería' },
]

const kpis = [
  { label: 'Recaudo del mes', value: '86%', bar: 86 },
  { label: 'Unidades al día', value: '214', bar: 72 },
  { label: 'PQRS abiertas', value: '7', bar: 18 },
]

const activity = [
  { icon: Wallet, text: 'Pago confirmado · Apto 302 · Torre 2', time: 'Hace 5 min' },
  { icon: CalendarCheck, text: 'Reserva aprobada · Salón social', time: 'Hace 12 min' },
  { icon: Package, text: 'Paquete recibido · Apto 1104', time: 'Hace 20 min' },
  { icon: Megaphone, text: 'Circular publicada · Mantenimiento', time: 'Hace 1 h' },
]
</script>

<template>
  <div
    class="relative overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 shadow-navy-900/15 ring-navy-900/10"
    aria-hidden="true"
  >
    <div class="flex items-center gap-1.5 border-b border-navy-100 bg-navy-50/60 px-4 py-3">
      <span class="size-2.5 rounded-full bg-navy-200" />
      <span class="size-2.5 rounded-full bg-navy-200" />
      <span class="size-2.5 rounded-full bg-navy-200" />
      <span
        class="ml-3 rounded-md bg-white px-3 py-1 text-[11px] text-navy-400 ring-1 ring-navy-100"
      >
        web.aptoph.com
      </span>
    </div>

    <div class="flex">
      <div class="hidden w-40 shrink-0 flex-col gap-1 bg-navy-900 p-3 sm:flex">
        <div
          v-for="item in menu"
          :key="item.label"
          class="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs"
          :class="item.active ? 'bg-white/10 text-white' : 'text-navy-200'"
        >
          <component :is="item.icon" class="size-4" :class="item.active ? 'text-teal-400' : ''" />
          {{ item.label }}
        </div>
      </div>

      <div class="min-w-0 flex-1 space-y-4 p-4 sm:p-5">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-[11px] text-navy-400">Conjunto Reservas del Bosque</p>
            <p class="font-display text-base font-semibold">Resumen de noviembre</p>
          </div>
          <span class="rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-semibold text-teal-700">
            En línea
          </span>
        </div>

        <div class="grid grid-cols-3 gap-3">
          <div v-for="kpi in kpis" :key="kpi.label" class="rounded-xl bg-navy-50/70 p-3">
            <p class="text-[10px] leading-tight text-navy-500">{{ kpi.label }}</p>
            <p class="mt-1 font-display text-lg font-semibold">{{ kpi.value }}</p>
            <div class="mt-2 h-1.5 rounded-full bg-navy-100">
              <div class="h-1.5 rounded-full bg-teal-500" :style="{ width: `${kpi.bar}%` }" />
            </div>
          </div>
        </div>

        <ul class="divide-y divide-navy-100 rounded-xl ring-1 ring-navy-100">
          <li v-for="item in activity" :key="item.text" class="flex items-center gap-3 px-3 py-2.5">
            <span
              class="grid size-7 shrink-0 place-items-center rounded-lg bg-teal-50 text-teal-700"
            >
              <component :is="item.icon" class="size-3.5" />
            </span>
            <span class="min-w-0 flex-1 truncate text-xs text-navy-700">{{ item.text }}</span>
            <span class="hidden text-[10px] text-navy-400 sm:inline">{{ item.time }}</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
