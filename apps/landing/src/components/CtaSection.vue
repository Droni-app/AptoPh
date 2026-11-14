<script setup lang="ts">
import { ArrowRight, Mail } from '@lucide/vue'
import { links } from '@/links'
</script>

<template>
  <section class="pb-20 sm:pb-28" aria-labelledby="cta-title">
    <div class="container-page">
      <div
        class="relative overflow-hidden rounded-3xl bg-navy-900 px-6 py-14 text-center text-white sm:px-12 sm:py-20"
      >
        <div
          class="pointer-events-none absolute -top-32 left-1/2 size-[30rem] -translate-x-1/2 rounded-full bg-teal-500/20 blur-3xl"
          aria-hidden="true"
        />
        <div class="relative">
          <h2 id="cta-title" class="mx-auto max-w-2xl text-3xl font-semibold sm:text-4xl">
            Lleva la administración de tu conjunto al siguiente nivel
          </h2>
          <p class="mx-auto mt-4 max-w-xl text-lg text-navy-200">
            Te mostramos AptoPH con la estructura de tu copropiedad y resolvemos tus dudas, sin
            compromiso.
          </p>
          <div class="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a :href="links.demo" class="btn-accent px-6 py-3.5 text-base">
              Solicitar una demostración
              <ArrowRight class="size-4" aria-hidden="true" />
            </a>
            <a
              :href="`mailto:${links.email}`"
              class="btn px-6 py-3.5 text-base text-white ring-1 ring-white/25 hover:bg-white/10 focus-visible:outline-white"
            >
              <Mail class="size-4" aria-hidden="true" />
              {{ links.email }}
            </a>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
