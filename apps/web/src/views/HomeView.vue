<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { DuiAlert, DuiButton, DuiSkeleton } from '@dronico/droni-kit'
import { OCCUPANT_RELATIONSHIP_LABELS, type ApiItem, type ResidentHome } from '@aptoph/shared'
import BalanceBadge from '@/components/BalanceBadge.vue'
import EmptyState from '@/components/EmptyState.vue'
import comunidad800 from '@/assets/img/hero-comunidad-800.webp'
import comunidad1200 from '@/assets/img/hero-comunidad-1200.webp'
import { api } from '@/lib/http'
import { errorMessage } from '@/lib/errors'
import { formatMoney, isZero, unitName } from '@/lib/format'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const home = ref<ResidentHome | null>(null)
const error = ref<string | null>(null)

const firstName = computed(() => auth.user?.fullName.split(' ')[0] ?? '')

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buenos días'
  if (hour < 19) return 'Buenas tardes'
  return 'Buenas noches'
})

async function load() {
  error.value = null
  try {
    const { data } = await api<ApiItem<ResidentHome>>('/api/v1/resident/home')
    home.value = data
  } catch (e) {
    error.value = errorMessage(e, 'No pudimos cargar la información de tu conjunto')
  }
}

onMounted(load)
</script>

<template>
  <div v-if="error" class="flex flex-col items-start gap-4">
    <DuiAlert color="danger" variant="soft" class="w-full">{{ error }}</DuiAlert>
    <DuiButton variant="outline" @click="load">Reintentar</DuiButton>
  </div>

  <template v-else-if="home">
    <!-- Conjunto -->
    <section
      aria-labelledby="tenant-title"
      class="relative mb-8 overflow-hidden rounded-3xl bg-[#f8f1e7] ring-1 ring-brand-900/5 dark:ring-white/10"
    >
      <img
        :src="comunidad1200"
        :srcset="`${comunidad800} 800w, ${comunidad1200} 1200w`"
        sizes="(min-width: 1024px) 64rem, 100vw"
        alt=""
        width="1200"
        height="675"
        class="aspect-[16/7] w-full object-cover object-right sm:absolute sm:inset-0 sm:aspect-auto sm:h-full"
      />
      <div class="relative flex flex-col gap-6 p-6 sm:max-w-[52%] sm:py-10 sm:pl-8">
        <div class="min-w-0">
          <p class="text-sm font-semibold text-mint-700">
            {{ greeting }}{{ firstName ? `, ${firstName}` : '' }}
          </p>
          <h1
            id="tenant-title"
            class="mt-1 text-[1.75rem] leading-tight font-extrabold text-brand-700 sm:text-3xl"
          >
            {{ home.tenant.name }}
          </h1>
          <p v-if="home.tenant.legalName" class="mt-1 text-sm text-neutral-600">
            {{ home.tenant.legalName }}
          </p>
          <p
            v-if="home.tenant.address || home.tenant.city"
            class="mt-1 flex items-start gap-1.5 text-sm text-neutral-600"
          >
            <span class="text-base text-mint-600" aria-hidden="true"
              ><i class="mdi mdi-map-marker-outline"
            /></span>
            {{ [home.tenant.address, home.tenant.city].filter(Boolean).join(', ') }}
          </p>
        </div>
        <dl class="flex gap-3">
          <div class="rounded-2xl bg-white/85 px-4 py-2.5 shadow-sm backdrop-blur">
            <dt class="text-xs font-medium text-neutral-500">Torres</dt>
            <dd class="font-display text-2xl font-bold text-brand-700 tabular-nums">
              {{ home.tenant.buildingsCount }}
            </dd>
          </div>
          <div class="rounded-2xl bg-white/85 px-4 py-2.5 shadow-sm backdrop-blur">
            <dt class="text-xs font-medium text-neutral-500">Unidades</dt>
            <dd class="font-display text-2xl font-bold text-brand-700 tabular-nums">
              {{ home.tenant.unitsCount.toLocaleString('es-CO') }}
            </dd>
          </div>
        </dl>
      </div>
    </section>

    <!-- Mis unidades -->
    <section aria-labelledby="units-title">
      <h2 id="units-title" class="mb-3 text-lg font-semibold">
        {{ home.units.length === 1 ? 'Mi unidad' : 'Mis unidades' }}
      </h2>

      <EmptyState
        v-if="home.units.length === 0"
        class="rounded-2xl border border-neutral-100 bg-white dark:border-white/10 dark:bg-neutral-900"
        art="bienvenida"
        title="Aún no tienes unidades asociadas"
        description="Cuando la administración te registre como propietario o residente de una unidad, la verás aquí."
      />

      <ul v-else class="grid gap-4 sm:grid-cols-2">
        <li v-for="unit in home.units" :key="unit.id">
          <RouterLink
            :to="{ name: 'unit', params: { id: unit.id } }"
            class="group flex h-full flex-col rounded-2xl border border-neutral-100 bg-white p-5 transition hover:border-mint-500 hover:shadow-md focus-visible:outline-2 focus-visible:outline-mint-600 dark:border-white/10 dark:bg-neutral-900 dark:hover:border-mint-400"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-sm text-neutral-500 dark:text-neutral-300">
                  {{ unit.building?.name ?? 'Unidad' }}
                </p>
                <p class="font-display text-xl font-semibold">
                  {{ unitName({ ...unit, building: null }) }}
                </p>
              </div>
              <BalanceBadge :balance="unit.balance" />
            </div>
            <p class="mt-1 text-sm text-neutral-600 dark:text-neutral-200">
              {{ OCCUPANT_RELATIONSHIP_LABELS[unit.relationship] }}
              <template v-if="unit.isBillingResponsible"> · Responsable de pagos</template>
            </p>

            <div
              class="mt-5 flex items-end justify-between gap-3 border-t border-neutral-100 pt-4 dark:border-white/10"
            >
              <div>
                <p class="text-xs text-neutral-500 dark:text-neutral-300">Saldo pendiente</p>
                <p class="font-display text-2xl font-semibold tabular-nums">
                  {{ formatMoney(unit.balance.pending, home.tenant.currency) }}
                </p>
                <p
                  v-if="!isZero(unit.balance.overdue)"
                  class="text-xs font-medium text-red-700 dark:text-red-300"
                >
                  {{ formatMoney(unit.balance.overdue, home.tenant.currency) }} vencido
                </p>
              </div>
              <span
                class="flex items-center gap-1 text-sm font-medium text-mint-700 dark:text-mint-300"
              >
                Ver detalle
                <span class="transition group-hover:translate-x-0.5" aria-hidden="true"
                  ><i class="mdi mdi-arrow-right"
                /></span>
              </span>
            </div>
          </RouterLink>
        </li>
      </ul>
    </section>
  </template>

  <div v-else class="flex flex-col gap-4" aria-busy="true">
    <DuiSkeleton width="16rem" height="2.25rem" />
    <DuiSkeleton height="8rem" variant="rounded" />
    <div class="grid gap-4 sm:grid-cols-2">
      <DuiSkeleton height="10rem" variant="rounded" />
      <DuiSkeleton height="10rem" variant="rounded" />
    </div>
  </div>
</template>
