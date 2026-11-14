<script setup lang="ts">
import { steps } from '@/content'
</script>

<template>
  <section id="como-funciona" class="py-20 sm:py-28" aria-labelledby="steps-title">
    <div class="container-page">
      <div class="mx-auto max-w-2xl text-center">
        <p class="eyebrow">Cómo funciona</p>
        <h2 id="steps-title" class="mt-3 text-3xl font-semibold sm:text-4xl">
          Tu conjunto en marcha en tres pasos
        </h2>
      </div>

      <ol class="mt-14 grid gap-8 md:grid-cols-3">
        <li v-for="(step, index) in steps" :key="step.title" class="relative">
          <div
            v-if="index < steps.length - 1"
            class="absolute top-6 left-16 hidden h-px w-[calc(100%-3rem)] bg-linear-to-r from-teal-500 to-navy-100 md:block"
            aria-hidden="true"
          />
          <span
            class="relative grid size-12 place-items-center rounded-2xl bg-navy-900 font-display text-xl font-semibold text-teal-400"
          >
            {{ index + 1 }}
          </span>
          <h3 class="mt-6 text-xl font-semibold">{{ step.title }}</h3>
          <p class="mt-2 leading-relaxed text-navy-600">{{ step.description }}</p>
        </li>
      </ol>
    </div>
  </section>
</template>
