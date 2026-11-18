<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check, Gift } from '@lucide/vue'
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

const plan = findPlan('completo')
const enterprise = findPlan('empresarial')

const cycle = ref<BillingCycle>('annual')
const unitsInput = ref(DEFAULT_UNITS)
const units = computed(() => {
  const value = Math.floor(Number(unitsInput.value))
  return Number.isFinite(value) && value > 0 ? Math.min(value, 20_000) : DEFAULT_UNITS
})

const price = computed(() => quote(units.value, cycle.value))
const currentTier = computed(() => tierFor(units.value))
/** Price per unit of a tier in the selected cycle */
const tierPrice = (pricePerUnit: number) =>
  cycle.value === 'annual'
    ? Math.round((pricePerUnit * ANNUAL_BILLED_MONTHS) / 12)
    : pricePerUnit
</script>

<template>
  <section id="precios" class="bg-navy-50/60 py-20 sm:py-28" aria-labelledby="pricing-title">
    <div class="container-page">
      <div class="mx-auto max-w-2xl text-center">
        <p class="eyebrow">Precios</p>
        <h2 id="pricing-title" class="mt-3 text-3xl font-semibold sm:text-4xl">
          Un precio por unidad, todo incluido
        </h2>
        <p class="mt-4 text-lg text-navy-600">
          Pagas por cada unidad privada del conjunto, con todas las funciones y sin costos de
          instalación. Empieza con {{ TRIAL_DAYS }} días gratis.
        </p>
      </div>

      <div class="mt-10 flex justify-center">
        <div
          class="inline-flex rounded-xl bg-white p-1 ring-1 ring-navy-100"
          role="group"
          aria-label="Ciclo de pago"
        >
          <button
            v-for="option in ['monthly', 'annual'] as const"
            :key="option"
            type="button"
            class="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            :class="option === cycle ? 'bg-navy-900 text-white' : 'text-navy-700 hover:bg-navy-50'"
            :aria-pressed="option === cycle"
            @click="cycle = option"
          >
            {{ option === 'monthly' ? 'Pago mensual' : 'Pago anual · 2 meses gratis' }}
          </button>
        </div>
      </div>

      <div class="mt-10 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <article class="relative flex flex-col rounded-3xl bg-white p-7 shadow-xl ring-2 ring-teal-500">
          <p
            class="absolute -top-3 left-7 rounded-full bg-teal-500 px-3 py-1 text-xs font-semibold text-navy-950"
          >
            Todas las funciones
          </p>
          <h3 class="font-display text-xl font-semibold">Plan {{ plan.name }}</h3>
          <p class="mt-2 text-sm text-navy-600">{{ plan.tagline }}</p>

          <ul class="mt-6 divide-y divide-navy-100 rounded-2xl ring-1 ring-navy-100">
            <li
              v-for="tier in PRICE_TIERS"
              :key="tier.pricePerUnit"
              class="flex items-center justify-between gap-4 px-4 py-3"
              :class="tier === currentTier ? 'bg-teal-50' : ''"
            >
              <span class="text-sm text-navy-700">
                {{ tierLabel(tier) }}
                <span v-if="tier === currentTier" class="ml-1 text-xs font-semibold text-teal-700"
                  >· tu conjunto</span
                >
              </span>
              <span class="font-display text-2xl font-semibold tabular-nums">
                {{ formatCop(tierPrice(tier.pricePerUnit)) }}
                <span class="text-sm font-normal text-navy-500">/ unidad al mes</span>
              </span>
            </li>
          </ul>
          <p class="mt-3 text-xs text-navy-500">
            Todas las unidades del conjunto pagan el precio de su tramo. Antes de IVA. Mínimo
            {{ formatCop(MINIMUM_MONTHLY) }} al mes.
            <template v-if="cycle === 'annual'">Valor por unidad pagando el año completo.</template>
          </p>

          <div
            class="mt-6 flex flex-col gap-3 rounded-2xl bg-navy-50 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <label class="flex items-center gap-3 text-sm font-medium text-navy-800">
              ¿Cuántas unidades tiene tu conjunto?
              <input
                v-model.number="unitsInput"
                type="number"
                min="1"
                max="20000"
                inputmode="numeric"
                class="w-24 rounded-lg border border-navy-200 bg-white px-3 py-2 text-base tabular-nums focus:outline-2 focus:outline-teal-500"
              />
            </label>
            <p class="text-sm text-navy-700">
              Tu precio:
              <strong class="font-display text-lg text-navy-900 tabular-nums">
                {{ formatCop(price.pricePerUnit) }}
              </strong>
              por unidad
            </p>
          </div>

          <a :href="signupUrl({ plan: plan.id, units })" class="btn-accent mt-6 px-5 py-3">
            Probar {{ TRIAL_DAYS }} días gratis
          </a>

          <ul class="mt-7 grid gap-3 text-sm text-navy-700 sm:grid-cols-2">
            <li v-for="feature in plan.features" :key="feature" class="flex gap-2.5">
              <Check class="mt-0.5 size-4 shrink-0 text-teal-600" aria-hidden="true" />
              {{ feature }}
            </li>
          </ul>
        </article>

        <article class="flex flex-col rounded-3xl bg-white p-7 ring-1 ring-navy-100">
          <h3 class="font-display text-xl font-semibold">{{ enterprise.name }}</h3>
          <p class="mt-2 text-sm text-navy-600">{{ enterprise.tagline }}</p>
          <p class="mt-6 font-display text-4xl font-semibold">A la medida</p>
          <p class="mt-1 text-sm text-navy-600">Tarifa por volumen según tu portafolio</p>
          <a :href="links.enterprise" class="btn-ghost mt-6 px-5 py-3">Hablar con ventas</a>
          <p v-if="enterprise.includesFrom" class="mt-7 text-sm font-semibold text-navy-800">
            {{ enterprise.includesFrom }}
          </p>
          <ul class="mt-3 space-y-3 text-sm text-navy-700">
            <li v-for="feature in enterprise.features" :key="feature" class="flex gap-2.5">
              <Check class="mt-0.5 size-4 shrink-0 text-teal-600" aria-hidden="true" />
              {{ feature }}
            </li>
          </ul>
        </article>
      </div>

      <ul class="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <li
          v-for="perk in pricingPerks"
          :key="perk.title"
          class="flex gap-3 rounded-2xl bg-white p-5 ring-1 ring-navy-100"
        >
          <Gift class="mt-0.5 size-5 shrink-0 text-teal-600" aria-hidden="true" />
          <div>
            <p class="font-semibold">{{ perk.title }}</p>
            <p class="mt-1 text-sm text-navy-600">{{ perk.description }}</p>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>
