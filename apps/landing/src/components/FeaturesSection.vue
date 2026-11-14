<script setup lang="ts">
import { Check, Sparkles } from '@lucide/vue'
import { features, upcoming } from '@/content'
</script>

<template>
  <section
    id="funcionalidades"
    class="bg-navy-50/50 py-20 sm:py-28"
    aria-labelledby="features-title"
  >
    <div class="container-page">
      <div class="max-w-2xl">
        <p class="eyebrow">Funcionalidades</p>
        <h2 id="features-title" class="mt-3 text-3xl font-semibold sm:text-4xl">
          Todo lo que necesita la administración de una copropiedad
        </h2>
        <p class="mt-4 text-lg text-navy-600">
          Nueve módulos conectados entre sí. Por ejemplo, una reserva que genera un cobro aparece en
          el estado de cuenta de la unidad, y el pago se aplica a esa deuda.
        </p>
      </div>

      <div class="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <article
          v-for="feature in features"
          :id="feature.id"
          :key="feature.id"
          class="flex flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-navy-100 transition-shadow hover:shadow-md"
        >
          <span class="grid size-11 place-items-center rounded-xl bg-navy-900 text-teal-400">
            <component :is="feature.icon" class="size-5" aria-hidden="true" />
          </span>
          <h3 class="mt-5 text-lg font-semibold">{{ feature.title }}</h3>
          <p class="mt-2 text-sm leading-relaxed text-navy-600">{{ feature.summary }}</p>
          <ul class="mt-5 space-y-2.5 border-t border-navy-100 pt-5 text-sm text-navy-700">
            <li v-for="point in feature.points" :key="point" class="flex gap-2.5">
              <Check class="mt-0.5 size-4 shrink-0 text-teal-600" aria-hidden="true" />
              <span>{{ point }}</span>
            </li>
          </ul>
        </article>
      </div>

      <div class="mt-12 rounded-2xl border border-dashed border-navy-200 bg-white/60 p-6 sm:p-8">
        <h3 class="flex items-center gap-2 text-lg font-semibold">
          <Sparkles class="size-5 text-teal-600" aria-hidden="true" />
          Próximamente
        </h3>
        <ul class="mt-5 grid gap-6 sm:grid-cols-3">
          <li v-for="item in upcoming" :key="item.title">
            <p class="font-semibold">{{ item.title }}</p>
            <p class="mt-1 text-sm text-navy-600">{{ item.description }}</p>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>
