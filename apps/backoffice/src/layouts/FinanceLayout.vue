<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { useTenantStore } from '@/stores/tenant'

const route = useRoute()
const tenant = useTenantStore()

const links = computed(() =>
  [
    { label: 'Resumen', icon: 'mdi mdi-chart-box-outline', name: 'finance', match: ['finance'] },
    {
      label: 'Facturación',
      icon: 'mdi mdi-file-document-multiple-outline',
      name: 'finance-billing',
      match: ['finance-billing'],
    },
    {
      label: 'Tarifas',
      icon: 'mdi mdi-calculator-variant-outline',
      name: 'finance-fees',
      match: ['finance-fees'],
    },
    {
      label: 'Recaudo',
      icon: 'mdi mdi-cash-check',
      name: 'finance-payments',
      match: ['finance-payments'],
    },
    {
      label: 'Cartera',
      icon: 'mdi mdi-account-cash-outline',
      name: 'finance-receivables',
      match: ['finance-receivables', 'finance-statement'],
    },
    {
      label: 'Gastos',
      icon: 'mdi mdi-receipt-text-outline',
      name: 'finance-expenses',
      match: ['finance-expenses'],
    },
    {
      label: 'Bancos',
      icon: 'mdi mdi-bank-outline',
      name: 'finance-banks',
      match: ['finance-banks'],
    },
    {
      label: 'Presupuesto',
      icon: 'mdi mdi-chart-donut',
      name: 'finance-budgets',
      match: ['finance-budgets', 'finance-budget'],
    },
    {
      label: 'Contabilidad',
      icon: 'mdi mdi-book-open-variant',
      name: 'finance-accounting',
      match: ['finance-accounting'],
    },
    {
      label: 'Informes',
      icon: 'mdi mdi-file-chart-outline',
      name: 'finance-reports',
      match: ['finance-reports'],
    },
    {
      label: 'Configuración',
      icon: 'mdi mdi-cog-outline',
      name: 'finance-settings',
      match: ['finance-settings'],
      manage: true,
    },
  ].filter((link) => !link.manage || tenant.canManageFinance),
)
</script>

<template>
  <nav
    aria-label="Secciones de finanzas"
    class="-mx-4 mb-6 overflow-x-auto border-b border-neutral-200 px-4 sm:mx-0 sm:px-0 dark:border-white/10"
  >
    <ul class="flex min-w-max gap-1">
      <li v-for="link in links" :key="link.name">
        <RouterLink
          :to="{ name: link.name }"
          class="-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors"
          :class="
            link.match.includes(String(route.name))
              ? 'border-mint-600 text-brand-700 dark:border-mint-400 dark:text-white'
              : 'border-transparent text-neutral-500 hover:text-brand-700 dark:text-neutral-400 dark:hover:text-white'
          "
          :aria-current="link.match.includes(String(route.name)) ? 'page' : undefined"
        >
          <i :class="link.icon" aria-hidden="true" />{{ link.label }}
        </RouterLink>
      </li>
    </ul>
  </nav>
  <RouterView />
</template>
