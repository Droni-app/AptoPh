<script setup lang="ts">
import { ChevronRight } from '@lucide/vue'
import { profiles } from '@/content'
</script>

<template>
  <section id="perfiles" class="py-20 sm:py-28" aria-labelledby="profiles-title">
    <div class="container-page">
      <div class="max-w-2xl">
        <p class="eyebrow">Para quién</p>
        <h2 id="profiles-title" class="mt-3 text-3xl font-semibold sm:text-4xl">
          Cada persona del conjunto, con las herramientas de su rol
        </h2>
        <p class="mt-4 text-lg text-navy-600">
          Una misma persona puede tener varios perfiles. Por ejemplo, un propietario que además es
          miembro del consejo entra con una sola cuenta.
        </p>
      </div>

      <!-- 6-column grid on desktop: 3 cards on the first row, 2 wider ones on the second -->
      <div class="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-6">
        <article
          v-for="(profile, index) in profiles"
          :key="profile.role"
          class="rounded-2xl p-6 ring-1"
          :class="[
            index < 3 ? 'lg:col-span-2' : 'lg:col-span-3',
            index === profiles.length - 1
              ? 'bg-navy-900 text-white ring-navy-900 sm:col-span-2'
              : 'bg-white ring-navy-100',
          ]"
        >
          <span
            class="grid size-11 place-items-center rounded-xl"
            :class="
              index === profiles.length - 1
                ? 'bg-teal-500 text-navy-950'
                : 'bg-teal-50 text-teal-700'
            "
          >
            <component :is="profile.icon" class="size-5" aria-hidden="true" />
          </span>
          <h3 class="mt-5 text-lg font-semibold">{{ profile.role }}</h3>
          <p
            class="mt-2 text-sm leading-relaxed"
            :class="index === profiles.length - 1 ? 'text-navy-200' : 'text-navy-600'"
          >
            {{ profile.pitch }}
          </p>
          <ul class="mt-5 space-y-2 text-sm">
            <li v-for="item in profile.can" :key="item" class="flex gap-2">
              <ChevronRight
                class="mt-0.5 size-4 shrink-0"
                :class="index === profiles.length - 1 ? 'text-teal-400' : 'text-teal-600'"
                aria-hidden="true"
              />
              <span>{{ item }}</span>
            </li>
          </ul>
        </article>
      </div>
    </div>
  </section>
</template>
