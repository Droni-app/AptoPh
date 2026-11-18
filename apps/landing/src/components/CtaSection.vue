<script setup lang="ts">
import { ArrowRight } from '@lucide/vue'
import { TRIAL_DAYS } from '@aptoph/shared'
import { art } from '@/art'
import { links } from '@/links'
</script>

<template>
  <section class="px-4 pb-20 sm:px-6 sm:pb-28" aria-labelledby="cta-title">
    <div class="relative mx-auto max-w-[90rem] overflow-hidden rounded-[2.5rem] bg-brand-800">
      <img
        :src="art.ctaNoche.src"
        :srcset="art.ctaNoche.srcset"
        sizes="100vw"
        :width="art.ctaNoche.width"
        :height="art.ctaNoche.height"
        alt=""
        class="absolute inset-0 size-full object-cover object-[75%_center]"
        loading="lazy"
        decoding="async"
      />
      <div
        class="absolute inset-0 bg-linear-to-r from-brand-800 via-brand-800/80 to-brand-800/0 md:via-brand-800/40"
        aria-hidden="true"
      />
      <div class="relative container-page py-16 sm:py-24 lg:py-28">
        <div class="max-w-xl">
          <h2 id="cta-title" class="heading-section text-white">
            Empieza hoy a administrar tu conjunto con AptoPH
          </h2>
          <p class="mt-5 text-lg leading-relaxed text-brand-100">
            Crea la cuenta de tu conjunto y úsalo gratis durante {{ TRIAL_DAYS }} días, sin tarjeta.
            ¿Prefieres que te lo mostremos? Agenda una demostración.
          </p>
          <div class="mt-9 flex flex-col gap-3 sm:flex-row">
            <a :href="links.signup" class="btn-mint btn-lg">
              Empezar prueba gratis
              <ArrowRight class="size-4.5" aria-hidden="true" />
            </a>
            <a
              :href="links.demo"
              class="btn btn-lg text-white ring-1 ring-white/30 hover:bg-white/10 focus-visible:outline-white"
            >
              Solicitar una demostración
            </a>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
