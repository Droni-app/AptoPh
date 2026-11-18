<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { DuiAlert, DuiButton, DuiCard, DuiSkeleton } from '@dronico/droni-kit'
import { OCCUPANT_RELATIONSHIP_LABELS, type ApiItem, type ResidentHome } from '@aptoph/shared'
import BalanceBadge from '@/components/BalanceBadge.vue'
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
    <header class="mb-6">
      <p class="text-sm text-navy-500 dark:text-navy-300">{{ greeting }}{{ firstName ? `, ${firstName}` : '' }}</p>
      <h1 class="text-2xl font-semibold sm:text-3xl">{{ home.tenant.name }}</h1>
    </header>

    <!-- Conjunto -->
    <section aria-labelledby="tenant-title" class="mb-8">
      <h2 id="tenant-title" class="sr-only">Tu conjunto</h2>
      <div class="overflow-hidden rounded-2xl bg-navy-900 text-white shadow-sm">
        <div class="flex flex-col gap-6 p-6 sm:flex-row sm:items-end sm:justify-between">
          <div class="min-w-0">
            <p v-if="home.tenant.legalName" class="text-sm text-navy-200">{{ home.tenant.legalName }}</p>
            <p v-if="home.tenant.address || home.tenant.city" class="mt-1 flex items-start gap-1.5 text-sm text-navy-100">
              <span class="text-base text-teal-300" aria-hidden="true"><i class="mdi mdi-map-marker-outline" /></span>
              {{ [home.tenant.address, home.tenant.city].filter(Boolean).join(', ') }}
            </p>
          </div>
          <dl class="flex gap-8">
            <div>
              <dt class="text-xs tracking-wide text-navy-200 uppercase">Torres</dt>
              <dd class="font-display text-3xl font-semibold tabular-nums">{{ home.tenant.buildingsCount }}</dd>
            </div>
            <div>
              <dt class="text-xs tracking-wide text-navy-200 uppercase">Unidades</dt>
              <dd class="font-display text-3xl font-semibold tabular-nums">
                {{ home.tenant.unitsCount.toLocaleString('es-CO') }}
              </dd>
            </div>
          </dl>
        </div>
        <div class="h-1 bg-gradient-to-r from-teal-500 via-teal-400 to-transparent" aria-hidden="true" />
      </div>
    </section>

    <!-- Mis unidades -->
    <section aria-labelledby="units-title">
      <h2 id="units-title" class="mb-3 text-lg font-semibold">
        {{ home.units.length === 1 ? 'Mi unidad' : 'Mis unidades' }}
      </h2>

      <DuiCard v-if="home.units.length === 0">
        <div class="flex flex-col items-center gap-2 py-6 text-center">
          <span class="text-4xl text-navy-300" aria-hidden="true"><i class="mdi mdi-home-search-outline" /></span>
          <p class="font-medium">Aún no tienes unidades asociadas</p>
          <p class="max-w-sm text-sm text-navy-500 dark:text-navy-300">
            Cuando la administración te registre como propietario o residente de una unidad, la verás aquí.
          </p>
        </div>
      </DuiCard>

      <ul v-else class="grid gap-4 sm:grid-cols-2">
        <li v-for="unit in home.units" :key="unit.id">
          <RouterLink
            :to="{ name: 'unit', params: { id: unit.id } }"
            class="group flex h-full flex-col rounded-2xl border border-navy-100 bg-white p-5 transition hover:border-teal-500 hover:shadow-md focus-visible:outline-2 focus-visible:outline-teal-600 dark:border-white/10 dark:bg-navy-900 dark:hover:border-teal-400"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-sm text-navy-500 dark:text-navy-300">{{ unit.building?.name ?? 'Unidad' }}</p>
                <p class="font-display text-xl font-semibold">{{ unitName({ ...unit, building: null }) }}</p>
              </div>
              <BalanceBadge :balance="unit.balance" />
            </div>
            <p class="mt-1 text-sm text-navy-600 dark:text-navy-200">
              {{ OCCUPANT_RELATIONSHIP_LABELS[unit.relationship] }}
              <template v-if="unit.isBillingResponsible"> · Responsable de pagos</template>
            </p>

            <div class="mt-5 flex items-end justify-between gap-3 border-t border-navy-100 pt-4 dark:border-white/10">
              <div>
                <p class="text-xs text-navy-500 dark:text-navy-300">Saldo pendiente</p>
                <p class="font-display text-2xl font-semibold tabular-nums">
                  {{ formatMoney(unit.balance.pending, home.tenant.currency) }}
                </p>
                <p v-if="!isZero(unit.balance.overdue)" class="text-xs font-medium text-red-700 dark:text-red-300">
                  {{ formatMoney(unit.balance.overdue, home.tenant.currency) }} vencido
                </p>
              </div>
              <span class="flex items-center gap-1 text-sm font-medium text-teal-700 dark:text-teal-300">
                Ver detalle
                <span class="transition group-hover:translate-x-0.5" aria-hidden="true"><i class="mdi mdi-arrow-right" /></span>
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
