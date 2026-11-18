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
import { useTheme } from '@/composables/useTheme'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const tenant = useTenantStore()
const { theme, toggle } = useTheme()

const sections: Array<{ label: string; icon: string; to: string; match: string[] }> = [
  { label: 'Inicio', icon: 'mdi mdi-view-dashboard-outline', to: '/', match: ['dashboard'] },
  { label: 'Unidades', icon: 'mdi mdi-door', to: '/unidades', match: ['units', 'unit'] },
  { label: 'Torres', icon: 'mdi mdi-office-building-outline', to: '/torres', match: ['buildings'] },
  { label: 'Personas', icon: 'mdi mdi-account-group-outline', to: '/personas', match: ['members'] },
]

const items = computed<NavbarItem[]>(() =>
  sections.map((section) => ({
    label: section.label,
    icon: section.icon,
    to: section.to,
    active: section.match.includes(String(route.name)),
  })),
)

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
        <RouterLink to="/" class="flex items-center gap-2 font-semibold">
          <span class="text-2xl text-violet-600 dark:text-violet-400" aria-hidden="true">
            <i class="mdi mdi-office-building-cog" />
          </span>
          <span class="hidden sm:inline">AptoPH</span>
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
          <span class="text-lg"><i :class="theme === 'dark' ? 'mdi mdi-weather-sunny' : 'mdi mdi-weather-night'" /></span>
        </DuiButton>
        <DuiDropdown placement="bottom-end" min-width="16rem" aria-label="Menú de usuario">
          <template #trigger>
            <span class="flex items-center gap-2">
              <span
                class="grid size-8 place-items-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700 dark:bg-violet-500/20 dark:text-violet-200"
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
            <p class="mt-1 text-xs text-violet-600 dark:text-violet-300">{{ roleLabel }}</p>
          </div>
          <DuiDropdownSeparator />
          <DuiDropdownItem
            v-if="tenant.backofficeTenants.length > 1"
            icon="mdi mdi-swap-horizontal"
            label="Cambiar de conjunto"
            @click="switchTenant"
          />
          <DuiDropdownItem icon="mdi mdi-logout" label="Cerrar sesión" danger @click="auth.logout()" />
        </DuiDropdown>
      </template>
    </DuiNavbar>

    <main class="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
      <RouterView :key="tenant.currentId ?? ''" />
    </main>
  </div>
</template>
