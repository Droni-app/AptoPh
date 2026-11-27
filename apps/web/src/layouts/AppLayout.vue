<script setup lang="ts">
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { UiDropdown, UiDropdownItem, UiDropdownSeparator, UiNotificationBell } from '@aptoph/ui'
import { notificationsApi } from '@/api/account'
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

const items = [
  {
    label: 'Inicio',
    icon: 'mdi-home-outline',
    active: 'mdi-home',
    to: '/',
    match: ['home', 'unit'],
  },
  {
    label: 'Comunicados',
    icon: 'mdi-bullhorn-outline',
    active: 'mdi-bullhorn',
    to: '/comunicados',
    match: ['announcements', 'announcement'],
  },
  {
    label: 'Portería',
    icon: 'mdi-account-clock-outline',
    active: 'mdi-account-clock',
    to: '/porteria',
    match: ['visits'],
  },
  {
    label: 'Reservas',
    icon: 'mdi-calendar-check-outline',
    active: 'mdi-calendar-check',
    to: '/reservas',
    match: ['bookings'],
  },
  {
    label: 'PQRS',
    icon: 'mdi-message-text-outline',
    active: 'mdi-message-text',
    to: '/pqrs',
    match: ['tickets', 'ticket'],
  },
]
const isActive = (item: (typeof items)[number]) => item.match.includes(String(route.name))

async function switchTenant() {
  units.reset()
  tenant.select(null)
  await router.push({ name: 'select-tenant' })
}
</script>

<template>
  <div class="flex min-h-full flex-col pb-16 md:pb-0">
    <header
      class="sticky top-0 z-30 border-b border-neutral-200 bg-white/90 backdrop-blur-md dark:border-white/8 dark:bg-neutral-950/85"
    >
      <div class="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <RouterLink to="/" class="flex h-7 shrink-0 items-center" aria-label="AptoPH, ir al inicio">
          <BrandLogo class="h-7" />
        </RouterLink>

        <nav class="hidden h-full items-stretch gap-1 md:flex" aria-label="Secciones">
          <RouterLink
            v-for="item in items"
            :key="item.to"
            :to="item.to"
            class="relative flex items-center gap-2 px-3 text-sm font-medium transition-colors"
            :class="
              isActive(item)
                ? 'text-neutral-900 dark:text-white'
                : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
            "
            :aria-current="isActive(item) ? 'page' : undefined"
          >
            <i
              :class="[
                'mdi text-lg',
                isActive(item) ? `${item.active} text-mint-600 dark:text-mint-400` : item.icon,
              ]"
              aria-hidden="true"
            />
            {{ item.label }}
            <span
              v-if="isActive(item)"
              class="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-mint-500"
              aria-hidden="true"
            />
          </RouterLink>
        </nav>

        <div class="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            class="grid size-9 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-white/8 dark:hover:text-white"
            :title="theme === 'dark' ? 'Usar tema claro' : 'Usar tema oscuro'"
            :aria-label="theme === 'dark' ? 'Usar tema claro' : 'Usar tema oscuro'"
            @click="toggle"
          >
            <i
              :class="['mdi text-xl', theme === 'dark' ? 'mdi-weather-sunny' : 'mdi-weather-night']"
              aria-hidden="true"
            />
          </button>
          <UiNotificationBell
            v-if="tenant.currentId"
            :key="tenant.currentId"
            :client="notificationsApi"
            trigger-class="relative grid size-9 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-white/8 dark:hover:text-white"
            @navigate="(path) => router.push(path)"
          />
          <UiDropdown
            placement="bottom-end"
            min-width="16rem"
            aria-label="Menú de usuario"
            trigger-class="flex h-9 items-center gap-2 rounded-lg pl-1 pr-2 hover:bg-neutral-100 dark:hover:bg-white/8"
          >
            <template #trigger>
              <span
                class="grid size-7 place-items-center rounded-full bg-mint-100 text-[11px] font-semibold text-mint-800 dark:bg-mint-400/20 dark:text-mint-200"
              >
                {{ auth.user?.initials ?? '…' }}
              </span>
              <span
                class="hidden max-w-40 truncate text-sm font-medium text-neutral-700 lg:block dark:text-neutral-200"
              >
                {{ tenant.current?.name }}
              </span>
              <i class="mdi mdi-chevron-down hidden text-neutral-400 lg:block" aria-hidden="true" />
            </template>
            <div class="px-2.5 py-2">
              <p class="truncate text-sm font-medium">{{ auth.user?.fullName }}</p>
              <p class="truncate text-xs text-neutral-500 dark:text-neutral-400">
                {{ auth.user?.email }}
              </p>
              <p class="mt-1 truncate text-xs font-medium text-mint-700 dark:text-mint-300">
                {{ tenant.current?.name }}
              </p>
            </div>
            <UiDropdownSeparator />
            <UiDropdownItem
              icon="mdi-parking"
              label="Sorteo de parqueaderos"
              @click="router.push({ name: 'parking' })"
            />
            <UiDropdownItem
              icon="mdi-account-outline"
              label="Mi perfil"
              @click="router.push({ name: 'profile' })"
            />
            <UiDropdownItem
              v-if="tenant.residentTenants.length > 1"
              icon="mdi-swap-horizontal"
              label="Cambiar de conjunto"
              @click="switchTenant"
            />
            <UiDropdownSeparator />
            <UiDropdownItem icon="mdi-logout" label="Cerrar sesión" danger @click="auth.logout()" />
          </UiDropdown>
        </div>
      </div>
    </header>

    <EmailVerificationNotice v-if="route.name !== 'profile'" compact />

    <main class="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:py-8">
      <RouterView :key="tenant.currentId ?? ''" />
    </main>

    <!-- Tab bar on phones -->
    <nav
      class="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-neutral-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden dark:border-white/8 dark:bg-neutral-950/95"
      aria-label="Secciones"
    >
      <RouterLink
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        class="flex h-16 flex-col items-center justify-center gap-0.5 text-[11px] font-medium"
        :class="
          isActive(item)
            ? 'text-neutral-900 dark:text-white'
            : 'text-neutral-500 dark:text-neutral-400'
        "
        :aria-current="isActive(item) ? 'page' : undefined"
      >
        <i
          :class="[
            'mdi text-[22px] leading-none',
            isActive(item) ? `${item.active} text-mint-600 dark:text-mint-400` : item.icon,
          ]"
          aria-hidden="true"
        />
        {{ item.label }}
      </RouterLink>
    </nav>
  </div>
</template>
