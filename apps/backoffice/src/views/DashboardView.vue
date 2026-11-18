<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { DuiAlert, DuiButton, DuiCard, DuiSkeleton } from '@dronico/droni-kit'
import type { DashboardSummary } from '@aptoph/shared'
import PageHeader from '@/components/PageHeader.vue'
import { dashboardApi } from '@/api/backoffice'
import { errorMessage } from '@/lib/errors'
import { useAuthStore } from '@/stores/auth'
import { useTenantStore } from '@/stores/tenant'
import { useSubscriptionStore } from '@/stores/subscription'

const auth = useAuthStore()
const route = useRoute()
const tenant = useTenantStore()
const subscription = useSubscriptionStore()
const summary = ref<DashboardSummary | null>(null)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    summary.value = (await dashboardApi.summary()).data
  } catch (e) {
    error.value = errorMessage(e)
  }
})

const occupancy = computed(() => {
  if (!summary.value?.units) return '—'
  return `${Math.round((summary.value.occupiedUnits / summary.value.units) * 100)} %`
})

const stats = computed(() => [
  { label: 'Unidades', value: summary.value?.units, icon: 'mdi mdi-door', to: '/unidades' },
  { label: 'Ocupación', value: occupancy.value, icon: 'mdi mdi-home-account', to: '/unidades' },
  { label: 'Torres', value: summary.value?.buildings, icon: 'mdi mdi-office-building-outline', to: '/torres' },
  { label: 'Ocupantes registrados', value: summary.value?.occupants, icon: 'mdi mdi-account-multiple-outline', to: '/unidades' },
  { label: 'Personal activo', value: summary.value?.staff, icon: 'mdi mdi-badge-account-outline', to: '/personas' },
  { label: 'Solicitudes abiertas', value: summary.value?.openTickets, icon: 'mdi mdi-message-alert-outline', to: '/' },
])

const welcome = computed(() => route.query.bienvenida === '1')

/** Getting-started checklist while the conjunto has no census loaded */
const onboarding = computed(() => {
  if (!tenant.canManage || !summary.value) return null
  if (!welcome.value && summary.value.units > 0) return null
  return [
    { done: summary.value.buildings > 0, title: 'Crea las torres o bloques', to: '/torres', icon: 'mdi mdi-office-building-outline' },
    { done: summary.value.units > 0, title: 'Carga las unidades con su coeficiente', to: '/unidades', icon: 'mdi mdi-door' },
    { done: summary.value.occupants > 0, title: 'Registra propietarios y residentes', to: '/unidades', icon: 'mdi mdi-account-multiple-plus-outline' },
    // The administrator who signed up already counts as staff
    { done: summary.value.staff > 1, title: 'Invita al consejo y al personal', to: '/personas', icon: 'mdi mdi-account-group-outline' },
  ]
})

const firstName = computed(() => auth.user?.fullName.split(' ')[0] ?? '')
</script>

<template>
  <PageHeader :title="`Hola, ${firstName}`" :subtitle="tenant.current?.name" />

  <DuiAlert v-if="error" color="danger" variant="soft" class="mb-6">{{ error }}</DuiAlert>

  <DuiCard v-if="onboarding" class="mb-6">
    <div class="flex flex-col gap-4">
      <div>
        <h2 class="text-lg font-semibold">
          {{ welcome ? '¡Bienvenido a AptoPH! Tu conjunto está listo' : 'Pon en marcha tu conjunto' }}
        </h2>
        <p class="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          <template v-if="subscription.current?.status === 'trialing' && !subscription.locked">
            Tienes {{ subscription.trialDaysLeft }} días de prueba con todas las funciones.
          </template>
          Sigue estos pasos para dejar el conjunto en orden. ¿Prefieres que migremos tus datos desde
          Excel? <a href="mailto:contacto@aptoph.com?subject=Migración%20de%20datos" class="font-medium text-violet-600 underline dark:text-violet-400">Lo hacemos sin costo</a>.
        </p>
      </div>
      <ol class="grid gap-3 sm:grid-cols-2">
        <li v-for="(step, index) in onboarding" :key="step.title">
          <RouterLink
            :to="step.to"
            class="flex items-center gap-3 rounded-lg border border-neutral-200 p-3 transition hover:border-violet-400 dark:border-white/10"
          >
            <span
              class="grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold"
              :class="step.done ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300'"
              aria-hidden="true"
            >
              <i v-if="step.done" class="mdi mdi-check" />
              <template v-else>{{ index + 1 }}</template>
            </span>
            <span class="text-sm" :class="step.done ? 'text-neutral-400 line-through' : 'font-medium'">{{ step.title }}</span>
            <span class="sr-only">{{ step.done ? '(hecho)' : '' }}</span>
          </RouterLink>
        </li>
      </ol>
      <div v-if="subscription.current" class="flex justify-end">
        <DuiButton variant="ghost" size="sm" to="/plan">Ver planes y precios</DuiButton>
      </div>
    </div>
  </DuiCard>

  <section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Resumen">
    <RouterLink
      v-for="stat in stats"
      :key="stat.label"
      :to="stat.to"
      class="rounded-xl focus-visible:outline-2 focus-visible:outline-violet-500"
    >
      <DuiCard class="h-full transition hover:shadow-md">
        <div class="flex items-center gap-4">
          <span
            class="grid size-11 shrink-0 place-items-center rounded-lg bg-violet-100 text-2xl text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"
            aria-hidden="true"
          >
            <i :class="stat.icon" />
          </span>
          <div class="min-w-0">
            <p class="text-sm text-neutral-500 dark:text-neutral-400">{{ stat.label }}</p>
            <DuiSkeleton v-if="!summary && !error" width="4rem" height="1.75rem" class="mt-1" />
            <p v-else class="text-2xl font-semibold tabular-nums">{{ stat.value ?? '—' }}</p>
          </div>
        </div>
      </DuiCard>
    </RouterLink>
  </section>
</template>
