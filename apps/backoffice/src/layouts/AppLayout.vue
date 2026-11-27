<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { UiDropdown, UiDropdownItem, UiDropdownSeparator, UiNotificationBell } from '@aptoph/ui'
import { notificationsApi } from '@/api/account'
import { ROLE_LABELS } from '@aptoph/shared'
import { useAuthStore } from '@/stores/auth'
import { useTenantStore } from '@/stores/tenant'
import { useSubscriptionStore } from '@/stores/subscription'
import { useTheme } from '@/composables/useTheme'
import BrandLogo from '@/components/BrandLogo.vue'
import EmailVerificationNotice from '@/components/account/EmailVerificationNotice.vue'
import { currentTrail, navigation, type NavLink } from './navigation'
import logoWhite from '../../../../branding/logo/aptoph-logo-horizontal-white.svg?url'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const tenant = useTenantStore()
const subscription = useSubscriptionStore()
const { theme, toggle } = useTheme()

const drawer = ref(false)
watch(
  () => route.fullPath,
  () => (drawer.value = false),
)

const groups = computed(() =>
  navigation({
    canReadFinance: tenant.canReadFinance,
    canManageFinance: tenant.canManageFinance,
    canManage: tenant.canManage,
    canReadTickets: tenant.canReadTickets,
    canUseVisitorParking: tenant.canUseVisitorParking,
    canReadParking: tenant.canReadParking,
    canReadAmenities: tenant.canReadAmenities,
    hasSubscription: subscription.current !== null,
  }),
)
const routeName = computed(() => String(route.name ?? ''))
const isActive = (item: NavLink) => item.match.includes(routeName.value)
const trail = computed(() => currentTrail(groups.value, routeName.value))

const trialChip = computed(() => {
  const days = subscription.trialDaysLeft
  if (subscription.current?.status !== 'trialing' || subscription.locked || days === null)
    return null
  return `Prueba: ${days} ${days === 1 ? 'día' : 'días'}`
})
const roleLabel = computed(() => tenant.roles.map((role) => ROLE_LABELS[role]).join(', '))

async function switchTenant() {
  tenant.select(null)
  await router.push({ name: 'select-tenant' })
}
</script>

<template>
  <div class="min-h-full lg:pl-64">
    <!-- Sidebar: fixed on desktop, a drawer on small screens -->
    <Transition
      enter-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="drawer"
        class="fixed inset-0 z-40 bg-neutral-950/50 lg:hidden"
        aria-hidden="true"
        @click="drawer = false"
      />
    </Transition>
    <aside
      class="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-rail text-neutral-300 transition-transform duration-200 lg:translate-x-0 dark:border-r dark:border-white/6"
      :class="drawer ? 'translate-x-0' : '-translate-x-full'"
      aria-label="Menú principal"
    >
      <div class="flex h-16 shrink-0 items-center justify-between px-5">
        <RouterLink to="/" class="flex h-7 items-center" aria-label="AptoPH, ir al inicio">
          <img :src="logoWhite" alt="AptoPH" class="h-full w-auto" />
        </RouterLink>
        <button
          type="button"
          class="grid size-8 place-items-center rounded-lg text-neutral-400 hover:bg-rail-hover hover:text-white lg:hidden"
          aria-label="Cerrar menú"
          @click="drawer = false"
        >
          <i class="mdi mdi-close text-xl" aria-hidden="true" />
        </button>
      </div>

      <!-- Current conjunto -->
      <div class="px-3 pb-3">
        <component
          :is="tenant.backofficeTenants.length > 1 ? 'button' : 'div'"
          type="button"
          class="flex w-full items-center gap-3 rounded-lg bg-white/5 px-3 py-2.5 text-left ring-1 ring-white/8"
          :class="tenant.backofficeTenants.length > 1 && 'transition-colors hover:bg-white/8'"
          :title="tenant.backofficeTenants.length > 1 ? 'Cambiar de conjunto' : undefined"
          @click="tenant.backofficeTenants.length > 1 && switchTenant()"
        >
          <span
            class="grid size-9 shrink-0 place-items-center rounded-md bg-mint-400/15 text-mint-300"
          >
            <i class="mdi mdi-office-building text-xl" aria-hidden="true" />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-semibold text-white">{{
              tenant.current?.name
            }}</span>
            <span class="block truncate text-xs text-neutral-400">{{ roleLabel }}</span>
          </span>
          <i
            v-if="tenant.backofficeTenants.length > 1"
            class="mdi mdi-unfold-more-horizontal text-lg text-neutral-500"
            aria-hidden="true"
          />
        </component>
      </div>

      <nav
        class="flex-1 overflow-y-auto px-3 pb-6 [scrollbar-color:rgb(255_255_255/0.15)_transparent] [scrollbar-width:thin]"
        aria-label="Secciones"
      >
        <div v-for="group in groups" :key="group.label" class="mt-5 first:mt-2">
          <p class="mb-1.5 px-3 text-xs font-medium text-neutral-500">{{ group.label }}</p>
          <ul class="space-y-0.5">
            <li v-for="item in group.items" :key="item.label">
              <RouterLink
                :to="item.to"
                class="group relative flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors"
                :class="
                  isActive(item) && !item.children
                    ? 'bg-white/10 text-white'
                    : isActive(item)
                      ? 'text-white'
                      : 'text-neutral-300 hover:bg-rail-hover hover:text-white'
                "
                :aria-current="isActive(item) && !item.children ? 'page' : undefined"
              >
                <span
                  v-if="isActive(item) && !item.children"
                  class="absolute top-2 bottom-2 -left-3 w-1 rounded-r-full bg-mint-400"
                  aria-hidden="true"
                />
                <i
                  :class="[
                    'mdi text-lg',
                    item.icon,
                    isActive(item)
                      ? 'text-mint-300'
                      : 'text-neutral-500 group-hover:text-neutral-300',
                  ]"
                  aria-hidden="true"
                />
                <span class="flex-1 truncate">{{ item.label }}</span>
                <i
                  v-if="item.children"
                  class="mdi text-base text-neutral-500"
                  :class="isActive(item) ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                  aria-hidden="true"
                />
              </RouterLink>
              <ul
                v-if="item.children && isActive(item)"
                class="mt-0.5 mb-1 ml-[1.375rem] space-y-0.5 border-l border-white/10 pl-3"
              >
                <li v-for="child in item.children" :key="child.label">
                  <RouterLink
                    :to="child.to"
                    class="flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] transition-colors"
                    :class="
                      isActive(child)
                        ? 'bg-white/10 font-medium text-white'
                        : 'text-neutral-400 hover:bg-rail-hover hover:text-white'
                    "
                    :aria-current="isActive(child) ? 'page' : undefined"
                  >
                    <i
                      :class="[
                        'mdi text-base',
                        child.icon,
                        isActive(child) ? 'text-mint-300' : 'text-neutral-500',
                      ]"
                      aria-hidden="true"
                    />
                    {{ child.label }}
                  </RouterLink>
                </li>
              </ul>
            </li>
          </ul>
        </div>
      </nav>
    </aside>

    <!-- Top bar -->
    <header
      class="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-neutral-200 bg-white/85 px-4 backdrop-blur-md sm:px-6 lg:px-8 dark:border-white/8 dark:bg-neutral-950/80"
    >
      <button
        type="button"
        class="-ml-1 grid size-9 place-items-center rounded-lg text-neutral-600 hover:bg-neutral-100 lg:hidden dark:text-neutral-300 dark:hover:bg-white/8"
        aria-label="Abrir menú"
        :aria-expanded="drawer"
        @click="drawer = true"
      >
        <i class="mdi mdi-menu text-2xl" aria-hidden="true" />
      </button>
      <RouterLink to="/" class="h-7 lg:hidden" aria-label="AptoPH, ir al inicio">
        <BrandLogo kind="symbol" />
      </RouterLink>

      <nav
        v-if="trail.length"
        aria-label="Ubicación"
        class="hidden min-w-0 items-center gap-1.5 text-sm sm:flex"
      >
        <template v-for="(crumb, index) in trail" :key="crumb">
          <i v-if="index" class="mdi mdi-chevron-right text-neutral-400" aria-hidden="true" />
          <span
            class="truncate"
            :class="
              index === trail.length - 1
                ? 'font-medium text-neutral-900 dark:text-white'
                : 'text-neutral-500 dark:text-neutral-400'
            "
            >{{ crumb }}</span
          >
        </template>
      </nav>

      <div class="ml-auto flex items-center gap-1.5">
        <RouterLink
          v-if="trialChip"
          to="/plan"
          class="hidden h-8 items-center gap-1.5 rounded-full bg-coral-50 px-3 text-xs font-semibold text-coral-700 ring-1 ring-coral-100 ring-inset hover:bg-coral-100 sm:inline-flex dark:bg-coral-400/15 dark:text-coral-300 dark:ring-coral-400/20"
        >
          <i class="mdi mdi-timer-sand" aria-hidden="true" /> {{ trialChip }}
        </RouterLink>
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
              class="grid size-7 place-items-center rounded-full bg-brand-700 text-[11px] font-semibold text-white dark:bg-brand-300 dark:text-neutral-950"
            >
              {{ auth.user?.initials ?? '…' }}
            </span>
            <span
              class="hidden max-w-36 truncate text-sm font-medium text-neutral-700 md:block dark:text-neutral-200"
            >
              {{ auth.user?.fullName }}
            </span>
            <i class="mdi mdi-chevron-down hidden text-neutral-400 md:block" aria-hidden="true" />
          </template>
          <div class="px-2.5 py-2">
            <p class="truncate text-sm font-medium">{{ auth.user?.fullName }}</p>
            <p class="truncate text-xs text-neutral-500 dark:text-neutral-400">
              {{ auth.user?.email }}
            </p>
          </div>
          <UiDropdownSeparator />
          <UiDropdownItem
            icon="mdi-account-outline"
            label="Mi perfil"
            @click="router.push({ name: 'profile' })"
          />
          <UiDropdownItem
            v-if="tenant.backofficeTenants.length > 1"
            icon="mdi-swap-horizontal"
            label="Cambiar de conjunto"
            @click="switchTenant"
          />
          <UiDropdownSeparator />
          <UiDropdownItem icon="mdi-logout" label="Cerrar sesión" danger @click="auth.logout()" />
        </UiDropdown>
      </div>
    </header>

    <div
      v-if="subscription.locked || subscription.showTrialReminder"
      role="status"
      class="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-b px-4 py-2.5 text-center text-sm"
      :class="
        subscription.locked
          ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200'
          : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100'
      "
    >
      <i
        :class="['mdi text-base', subscription.locked ? 'mdi-lock-outline' : 'mdi-timer-sand']"
        aria-hidden="true"
      />
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
      <RouterLink to="/plan" class="font-semibold underline underline-offset-2">
        {{ subscription.locked ? 'Activar mi plan' : 'Ver el plan' }}
      </RouterLink>
    </div>

    <EmailVerificationNotice v-if="route.name !== 'profile'" compact />

    <main class="mx-auto w-full max-w-[90rem] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <RouterView :key="tenant.currentId ?? ''" />
    </main>
  </div>
</template>
