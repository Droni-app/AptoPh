<script setup lang="ts">
import { ArrowRight, Check } from '@lucide/vue'
import ProductMockup from './ProductMockup.vue'
import { links } from '@/links'

const highlights = [
  'Cartera, pagos y cuotas por coeficiente',
  'Reservas, PQRS, portería y paquetes',
  'Web para el equipo y app para residentes',
]
</script>

<template>
  <section id="inicio" class="relative overflow-hidden" aria-labelledby="hero-title">
    <!-- Decorative background: blueprint grid + teal glow -->
    <div
      class="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,var(--color-navy-50)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-navy-50)_1px,transparent_1px)] mask-[radial-gradient(ellipse_at_top,black_30%,transparent_75%)] bg-size-[44px_44px]"
      aria-hidden="true"
    />
    <div
      class="pointer-events-none absolute -top-40 right-0 -z-10 size-[36rem] rounded-full bg-teal-300/25 blur-3xl"
      aria-hidden="true"
    />

    <div
      class="container-page grid items-center gap-14 pt-14 pb-20 sm:pt-20 lg:grid-cols-[1.05fr_1fr] lg:pb-28"
    >
      <div>
        <p class="eyebrow">Software para propiedad horizontal</p>
        <h1
          id="hero-title"
          class="mt-4 text-4xl leading-[1.08] font-semibold sm:text-5xl lg:text-[3.4rem]"
        >
          Administra tu conjunto residencial
          <span class="text-teal-700">sin papeles ni hojas de cálculo</span>
        </h1>
        <p class="mt-6 max-w-xl text-lg leading-relaxed text-navy-600">
          AptoPH reúne la administración de conjuntos residenciales y edificios en una sola
          plataforma: cuotas de administración, pagos, zonas comunes, PQRS, portería y documentos.
          La administración, el consejo y los residentes trabajan con la misma información.
        </p>

        <div class="mt-8 flex flex-col gap-3 sm:flex-row">
          <a :href="links.demo" class="btn-primary px-6 py-3.5 text-base">
            Solicitar una demostración
            <ArrowRight class="size-4" aria-hidden="true" />
          </a>
          <a href="#demo" class="btn-ghost px-6 py-3.5 text-base">
            Probar la demo
          </a>
        </div>

        <ul class="mt-10 grid gap-3 text-sm text-navy-700 sm:grid-cols-1">
          <li v-for="item in highlights" :key="item" class="flex items-center gap-2.5">
            <span class="grid size-5 place-items-center rounded-full bg-teal-500 text-navy-950">
              <Check class="size-3.5" stroke-width="3" aria-hidden="true" />
            </span>
            {{ item }}
          </li>
        </ul>
      </div>

      <div class="relative">
        <ProductMockup />
      </div>
    </div>
  </section>
</template>
