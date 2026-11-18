<script setup lang="ts">
import { ArrowRight } from '@lucide/vue'
import { TRIAL_DAYS } from '@aptoph/shared'
import { art } from '@/art'
import { steps } from '@/content'
import { links } from '@/links'
</script>

<template>
  <section id="como-funciona" class="py-20 sm:py-28" aria-labelledby="steps-title">
    <div
      class="container-page grid gap-12 lg:grid-cols-[1fr_1.35fr] lg:items-center lg:gap-20 [&>*]:min-w-0"
    >
      <div>
        <h2 id="steps-title" class="heading-section">Tu conjunto en marcha en tres pasos</h2>
        <p class="lead mt-5">
          No necesitas instalar nada ni contratar a nadie. Si prefieres, te acompañamos en la
          configuración inicial y migramos tus datos sin costo.
        </p>
        <img
          :src="art.bienvenida.src"
          :width="art.bienvenida.width"
          :height="art.bienvenida.height"
          alt=""
          class="mt-8 hidden w-72 lg:block"
          loading="lazy"
          decoding="async"
        />
      </div>

      <div>
        <!-- A real sequence, so the steps are numbered and joined by a line -->
        <div class="relative">
          <span
            class="absolute top-6 bottom-6 left-6 w-0.5 bg-linear-to-b from-mint-400 to-brand-100"
            aria-hidden="true"
          />
          <ol class="relative space-y-8">
            <li v-for="(step, index) in steps" :key="step.title" class="relative flex gap-6">
              <span
                class="relative grid size-12 shrink-0 place-items-center rounded-full bg-brand-700 font-display text-xl font-extrabold text-white ring-8 ring-cream"
                aria-hidden="true"
              >
                {{ index + 1 }}
              </span>
              <div class="pt-2">
                <h3 class="text-xl font-bold">{{ step.title }}</h3>
                <p class="mt-2 text-slate">{{ step.description }}</p>
              </div>
            </li>
          </ol>
        </div>
        <a :href="links.signup" class="btn-primary btn-lg mt-10 sm:ml-18">
          Crear la cuenta de mi conjunto
          <ArrowRight class="size-4.5" aria-hidden="true" />
        </a>
        <p class="mt-3 text-sm text-slate sm:ml-18">{{ TRIAL_DAYS }} días gratis, sin tarjeta.</p>
      </div>
    </div>
  </section>
</template>
