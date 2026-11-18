<script setup lang="ts">
import { Plus } from '@lucide/vue'
import { art } from '@/art'
import { faqs } from '@/content'
import { links } from '@/links'
</script>

<template>
  <section id="preguntas" class="py-20 sm:py-28" aria-labelledby="faq-title">
    <div class="container-page grid gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16">
      <div class="lg:sticky lg:top-28 lg:self-start">
        <h2 id="faq-title" class="heading-section">Lo que suelen preguntarnos</h2>
        <p class="lead mt-5">
          ¿Tienes otra pregunta?
          <a
            :href="`mailto:${links.email}`"
            class="font-semibold text-mint-700 underline decoration-mint-300 decoration-2 underline-offset-4 hover:decoration-mint-600"
            >Escríbenos</a
          >
          y te respondemos.
        </p>
        <img
          :src="art.sinResultados.src"
          :width="art.sinResultados.width"
          :height="art.sinResultados.height"
          alt=""
          class="mt-8 hidden w-64 lg:block"
          loading="lazy"
          decoding="async"
        />
      </div>

      <!-- Native <details>: works without JavaScript and the answers stay in the HTML -->
      <div class="space-y-3">
        <details
          v-for="faq in faqs"
          :key="faq.question"
          class="group rounded-[1.5rem] bg-white px-6 ring-1 ring-brand-900/5 open:ring-mint-300"
        >
          <summary
            class="flex cursor-pointer list-none items-start justify-between gap-6 py-5 marker:hidden focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-700 [&::-webkit-details-marker]:hidden"
          >
            <h3 class="text-lg font-bold">{{ faq.question }}</h3>
            <span
              class="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-cream text-brand-600 transition-transform group-open:rotate-45 group-open:bg-mint-400 group-open:text-ink"
            >
              <Plus class="size-4" stroke-width="2.5" aria-hidden="true" />
            </span>
          </summary>
          <p class="pr-10 pb-6 leading-relaxed text-slate">{{ faq.answer }}</p>
        </details>
      </div>
    </div>
  </section>
</template>
