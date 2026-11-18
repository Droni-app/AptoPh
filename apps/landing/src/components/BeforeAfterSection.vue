<script setup lang="ts">
import { ArrowRight, Check, X } from '@lucide/vue'
import { TRIAL_DAYS } from '@aptoph/shared'
import { art } from '@/art'
import { beforeAfter } from '@/content'
import { links } from '@/links'
</script>

<template>
  <section class="py-20 sm:py-28" aria-labelledby="antes-despues-title">
    <div class="container-page">
      <div class="max-w-2xl">
        <h2 id="antes-despues-title" class="heading-section">
          Del cuaderno y el chat del conjunto a un panel en orden
        </h2>
        <p class="lead mt-5">
          La administración de una copropiedad no tiene por qué depender de recibos sueltos, hojas
          de cálculo y mensajes que se pierden. Así cambia el día a día con AptoPH.
        </p>
      </div>

      <div class="mt-14 grid gap-6 lg:grid-cols-2">
        <figure class="rounded-[2rem] bg-sand p-3 sm:p-4">
          <img
            :src="art.antes.src"
            :srcset="art.antes.srcset"
            sizes="(min-width: 1024px) 36rem, 100vw"
            :width="art.antes.width"
            :height="art.antes.height"
            alt="Una administradora agobiada entre carpetas, recibos, una calculadora y un celular lleno de mensajes"
            class="aspect-[3/2] w-full rounded-[1.5rem] object-cover saturate-[0.8]"
            loading="lazy"
            decoding="async"
          />
          <figcaption class="px-3 pt-6 pb-4 sm:px-5">
            <p class="font-display text-xl font-bold text-brand-700">Sin una plataforma</p>
            <ul class="mt-4 space-y-3">
              <li v-for="item in beforeAfter.before" :key="item" class="flex gap-3 text-slate">
                <span
                  class="mt-0.5 grid size-5.5 shrink-0 place-items-center rounded-full bg-white text-coral-700"
                >
                  <X class="size-3.5" stroke-width="3" aria-hidden="true" />
                </span>
                {{ item }}
              </li>
            </ul>
          </figcaption>
        </figure>

        <figure class="rounded-[2rem] bg-mint-50 p-3 ring-1 ring-mint-200 sm:p-4">
          <img
            :src="art.despues.src"
            :srcset="art.despues.srcset"
            sizes="(min-width: 1024px) 36rem, 100vw"
            :width="art.despues.width"
            :height="art.despues.height"
            alt="La misma administradora, tranquila, revisa el panel de AptoPH en su portátil"
            class="aspect-[3/2] w-full rounded-[1.5rem] object-cover"
            loading="lazy"
            decoding="async"
          />
          <figcaption class="px-3 pt-6 pb-4 sm:px-5">
            <p class="font-display text-xl font-bold text-brand-700">Con AptoPH</p>
            <ul class="mt-4 space-y-3">
              <li v-for="item in beforeAfter.after" :key="item" class="flex gap-3 text-ink">
                <span
                  class="mt-0.5 grid size-5.5 shrink-0 place-items-center rounded-full bg-mint-400 text-ink"
                >
                  <Check class="size-3.5" stroke-width="3" aria-hidden="true" />
                </span>
                {{ item }}
              </li>
            </ul>
          </figcaption>
        </figure>
      </div>

      <div class="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <a :href="links.signup" class="btn-primary">
          Probar {{ TRIAL_DAYS }} días gratis
          <ArrowRight class="size-4" aria-hidden="true" />
        </a>
        <p class="text-[0.95rem] text-slate">Creas la cuenta en dos minutos, sin tarjeta.</p>
      </div>
    </div>
  </section>
</template>
