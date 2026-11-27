<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { UiAlert, UiButton, UiSkeleton } from '@aptoph/ui'
import type { DashboardSummary } from '@aptoph/shared'
import PageHeader from '@/components/PageHeader.vue'
import { dashboardApi } from '@/api/backoffice'
import { errorMessage } from '@/lib/errors'
import { useAuthStore } from '@/stores/auth'
import { useTenantStore } from '@/stores/tenant'
import { useSubscriptionStore } from '@/stores/subscription'
import iconUnidades from '@/assets/img/icons/unidades.webp'
import iconReportes from '@/assets/img/icons/reportes.webp'
import iconResidentes from '@/assets/img/icons/residentes.webp'
import iconVisitantes from '@/assets/img/icons/visitantes.webp'
import iconPqrs from '@/assets/img/icons/pqrs.webp'
import iconTorres from '../../../../branding/logo/aptoph-symbol.svg?url'
import bienvenida from '@/assets/img/empty-bienvenida.webp'

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
  { label: 'Unidades', value: summary.value?.units, icon: iconUnidades, to: '/unidades' },
  { label: 'Ocupación', value: occupancy.value, icon: iconReportes, to: '/unidades' },
  { label: 'Torres', value: summary.value?.buildings, icon: iconTorres, to: '/torres' },
  {
    label: 'Ocupantes registrados',
    value: summary.value?.occupants,
    icon: iconResidentes,
    to: '/unidades',
  },
  { label: 'Personal activo', value: summary.value?.staff, icon: iconVisitantes, to: '/personas' },
  { label: 'Solicitudes abiertas', value: summary.value?.openTickets, icon: iconPqrs, to: '/' },
])

const welcome = computed(() => route.query.bienvenida === '1')

/** Getting-started checklist while the conjunto has no census loaded */
const onboarding = computed(() => {
  if (!tenant.canManage || !summary.value) return null
  if (!welcome.value && summary.value.units > 0) return null
  return [
    {
      done: summary.value.buildings > 0,
      title: 'Crea las torres o bloques',
      to: '/torres',
      icon: 'mdi mdi-office-building-outline',
    },
    {
      done: summary.value.units > 0,
      title: 'Carga las unidades con su coeficiente',
      to: '/unidades',
      icon: 'mdi mdi-door',
    },
    {
      done: summary.value.occupants > 0,
      title: 'Registra propietarios y residentes',
      to: '/unidades',
      icon: 'mdi mdi-account-multiple-plus-outline',
    },
    // The administrator who signed up already counts as staff
    {
      done: summary.value.staff > 1,
      title: 'Invita al consejo y al personal',
      to: '/personas',
      icon: 'mdi mdi-account-group-outline',
    },
  ]
})

const firstName = computed(() => auth.user?.fullName.split(' ')[0] ?? '')
</script>

<template>
  <PageHeader :title="`Hola, ${firstName}`" :subtitle="tenant.current?.name" />

  <UiAlert v-if="error" color="danger" variant="soft" class="mb-6">{{ error }}</UiAlert>

  <section
    v-if="onboarding"
    class="mb-8 grid overflow-hidden rounded-3xl bg-white ring-1 ring-brand-900/5 md:grid-cols-[1fr_auto] dark:bg-neutral-900 dark:ring-white/10"
    aria-labelledby="onboarding-title"
  >
    <div class="flex flex-col gap-5 p-6 sm:p-8">
      <div>
        <h2 id="onboarding-title" class="text-xl font-extrabold text-brand-700 dark:text-white">
          {{
            welcome ? '¡Bienvenido a AptoPH! Tu conjunto está listo' : 'Pon en marcha tu conjunto'
          }}
        </h2>
        <p class="mt-1.5 max-w-2xl text-sm text-neutral-600 dark:text-neutral-300">
          <template v-if="subscription.current?.status === 'trialing' && !subscription.locked">
            Tienes {{ subscription.trialDaysLeft }} días de prueba con todas las funciones.
          </template>
          Sigue estos pasos para dejar el conjunto en orden. ¿Prefieres que migremos tus datos desde
          Excel?
          <a
            href="mailto:contacto@aptoph.com?subject=Migración%20de%20datos"
            class="font-semibold text-mint-700 underline underline-offset-2 dark:text-mint-300"
            >Lo hacemos sin costo</a
          >.
        </p>
      </div>
      <!-- A real sequence: numbered steps, checked off as the census fills in -->
      <ol class="grid gap-3 sm:grid-cols-2">
        <li v-for="(step, index) in onboarding" :key="step.title">
          <RouterLink
            :to="step.to"
            class="flex items-center gap-3 rounded-2xl p-3 transition"
            :class="
              step.done
                ? 'bg-mint-50 dark:bg-mint-400/10'
                : 'bg-cream ring-1 ring-brand-900/5 hover:ring-mint-400 dark:bg-white/5 dark:ring-white/10'
            "
          >
            <span
              class="grid size-8 shrink-0 place-items-center rounded-full font-display text-sm font-extrabold"
              :class="
                step.done ? 'bg-mint-400 text-ink' : 'bg-brand-700 text-white dark:bg-brand-400'
              "
              aria-hidden="true"
            >
              <i v-if="step.done" class="mdi mdi-check" />
              <template v-else>{{ index + 1 }}</template>
            </span>
            <span
              class="text-sm"
              :class="
                step.done
                  ? 'text-mint-800 line-through decoration-mint-400 dark:text-mint-200'
                  : 'font-semibold text-brand-700 dark:text-white'
              "
              >{{ step.title }}</span
            >
            <span class="sr-only">{{ step.done ? '(hecho)' : '' }}</span>
          </RouterLink>
        </li>
      </ol>
      <div v-if="subscription.current">
        <UiButton variant="ghost" size="sm" to="/plan">Ver planes y precios</UiButton>
      </div>
    </div>
    <img
      :src="bienvenida"
      alt=""
      width="640"
      height="574"
      class="hidden w-64 self-end justify-self-center p-6 md:block lg:w-72"
    />
  </section>

  <section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Resumen">
    <RouterLink
      v-for="stat in stats"
      :key="stat.label"
      :to="stat.to"
      class="group flex items-center gap-4 rounded-2xl bg-white p-5 ring-1 ring-brand-900/5 transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-8px_rgb(30_58_95/0.18)] focus-visible:outline-2 focus-visible:outline-mint-500 dark:bg-neutral-900 dark:ring-white/10"
    >
      <span
        class="grid size-14 shrink-0 place-items-center rounded-2xl bg-cream dark:bg-white/90"
        aria-hidden="true"
      >
        <img :src="stat.icon" alt="" width="128" height="128" class="size-9" />
      </span>
      <span class="min-w-0">
        <span class="block text-sm text-neutral-500 dark:text-neutral-400">{{ stat.label }}</span>
        <UiSkeleton v-if="!summary && !error" width="4rem" height="2rem" class="mt-1" />
        <span
          v-else
          class="block font-display text-[1.75rem] leading-tight font-extrabold text-brand-700 tabular-nums dark:text-white"
        >
          {{ stat.value ?? '—' }}
        </span>
      </span>
    </RouterLink>
  </section>
</template>
