<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import {
  DuiButton,
  DuiDropdown,
  DuiDropdownItem,
  DuiDropdownSeparator,
  DuiNavbar,
  type NavbarItem,
} from '@dronico/droni-kit'
import BrandLogo from '@/components/BrandLogo.vue'
import EmailVerificationNotice from '@/components/account/EmailVerificationNotice.vue'
import { useAuthStore } from '@/stores/auth'
import { useTenantStore } from '@/stores/tenant'
import { useUnitsStore } from '@/stores/units'
import { useTheme } from '@/composables/useTheme'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const tenant = useTenantStore()
const units = useUnitsStore()
const { theme, toggle } = useTheme()

const items = computed<NavbarItem[]>(() => [
  {
    label: 'Inicio',
    icon: 'mdi mdi-home-outline',
    to: '/',
    active: route.name === 'home' || route.name === 'unit',
  },
  {
    label: 'Portería',
    icon: 'mdi mdi-account-clock-outline',
    to: '/porteria',
    active: route.name === 'visits',
  },
  {
    label: 'Reservas',
    icon: 'mdi mdi-calendar-check-outline',
    to: '/reservas',
    active: route.name === 'bookings',
  },
  {
    label: 'PQRS',
    icon: 'mdi mdi-message-text-outline',
    to: '/pqrs',
    active: route.name === 'tickets' || route.name === 'ticket',
  },
])

async function switchTenant() {
  units.reset()
  tenant.select(null)
  await router.push({ name: 'select-tenant' })
}
</script>

<template>
  <div class="flex min-h-full flex-col">
    <DuiNavbar :items="items" class="sticky top-0 z-30">
      <template #brand>
        <RouterLink to="/" class="flex h-8 items-center" aria-label="AptoPH, ir al inicio">
          <BrandLogo class="h-7" />
        </RouterLink>
      </template>
      <template #actions>
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
                class="grid size-8 place-items-center rounded-full bg-mint-100 text-xs font-semibold text-mint-800 dark:bg-mint-500/20 dark:text-mint-200"
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
            <p class="truncate text-neutral-500 dark:text-neutral-300">{{ auth.user?.email }}</p>
            <p class="mt-1 text-xs text-mint-700 dark:text-mint-300">{{ tenant.current?.name }}</p>
          </div>
          <DuiDropdownSeparator />
          <DuiDropdownItem
            icon="mdi mdi-account-outline"
            label="Mi perfil"
            @click="router.push({ name: 'profile' })"
          />
          <DuiDropdownItem
            v-if="tenant.residentTenants.length > 1"
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

    <EmailVerificationNotice v-if="route.name !== 'profile'" compact />

    <main class="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
      <RouterView :key="tenant.currentId ?? ''" />
    </main>

    <footer class="py-6 text-center text-xs text-neutral-400">AptoPH · Portal de residentes</footer>
  </div>
</template>
