<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowRight, BadgePercent, CalendarHeart, Check, DatabaseZap, Unlock } from '@lucide/vue'
import {
  ANNUAL_BILLED_MONTHS,
  MINIMUM_MONTHLY,
  PRICE_TIERS,
  TRIAL_DAYS,
  findPlan,
  formatCop,
  quote,
  tierFor,
  tierLabel,
  type BillingCycle,
} from '@aptoph/shared'
import { pricingPerks } from '@/content'
import { links, signupUrl } from '@/links'

const DEFAULT_UNITS = 120
const SLIDER_MAX = 1000

const plan = findPlan('completo')
const enterprise = findPlan('empresarial')
const perkIcons = [CalendarHeart, BadgePercent, DatabaseZap, Unlock]

const cycle = ref<BillingCycle>('annual')
const unitsInput = ref(DEFAULT_UNITS)
const units = computed(() => {
  const value = Math.floor(Number(unitsInput.value))
  return Number.isFinite(value) && value > 0 ? Math.min(value, 20_000) : DEFAULT_UNITS
})
const slider = computed({
  get: () => Math.min(units.value, SLIDER_MAX),
  set: (value: number) => (unitsInput.value = value),
})

const price = computed(() => quote(units.value, cycle.value))
const currentTier = computed(() => tierFor(units.value))
/** Price per unit of a tier in the selected cycle */
const tierPrice = (pricePerUnit: number) =>
  cycle.value === 'annual' ? Math.round((pricePerUnit * ANNUAL_BILLED_MONTHS) / 12) : pricePerUnit
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

        <div
          class="inline-flex self-start rounded-full bg-cream p-1.5 ring-1 ring-brand-900/5 lg:self-auto"
          role="group"
          aria-label="Ciclo de pago"
        >
          <button
            v-for="option in ['monthly', 'annual'] as const"
            :key="option"
            type="button"
            class="rounded-full px-4 py-2.5 text-[0.95rem] font-semibold whitespace-nowrap sm:px-5 transition-colors focus-visible:outline-2 focus-visible:outline-brand-700"
            :class="option === cycle ? 'bg-brand-700 text-white' : 'text-brand-700 hover:bg-white'"
            :aria-pressed="option === cycle"
            @click="cycle = option"
          >
            {{ option === 'monthly' ? 'Mensual' : 'Anual' }}
            <span
              v-if="option === 'annual'"
              class="ml-1 rounded-full px-2 py-0.5 text-xs"
              :class="option === cycle ? 'bg-mint-400 text-ink' : 'bg-mint-100 text-mint-700'"
              >2 meses gratis</span
            >
          </button>
        </div>
      </div>

      <div
        class="mt-12 grid overflow-hidden rounded-[2rem] ring-1 ring-brand-900/8 lg:grid-cols-[0.95fr_1.05fr]"
      >
        <!-- Calculator: the size of the conjunto sets the price of every unit -->
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
              al mes<template v-if="cycle === 'annual'">
                ({{ formatCop(price.total) }} al año, ahorras
                <strong class="font-semibold text-mint-300 tabular-nums">{{
                  formatCop(price.annualSavings)
                }}</strong
                >)</template
              >.
            </p>
            <a
              :href="signupUrl({ plan: plan.id, units })"
              class="btn-mint btn-lg mt-8 w-full sm:w-auto"
            >
              Probar {{ TRIAL_DAYS }} días gratis
              <ArrowRight class="size-4.5" aria-hidden="true" />
            </a>
            <p class="mt-3 text-sm text-brand-100">
              Antes de IVA. Mínimo {{ formatCop(MINIMUM_MONTHLY) }} al mes.
            </p>
          </div>
        </div>

        <div class="bg-cream p-7 sm:p-10">
          <p class="font-display font-bold text-brand-700">Precio por unidad según el tamaño</p>
          <ul class="mt-4 space-y-2">
            <li
              v-for="tier in PRICE_TIERS"
              :key="tier.pricePerUnit"
              class="flex items-center justify-between gap-4 rounded-2xl px-4 py-3.5 transition-colors"
              :class="tier === currentTier ? 'bg-white ring-2 ring-mint-400' : 'bg-white/60'"
            >
              <span class="text-ink">
                {{ tierLabel(tier) }}
                <span v-if="tier === currentTier" class="ml-1 text-sm font-semibold text-mint-700"
                  >tu conjunto</span
                >
              </span>
              <span class="font-display text-xl font-extrabold text-brand-700 tabular-nums">
                {{ formatCop(tierPrice(tier.pricePerUnit)) }}
                <span class="text-sm font-normal text-slate">/ unidad al mes</span>
              </span>
            </li>
          </ul>
          <p class="mt-3 text-sm text-slate">
            Todas las unidades del conjunto pagan el precio de su tramo.
            <template v-if="cycle === 'annual'">Valor por unidad pagando el año completo.</template>
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

      <article
        class="mt-6 grid gap-6 rounded-[2rem] bg-cream p-7 sm:p-10 lg:grid-cols-[1fr_1.4fr_auto] lg:items-center lg:gap-10"
      >
        <div>
          <h3 class="text-2xl font-extrabold">{{ enterprise.name }}</h3>
          <p class="mt-1.5 text-slate">{{ enterprise.tagline }}</p>
          <p class="mt-4 font-display text-xl font-extrabold text-brand-700">A la medida</p>
          <p class="text-sm text-slate">Tarifa por volumen según tu portafolio</p>
        </div>
        <div>
          <p v-if="enterprise.includesFrom" class="text-sm font-semibold text-brand-700">
            {{ enterprise.includesFrom }}
          </p>
          <ul class="mt-3 grid gap-x-6 gap-y-2.5 text-[0.95rem] text-ink sm:grid-cols-2">
            <li v-for="feature in enterprise.features" :key="feature" class="flex gap-2.5">
              <Check
                class="mt-1 size-4 shrink-0 text-mint-600"
                stroke-width="2.75"
                aria-hidden="true"
              />
              {{ feature }}
            </li>
          </ul>
        </div>
        <a :href="links.enterprise" class="btn-ghost self-start lg:self-center"
          >Hablar con ventas</a
        >
      </article>

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
