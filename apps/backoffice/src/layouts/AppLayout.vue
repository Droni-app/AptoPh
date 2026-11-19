<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import {
  DuiButton,
  DuiDropdown,
  DuiDropdownItem,
  DuiDropdownSeparator,
  DuiNavbar,
  type NavbarItem,
} from '@dronico/droni-kit'
import { ROLE_LABELS } from '@aptoph/shared'
import { useAuthStore } from '@/stores/auth'
import { useTenantStore } from '@/stores/tenant'
import { useSubscriptionStore } from '@/stores/subscription'
import { useTheme } from '@/composables/useTheme'
import BrandLogo from '@/components/BrandLogo.vue'
import EmailVerificationNotice from '@/components/account/EmailVerificationNotice.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const tenant = useTenantStore()
const subscription = useSubscriptionStore()
const { theme, toggle } = useTheme()

const sections: Array<{ label: string; icon: string; to: string; match: string[] }> = [
  { label: 'Inicio', icon: 'mdi mdi-view-dashboard-outline', to: '/', match: ['dashboard'] },
  { label: 'Unidades', icon: 'mdi mdi-door', to: '/unidades', match: ['units', 'unit'] },
  {
    label: 'Finanzas',
    icon: 'mdi mdi-cash-multiple',
    to: '/finanzas',
    match: [
      'finance',
      'finance-billing',
      'finance-fees',
      'finance-payments',
      'finance-receivables',
      'finance-statement',
      'finance-expenses',
      'finance-banks',
      'finance-budgets',
      'finance-budget',
      'finance-accounting',
      'finance-reports',
      'finance-settings',
    ],
  },
  {
    label: 'Comunicados',
    icon: 'mdi mdi-bullhorn-outline',
    to: '/comunicados',
    match: ['announcements'],
  },
  { label: 'Torres', icon: 'mdi mdi-office-building-outline', to: '/torres', match: ['buildings'] },
  { label: 'Personas', icon: 'mdi mdi-account-group-outline', to: '/personas', match: ['members'] },
  {
    label: 'Plan',
    icon: 'mdi mdi-card-account-details-star-outline',
    to: '/plan',
    match: ['plan'],
  },
]

const items = computed<NavbarItem[]>(() =>
  sections
    // Managed conjuntos (no subscription) have no plan page to show
    .filter((section) => section.to !== '/plan' || subscription.current !== null)
    .filter((section) => section.to !== '/finanzas' || tenant.canReadFinance)
    .map((section) => ({
      label: section.label,
      icon: section.icon,
      to: section.to,
      active: section.match.includes(String(route.name)),
    })),
)

const trialChip = computed(() => {
  const days = subscription.trialDaysLeft
  if (subscription.current?.status !== 'trialing' || subscription.locked || days === null)
    return null
  return `Prueba: ${days} ${days === 1 ? 'día' : 'días'}`
})

const roleLabel = computed(() => tenant.roles.map((role) => ROLE_LABELS[role]).join(' · '))

async function switchTenant() {
  tenant.select(null)
  await router.push({ name: 'select-tenant' })
}
</script>

<template>
  <div class="flex min-h-full flex-col">
    <DuiNavbar :items="items" class="sticky top-0 z-30">
      <template #brand>
        <RouterLink to="/" class="flex h-8 items-center" aria-label="AptoPH, ir al inicio">
          <span class="h-8 sm:hidden"><BrandLogo kind="symbol" /></span>
          <span class="hidden h-8 sm:block"><BrandLogo /></span>
        </RouterLink>
      </template>
      <template #actions>
        <RouterLink
          v-if="trialChip"
          to="/plan"
          class="hidden rounded-full bg-coral-50 px-3 py-1 text-xs font-semibold text-coral-700 ring-1 ring-coral-100 hover:bg-coral-100 sm:inline-block dark:bg-coral-400/15 dark:text-coral-300 dark:ring-coral-400/20"
        >
          <i class="mdi mdi-timer-sand" aria-hidden="true" /> {{ trialChip }}
        </RouterLink>
        <DuiButton
          variant="ghost"
          size="sm"
          :title="theme === 'dark' ? 'Usar tema claro' : 'Usar tema oscuro'"
          :aria-label="theme === 'dark' ? 'Usar tema claro' : 'Usar tema oscuro'"
          @click="toggle"
        >
          <span class="text-lg"
            ><i :class="theme === 'dark' ? 'mdi mdi-weather-sunny' : 'mdi mdi-weather-night'"
          /></span>
        </DuiButton>
        <DuiDropdown placement="bottom-end" min-width="16rem" aria-label="Menú de usuario">
          <template #trigger>
            <span class="flex items-center gap-2">
              <span
                class="grid size-8 place-items-center rounded-full bg-mint-100 text-xs font-semibold text-mint-800 dark:bg-mint-400/20 dark:text-mint-200"
              >
                {{ auth.user?.initials ?? '…' }}
              </span>
              <span class="hidden max-w-40 truncate text-left text-sm md:block">
                {{ tenant.current?.name }}
              </span>
            </span>
          </template>
          <div class="px-3 py-2 text-sm">
            <p class="font-medium">{{ auth.user?.fullName }}</p>
            <p class="truncate text-neutral-500 dark:text-neutral-400">{{ auth.user?.email }}</p>
            <p class="mt-1 text-xs font-medium text-mint-700 dark:text-mint-300">{{ roleLabel }}</p>
          </div>
          <DuiDropdownSeparator />
          <DuiDropdownItem
            icon="mdi mdi-account-outline"
            label="Mi perfil"
            @click="router.push({ name: 'profile' })"
          />
          <DuiDropdownItem
            icon="mdi mdi-cog-outline"
            label="Configuración del conjunto"
            @click="router.push({ name: 'settings' })"
          />
          <DuiDropdownItem
            v-if="tenant.backofficeTenants.length > 1"
            icon="mdi mdi-swap-horizontal"
            label="Cambiar de conjunto"
            @click="switchTenant"
          />
          <DuiDropdownItem
            icon="mdi mdi-logout"
            label="Cerrar sesión"
            danger
            @click="auth.logout()"
          />
        </DuiDropdown>
      </template>
    </DuiNavbar>

    <div
      v-if="subscription.locked || subscription.showTrialReminder"
      role="status"
      class="border-b px-4 py-2.5 text-center text-sm"
      :class="
        subscription.locked
          ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200'
          : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100'
      "
    >
      <template v-if="subscription.locked">
        Tu periodo de prueba terminó. Tu información está a salvo en modo consulta.
      </template>
      <template v-else>
        Te
        {{
          subscription.trialDaysLeft === 1
            ? 'queda 1 día'
            : `quedan ${subscription.trialDaysLeft} días`
        }}
        de prueba gratis.
      </template>
      <RouterLink to="/plan" class="ml-1 font-semibold underline">
        {{ subscription.locked ? 'Activar mi plan' : 'Elegir plan' }}
      </RouterLink>
    </div>

    <EmailVerificationNotice v-if="route.name !== 'profile'" compact />

    <main class="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
      <RouterView :key="tenant.currentId ?? ''" />
    </main>
  </div>
</template>
