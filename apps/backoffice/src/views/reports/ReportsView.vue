<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { UiInput } from '@aptoph/ui'
import {
  canReadReport,
  REPORT_CATEGORIES,
  REPORT_CATEGORY_ICONS,
  REPORT_CATEGORY_LABELS,
  REPORT_LINKS,
  REPORTS,
} from '@aptoph/shared'
import type { RouteLocationRaw } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import { useTenantStore } from '@/stores/tenant'

const tenant = useTenantStore()
const search = ref('')

type Card = {
  id: string
  title: string
  description: string
  audience: string
  to: RouteLocationRaw
  personalData: boolean
  external: boolean
}

const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** The catalog of the role, by category, with the reports of other screens */
const groups = computed(() => {
  const roles = tenant.roles
  const term = normalize(search.value.trim())
  const matches = (card: Card) =>
    !term || normalize(`${card.title} ${card.description} ${card.audience}`).includes(term)
  return REPORT_CATEGORIES.map((category) => {
    const cards: Card[] = [
      ...REPORTS.filter((r) => r.category === category && canReadReport(r, roles)).map((r) => ({
        id: r.key,
        title: r.title,
        description: r.description,
        audience: r.audience,
        to: { name: 'report', params: { key: r.key } },
        personalData: r.personalData === true,
        external: false,
      })),
      ...REPORT_LINKS.filter((l) => l.category === category && canReadReport(l, roles)).map(
        (l) => ({
          id: l.route,
          title: l.title,
          description: l.description,
          audience: l.audience,
          to: { name: l.route, query: l.query },
          personalData: false,
          external: true,
        }),
      ),
    ].filter(matches)
    return {
      category,
      label: REPORT_CATEGORY_LABELS[category],
      icon: REPORT_CATEGORY_ICONS[category],
      cards,
    }
  }).filter((group) => group.cards.length)
})
</script>

<template>
  <div>
    <PageHeader
      title="Reportes"
      subtitle="Informes para la administración, el consejo, el contador y el revisor fiscal. Todos se pueden filtrar, imprimir y descargar en Excel."
    >
      <template #actions>
        <UiInput
          v-model="search"
          type="search"
          placeholder="Buscar un reporte"
          aria-label="Buscar un reporte"
          class="w-full sm:w-72"
        />
      </template>
    </PageHeader>

    <EmptyState
      v-if="!groups.length"
      title="Ningún reporte coincide"
      description="Prueba con otra palabra: cartera, recaudo, proveedores, parqueaderos…"
    />

    <section v-for="group in groups" :key="group.category" class="mb-8">
      <h2
        class="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-200"
      >
        <i
          :class="['mdi text-lg text-brand-600 dark:text-mint-300', group.icon]"
          aria-hidden="true"
        />
        {{ group.label }}
      </h2>
      <ul class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <li v-for="card in group.cards" :key="card.id">
          <RouterLink
            :to="card.to"
            class="flex h-full flex-col rounded-xl border border-neutral-200 bg-white p-4 transition-colors hover:border-brand-300 hover:bg-brand-50/40 focus-visible:outline-2 focus-visible:outline-brand-500 dark:border-white/8 dark:bg-neutral-900 dark:hover:border-mint-400/40 dark:hover:bg-white/3"
          >
            <span class="flex items-start justify-between gap-2">
              <span class="font-semibold text-neutral-900 dark:text-white">{{ card.title }}</span>
              <i
                v-if="card.external"
                class="mdi mdi-arrow-top-right text-neutral-400"
                title="Se abre en otra sección"
                aria-hidden="true"
              />
            </span>
            <span class="mt-1 flex-1 text-sm text-neutral-600 dark:text-neutral-400">{{
              card.description
            }}</span>
            <span class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
              <span
                ><i class="mdi mdi-account-group-outline" aria-hidden="true" />
                {{ card.audience }}</span
              >
              <span v-if="card.personalData" class="text-amber-700 dark:text-amber-300">
                <i class="mdi mdi-shield-account-outline" aria-hidden="true" /> Datos personales
              </span>
            </span>
          </RouterLink>
        </li>
      </ul>
    </section>
  </div>
</template>
