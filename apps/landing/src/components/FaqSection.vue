<script setup lang="ts">
import { Plus } from '@lucide/vue'
import { faqs } from '@/content'
</script>

<template>
  <section id="preguntas" class="py-20 sm:py-28" aria-labelledby="faq-title">
    <div class="container-page grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
      <div>
        <p class="eyebrow">Preguntas frecuentes</p>
        <h2 id="faq-title" class="mt-3 text-3xl font-semibold sm:text-4xl">
          Lo que suelen preguntarnos
        </h2>
        <p class="mt-4 text-lg text-navy-600">
          ¿Tienes otra pregunta? Escríbenos y te respondemos.
        </p>
      </div>

      <!-- Native <details>: works without JavaScript and the answers stay in the HTML -->
      <div class="divide-y divide-navy-100 border-y border-navy-100">
        <details v-for="faq in faqs" :key="faq.question" class="group py-5">
          <summary
            class="flex cursor-pointer list-none items-start justify-between gap-6 font-display text-lg font-medium marker:hidden [&::-webkit-details-marker]:hidden"
          >
            <h3>{{ faq.question }}</h3>
            <Plus
              class="mt-1 size-5 shrink-0 text-teal-600 transition-transform group-open:rotate-45"
              aria-hidden="true"
            />
          </summary>
          <p class="mt-3 pr-10 leading-relaxed text-navy-600">{{ faq.answer }}</p>
        </details>
      </div>
    </div>
  </section>
</template>
