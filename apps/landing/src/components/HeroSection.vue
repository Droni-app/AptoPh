<script setup lang="ts">
import { ArrowRight, CalendarCheck, Check, Package, Wallet } from '@lucide/vue'
import { PRICE_PER_UNIT, TRIAL_DAYS, formatCop } from '@aptoph/shared'
import { art } from '@/art'
import { heroEvents, proofPoints } from '@/content'
import { links } from '@/links'

const trust = [
  'Sin tarjeta de crédito',
  'Migramos tus datos gratis',
  `${formatCop(PRICE_PER_UNIT)} por unidad al mes`,
]

/** Where each notification lands on the illustration, and how it looks */
const chips = {
  pago: {
    icon: Wallet,
    tone: 'bg-mint-100 text-mint-700',
    place: 'left-[6%] top-[14%] sm:left-[10%]',
    delay: '350ms',
  },
  reserva: {
    icon: CalendarCheck,
    tone: 'bg-brand-100 text-brand-600',
    place: 'right-[5%] top-[24%] hidden sm:flex',
    delay: '900ms',
  },
  paquete: {
    icon: Package,
    tone: 'bg-coral-100 text-coral-700',
    place: 'bottom-[12%] left-[26%] hidden sm:flex lg:bottom-[24%]',
    delay: '1450ms',
  },
}
</script>

<template>
  <section id="inicio" class="relative -mt-18 overflow-hidden pt-18" aria-labelledby="hero-title">
    <div
      class="container-page relative z-10 pt-8 pb-10 sm:pt-14 lg:min-h-[43rem] lg:pt-24 lg:pb-28"
    >
      <div class="max-w-[34rem]">
        <p class="text-[0.95rem] font-semibold text-mint-700">Software para propiedad horizontal</p>
        <h1
          id="hero-title"
          class="mt-4 text-[2.55rem] leading-[1.04] font-extrabold tracking-[-0.035em] sm:text-[3.4rem] lg:text-[3.9rem]"
        >
          Administra tu conjunto residencial en un solo lugar
        </h1>
        <p class="lead mt-6 max-w-[31rem]">
          Cuotas, pagos, reservas, PQRS, portería y documentos en una plataforma que entienden la
          administración, el consejo y cada residente.
        </p>

        <div class="mt-9 flex flex-col gap-3 sm:flex-row">
          <a :href="links.signup" class="btn-primary btn-lg">
            Empieza gratis {{ TRIAL_DAYS }} días
            <ArrowRight class="size-4.5" aria-hidden="true" />
          </a>
          <a href="#demo" class="btn-ghost btn-lg">Ver la demo en vivo</a>
        </div>

        <ul
          class="mt-7 flex flex-col gap-2.5 text-[0.95rem] text-slate sm:flex-row sm:flex-wrap sm:gap-x-6"
        >
          <li v-for="item in trust" :key="item" class="flex items-center gap-2">
            <Check class="size-4.5 shrink-0 text-mint-600" stroke-width="2.75" aria-hidden="true" />
            {{ item }}
          </li>
        </ul>
      </div>
    </div>

    <!-- The community illustration: full-bleed to the right on desktop, below the copy on mobile -->
    <div
      class="relative mx-4 aspect-[4/3] overflow-hidden rounded-[2rem] sm:mx-6 sm:aspect-[16/10] lg:absolute lg:inset-y-0 lg:right-0 lg:mx-0 lg:aspect-auto lg:w-[66%] lg:rounded-none xl:w-[63%]"
    >
      <img
        :src="art.hero.src"
        :srcset="art.hero.srcset"
        sizes="(min-width: 1024px) 66vw, 100vw"
        :width="art.hero.width"
        :height="art.hero.height"
        alt="Residentes de un conjunto conversan en la zona verde mientras la administradora atiende a una vecina con su tableta"
        class="size-full object-cover object-[78%_center] lg:object-[70%_center]"
        fetchpriority="high"
        decoding="async"
      />
      <div
        class="pointer-events-none absolute inset-y-0 left-0 hidden w-40 bg-linear-to-r from-cream to-cream/0 lg:block"
        aria-hidden="true"
      />

      <ul aria-label="Así se ve la actividad de un conjunto en AptoPH">
        <li
          v-for="event in heroEvents"
          :key="event.kind"
          class="chip-in absolute flex items-center gap-3 rounded-2xl bg-white/95 py-2.5 pr-4 pl-2.5 shadow-[0_18px_40px_-18px_rgb(16_32_56/0.45)] ring-1 ring-brand-900/5 backdrop-blur"
          :class="chips[event.kind].place"
          :style="{ animationDelay: chips[event.kind].delay }"
        >
          <span
            class="grid size-9 shrink-0 place-items-center rounded-xl"
            :class="chips[event.kind].tone"
          >
            <component :is="chips[event.kind].icon" class="size-4.5" aria-hidden="true" />
          </span>
          <span class="leading-tight">
            <span class="block text-sm font-semibold text-brand-700">{{ event.title }}</span>
            <span class="block text-xs text-slate">{{ event.detail }}</span>
          </span>
        </li>
      </ul>
    </div>

    <!-- What AptoPH is, in four facts -->
    <div class="relative z-10 container-page pt-10 pb-6 lg:pt-0">
      <ul
        class="grid gap-x-8 gap-y-6 rounded-[1.75rem] bg-white px-6 py-7 shadow-[0_24px_60px_-36px_rgb(30_58_95/0.5)] ring-1 ring-brand-900/5 sm:grid-cols-2 sm:px-8 lg:-mt-14 lg:grid-cols-4"
      >
        <li v-for="point in proofPoints" :key="point.title" class="flex gap-3">
          <span class="mt-1.5 size-2 shrink-0 rounded-full bg-mint-400" aria-hidden="true" />
          <span>
            <span class="block font-display font-bold text-brand-700">{{ point.title }}</span>
            <span class="mt-0.5 block text-sm text-slate">{{ point.description }}</span>
          </span>
        </li>
      </ul>
    </div>
  </section>
</template>
