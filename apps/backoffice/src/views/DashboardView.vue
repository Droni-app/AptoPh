<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { DuiAlert, DuiCard, DuiSkeleton } from '@dronico/droni-kit'
import type { DashboardSummary } from '@aptoph/shared'
import PageHeader from '@/components/PageHeader.vue'
import { dashboardApi } from '@/api/backoffice'
import { errorMessage } from '@/lib/errors'
import { useAuthStore } from '@/stores/auth'
import { useTenantStore } from '@/stores/tenant'

const auth = useAuthStore()
const tenant = useTenantStore()
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

const firstName = computed(() => auth.user?.fullName.split(' ')[0] ?? '')
</script>

<template>
  <PageHeader :title="`Hola, ${firstName}`" :subtitle="tenant.current?.name" />

  <DuiAlert v-if="error" color="danger" variant="soft" class="mb-6">{{ error }}</DuiAlert>

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
