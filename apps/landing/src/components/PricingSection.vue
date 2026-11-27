<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowRight, BadgePercent, CalendarHeart, Check, DatabaseZap, Unlock } from '@lucide/vue'
import {
  MINIMUM_COVERS_UNITS,
  MINIMUM_MONTHLY,
  PLAN as plan,
  PRICE_PER_UNIT,
  TRIAL_DAYS,
  formatCop,
  quote,
} from '@aptoph/shared'
import { pricingPerks } from '@/content'
import { signupUrl } from '@/links'

const DEFAULT_UNITS = 120
const SLIDER_MAX = 1000

const perkIcons = [CalendarHeart, BadgePercent, DatabaseZap, Unlock]

const unitsInput = ref(DEFAULT_UNITS)
const units = computed(() => {
  const value = Math.floor(Number(unitsInput.value))
  return Number.isFinite(value) && value > 0 ? Math.min(value, 20_000) : DEFAULT_UNITS
})
const slider = computed({
  get: () => Math.min(units.value, SLIDER_MAX),
  set: (value: number) => (unitsInput.value = value),
})

const price = computed(() => quote(units.value))
</script>

<template>
  <section id="precios" class="bg-white py-20 sm:py-28" aria-labelledby="pricing-title">
    <div class="container-page">
      <div class="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div class="max-w-2xl">
          <h2 id="pricing-title" class="heading-section">Un precio por unidad, todo incluido</h2>
          <p class="lead mt-5">
            Pagas por cada unidad privada del conjunto, con todas las funciones y sin costos de
            instalación. Empieza con {{ TRIAL_DAYS }} días gratis.
          </p>
        </div>
      </div>

      <div
        class="mt-12 grid overflow-hidden rounded-[2rem] ring-1 ring-brand-900/8 lg:grid-cols-[0.95fr_1.05fr]"
      >
        <!-- Calculator: units × the single rate, never less than the monthly minimum -->
        <div class="relative overflow-hidden bg-brand-700 p-7 text-white sm:p-10">
          <div
            class="pointer-events-none absolute -right-24 -bottom-24 size-72 rounded-full bg-mint-400/15"
            aria-hidden="true"
          />
          <h3 class="text-2xl font-extrabold text-white">Plan {{ plan.name }}</h3>
          <p class="mt-1.5 text-brand-100">{{ plan.tagline }}</p>

          <label for="unidades" class="mt-9 block font-semibold text-white">
            ¿Cuántas unidades tiene tu conjunto?
          </label>
          <div class="mt-3 flex items-center gap-4">
            <input
              id="unidades"
              v-model.number="unitsInput"
              type="number"
              min="1"
              max="20000"
              inputmode="numeric"
              class="w-32 rounded-2xl border-0 bg-white/10 px-4 py-3 font-display text-3xl font-extrabold text-white tabular-nums ring-1 ring-white/20 focus:ring-2 focus:ring-mint-300 focus:outline-none"
            />
            <span class="text-brand-100">unidades</span>
          </div>
          <input
            v-model.number="slider"
            type="range"
            min="10"
            :max="SLIDER_MAX"
            step="10"
            aria-label="Unidades del conjunto"
            class="mt-5 w-full accent-mint-400"
          />

          <div class="relative mt-8 border-t border-white/15 pt-7">
            <p class="text-brand-100">Tu precio</p>
            <p class="mt-1 flex items-baseline gap-2">
              <span class="font-display text-[3.4rem] leading-none font-extrabold tabular-nums">
                {{ formatCop(price.pricePerUnit) }}
              </span>
              <span class="text-brand-100">/ unidad al mes</span>
            </p>
            <p class="mt-4 text-brand-50">
              Tu conjunto pagaría
              <strong class="font-semibold text-white tabular-nums">{{
                formatCop(price.monthly)
              }}</strong>
              al mes<template v-if="price.minimumApplied"> (el mínimo mensual)</template>.
            </p>
            <a :href="signupUrl({ units })" class="btn-mint btn-lg mt-8 w-full sm:w-auto">
              Probar {{ TRIAL_DAYS }} días gratis
              <ArrowRight class="size-4.5" aria-hidden="true" />
            </a>
            <p class="mt-3 text-sm text-brand-100">Sin IVA. Pago mensual, sin permanencia.</p>
          </div>
        </div>

        <div class="bg-cream p-7 sm:p-10">
          <p class="font-display font-bold text-brand-700">Así se calcula</p>
          <ul class="mt-4 space-y-2">
            <li
              class="flex items-center justify-between gap-4 rounded-2xl bg-white px-4 py-3.5 ring-2 ring-mint-400"
            >
              <span class="text-ink">Tarifa única por unidad</span>
              <span class="font-display text-xl font-extrabold text-brand-700 tabular-nums">
                {{ formatCop(PRICE_PER_UNIT) }}
                <span class="text-sm font-normal text-slate">/ unidad al mes</span>
              </span>
            </li>
            <li class="flex items-center justify-between gap-4 rounded-2xl bg-white/60 px-4 py-3.5">
              <span class="text-ink"
                >Mínimo mensual
                <span class="text-sm text-slate"
                  >(hasta {{ MINIMUM_COVERS_UNITS.toLocaleString('es-CO') }} unidades)</span
                ></span
              >
              <span class="font-display text-xl font-extrabold text-brand-700 tabular-nums">
                {{ formatCop(MINIMUM_MONTHLY) }}
                <span class="text-sm font-normal text-slate">al mes</span>
              </span>
            </li>
          </ul>
          <p class="mt-3 text-sm text-slate">
            El mismo precio para cualquier tamaño de conjunto, sin tramos ni costos de instalación.
          </p>

          <p class="mt-8 font-display font-bold text-brand-700">Todo incluido</p>
          <ul class="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <li
              v-for="feature in plan.features"
              :key="feature"
              class="flex gap-2.5 text-[0.95rem] text-ink"
            >
              <Check
                class="mt-1 size-4 shrink-0 text-mint-600"
                stroke-width="2.75"
                aria-hidden="true"
              />
              {{ feature }}
            </li>
          </ul>
        </div>
      </div>

      <ul class="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <li v-for="(perk, index) in pricingPerks" :key="perk.title" class="flex gap-4">
          <span
            class="grid size-11 shrink-0 place-items-center rounded-2xl bg-coral-50 text-coral-700"
          >
            <component :is="perkIcons[index]" class="size-5" aria-hidden="true" />
          </span>
          <div>
            <p class="font-display font-bold text-brand-700">{{ perk.title }}</p>
            <p class="mt-1 text-sm text-slate">{{ perk.description }}</p>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>
