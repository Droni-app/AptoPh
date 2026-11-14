<script setup lang="ts">
import { Building2, Repeat } from '@lucide/vue'
import { channels } from '@/content'
</script>

<template>
  <section
    class="relative overflow-hidden bg-navy-900 py-20 text-white sm:py-28"
    aria-labelledby="platform-title"
  >
    <div
      class="pointer-events-none absolute -bottom-48 -left-24 size-[32rem] rounded-full bg-teal-500/15 blur-3xl"
      aria-hidden="true"
    />
    <div class="container-page relative grid gap-14 lg:grid-cols-2 lg:items-center">
      <div>
        <p class="text-sm font-semibold tracking-wide text-teal-400 uppercase">Una plataforma</p>
        <h2 id="platform-title" class="mt-3 text-3xl font-semibold sm:text-4xl">
          En el computador de la administración y en el celular de cada residente
        </h2>
        <p class="mt-4 text-lg text-navy-200">
          Todos los canales trabajan sobre la misma información. Lo que registra portería lo ve el
          residente, y lo que reporta el residente le llega a la administración.
        </p>

        <div class="mt-10 rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
          <h3 class="flex items-center gap-2 text-lg font-semibold">
            <Repeat class="size-5 text-teal-400" aria-hidden="true" />
            ¿Administras varios conjuntos?
          </h3>
          <p class="mt-2 text-navy-200">
            Con una sola cuenta cambias de copropiedad sin cerrar sesión. Cada conjunto mantiene su
            información aislada, su equipo y sus residentes.
          </p>
          <div class="mt-5 flex flex-wrap gap-2" aria-hidden="true">
            <span
              v-for="name in ['Reservas del Bosque', 'Torres de la Sabana', 'Edificio Mirador']"
              :key="name"
              class="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs text-navy-100"
            >
              <Building2 class="size-3.5 text-teal-400" />
              {{ name }}
            </span>
          </div>
        </div>
      </div>

      <ul class="grid gap-4">
        <li
          v-for="channel in channels"
          :key="channel.title"
          class="flex gap-5 rounded-2xl bg-white p-6 text-navy-900"
        >
          <span
            class="grid size-12 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700"
          >
            <component :is="channel.icon" class="size-6" aria-hidden="true" />
          </span>
          <div>
            <h3 class="text-lg font-semibold">{{ channel.title }}</h3>
            <p class="mt-1 text-sm text-navy-600">{{ channel.description }}</p>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>
