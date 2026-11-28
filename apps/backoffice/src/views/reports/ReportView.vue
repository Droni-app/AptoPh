<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter, type RouteLocationRaw } from 'vue-router'
import {
  UiAlert,
  UiButton,
  UiCard,
  UiInput,
  UiLabel,
  UiSelect,
  UiSkeleton,
  useToast,
} from '@aptoph/ui'
import {
  canReadReport,
  reportByKey,
  type ReportCell,
  type ReportExportFormat,
  type ReportFilter,
  type ReportMetric,
  type ReportOptions,
  type ReportResult,
} from '@aptoph/shared'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import { reportsApi, type ReportQuery } from '@/api/reports'
import { errorMessage, fieldErrors } from '@/lib/errors'
import { formatDateTime } from '@/lib/format'
import { filterDefault, formatCell, isNumericColumn } from '@/lib/reports'
import { useTenantStore } from '@/stores/tenant'

const route = useRoute()
const router = useRouter()
const tenant = useTenantStore()
const toast = useToast()

const definition = computed(() => reportByKey(String(route.params.key)))
const allowed = computed(() => !!definition.value && canReadReport(definition.value, tenant.roles))

const values = reactive<Record<string, string>>({})
const options = ref<ReportOptions | null>(null)
const result = ref<ReportResult | null>(null)
const loading = ref(false)
const downloading = ref<ReportExportFormat | null>(null)
const error = ref<string | null>(null)
const errors = ref<Record<string, string>>({})

/** The filters start from the URL (a shared link) or from their defaults */
function resetValues() {
  for (const key of Object.keys(values)) delete values[key]
  for (const filter of definition.value?.filters ?? []) {
    const fromUrl = route.query[filter.key]
    values[filter.key] = typeof fromUrl === 'string' ? fromUrl : filterDefault(filter)
  }
}

const query = (): ReportQuery =>
  Object.fromEntries(Object.entries(values).filter(([, value]) => value !== ''))

function selectOptions(filter: Extract<ReportFilter, { type: 'select' }>) {
  const list = filter.options ?? (filter.source ? (options.value?.[filter.source] ?? []) : [])
  // Selects with a default (the grouping) always have a value
  return filter.default ? list : [{ value: '', label: filter.emptyLabel ?? 'Todos' }, ...list]
}

async function load() {
  if (!definition.value || !allowed.value) return
  loading.value = true
  error.value = null
  errors.value = {}
  try {
    result.value = (await reportsApi.run(definition.value.key, query())).data
  } catch (e) {
    errors.value = fieldErrors(e)
    error.value = Object.keys(errors.value).length ? null : errorMessage(e)
    if (!error.value) result.value = null
  } finally {
    loading.value = false
  }
}

function apply() {
  void router.replace({ query: query() })
  void load()
}

function reset() {
  void router.replace({ query: {} }).then(() => {
    resetValues()
    void load()
  })
}

async function download(format: ReportExportFormat) {
  if (!definition.value) return
  downloading.value = format
  try {
    await reportsApi.download(definition.value.key, format, query())
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    downloading.value = null
  }
}

const print = () => window.print()

const numericKeys = computed(
  () => new Set(result.value?.columns.filter((c) => isNumericColumn(c.type)).map((c) => c.key)),
)

/** The route a row opens (e.g. the statement of the unit), from its hidden columns */
function linkOf(row: Record<string, ReportCell>): RouteLocationRaw | null {
  const link = result.value?.rowLink
  if (!link) return null
  const params: Record<string, string> = {}
  for (const [param, column] of Object.entries(link.params)) {
    const value = row[column]
    if (value === null || value === undefined || value === '') return null
    params[param] = String(value)
  }
  return { name: link.route, params }
}

const tones: Record<NonNullable<ReportMetric['tone']>, string> = {
  neutral: 'text-neutral-900 dark:text-white',
  good: 'text-emerald-700 dark:text-emerald-300',
  warning: 'text-amber-700 dark:text-amber-300',
  danger: 'text-red-700 dark:text-red-300',
}

onMounted(async () => {
  resetValues()
  if (!allowed.value) return
  const needsOptions = definition.value!.filters.some((f) => f.type === 'select' && f.source)
  await Promise.all([
    load(),
    needsOptions
      ? reportsApi
          .options()
          .then((response) => (options.value = response.data))
          .catch((e) => toast.error(errorMessage(e)))
      : null,
  ])
})

watch(
  () => route.params.key,
  (key, previous) => {
    if (key && key !== previous && route.name === 'report') {
      result.value = null
      resetValues()
      void load()
    }
  },
)
</script>

<template>
  <div>
    <EmptyState
      v-if="!definition || !allowed"
      :title="definition ? 'Tu rol no puede consultar este reporte' : 'El reporte no existe'"
      description="Vuelve al catálogo para ver los reportes disponibles."
    >
      <UiButton :to="{ name: 'reports' }" icon="mdi-arrow-left">Ver los reportes</UiButton>
    </EmptyState>

    <template v-else>
      <PageHeader :title="result?.title ?? definition.title" :subtitle="definition.description">
        <template #before>
          <RouterLink
            :to="{ name: 'reports' }"
            class="mb-1 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800 print:hidden dark:hover:text-white"
          >
            <i class="mdi mdi-arrow-left" aria-hidden="true" /> Reportes
          </RouterLink>
          <p class="hidden text-sm font-semibold text-neutral-700 print:block">
            {{ tenant.current?.name }}
          </p>
        </template>
        <template #actions>
          <div class="flex gap-2 print:hidden">
            <UiButton
              variant="outline"
              icon="mdi-printer-outline"
              :disabled="!result || loading"
              title="Imprimir o guardar como PDF"
              @click="print"
            >
              Imprimir / PDF
            </UiButton>
            <UiButton
              variant="outline"
              icon="mdi-file-delimited-outline"
              :loading="downloading === 'csv'"
              :disabled="!result || loading || !!downloading"
              @click="download('csv')"
            >
              CSV
            </UiButton>
            <UiButton
              color="primary"
              icon="mdi-microsoft-excel"
              :loading="downloading === 'xlsx'"
              :disabled="!result || loading || !!downloading"
              @click="download('xlsx')"
            >
              Excel
            </UiButton>
          </div>
        </template>
      </PageHeader>

      <UiCard v-if="definition.filters.length" size="sm" class="mb-5 print:hidden">
        <form class="flex flex-wrap items-end gap-3" @submit.prevent="apply">
          <UiLabel
            v-for="filter in definition.filters"
            :key="filter.key"
            :title="filter.label"
            :error="errors[filter.key]"
            class="w-full sm:w-auto sm:min-w-44"
          >
            <UiSelect
              v-if="filter.type === 'select'"
              v-model="values[filter.key]"
              :options="selectOptions(filter)"
              block
            />
            <UiInput
              v-else-if="filter.type === 'number'"
              v-model="values[filter.key]"
              type="number"
              inputmode="decimal"
              :min="filter.min ?? 0"
              :placeholder="filter.placeholder"
              block
            />
            <UiInput
              v-else
              v-model="values[filter.key]"
              :type="filter.type === 'month' ? 'month' : 'date'"
              block
            />
          </UiLabel>
          <div class="flex gap-2">
            <UiButton type="submit" color="primary" icon="mdi-magnify" :loading="loading">
              Generar
            </UiButton>
            <UiButton variant="ghost" @click="reset">Restablecer</UiButton>
          </div>
        </form>
      </UiCard>

      <UiAlert v-if="error" color="danger" class="mb-5">{{ error }}</UiAlert>

      <div v-if="loading && !result" class="space-y-3">
        <UiSkeleton class="h-20" />
        <UiSkeleton class="h-72" />
      </div>

      <template v-else-if="result">
        <!-- Printed header: what and with which filters -->
        <div class="mb-4 text-sm text-neutral-600 dark:text-neutral-400">
          <p v-if="result.period" class="font-medium text-neutral-800 dark:text-neutral-200">
            {{ result.period }}
          </p>
          <p v-if="result.filters.length" class="mt-0.5">
            <template v-for="(filter, index) in result.filters" :key="filter.label">
              <span v-if="index"> · </span>{{ filter.label }}: {{ filter.value }}
            </template>
          </p>
          <p class="mt-0.5 text-xs text-neutral-500">
            Generado el {{ formatDateTime(result.generatedAt) }}
          </p>
        </div>

        <dl
          v-if="result.summary.length"
          class="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5 print:grid-cols-4"
        >
          <div
            v-for="metric in result.summary"
            :key="metric.label"
            class="rounded-xl border border-neutral-200 bg-white p-4 dark:border-white/8 dark:bg-neutral-900 print:break-inside-avoid"
          >
            <dt class="text-xs text-neutral-500 dark:text-neutral-400">{{ metric.label }}</dt>
            <dd
              class="mt-1 text-lg font-bold tabular-nums"
              :class="tones[metric.tone ?? 'neutral']"
            >
              {{ formatCell(metric.type, metric.value) }}
            </dd>
            <dd v-if="metric.hint" class="mt-0.5 text-xs text-neutral-500">{{ metric.hint }}</dd>
          </div>
        </dl>

        <UiAlert v-if="result.truncated" color="warning" class="mb-4">
          El reporte tiene más filas de las que se muestran. Acota los filtros para verlo completo.
        </UiAlert>

        <EmptyState
          v-if="!result.rows.length"
          title="No hay datos con estos filtros"
          description="Cambia el periodo o quita algún filtro."
        />

        <div
          v-else
          class="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-white/8 dark:bg-neutral-900 print:overflow-visible print:rounded-none print:border-0"
          :class="loading && 'opacity-60'"
        >
          <table class="w-full border-collapse text-sm print:text-[10px]">
            <thead>
              <tr
                class="border-b border-neutral-200 bg-neutral-50/80 text-left dark:border-white/8 dark:bg-white/3"
              >
                <th
                  v-for="column in result.columns"
                  :key="column.key"
                  scope="col"
                  class="h-10 px-3 text-xs font-semibold whitespace-nowrap text-neutral-500 first:pl-5 last:pr-5 dark:text-neutral-400 print:h-auto print:px-1.5 print:py-1"
                  :class="numericKeys.has(column.key) && 'text-right'"
                >
                  {{ column.label }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, index) in result.rows"
                :key="index"
                class="border-b border-neutral-100 last:border-0 hover:bg-neutral-50/70 dark:border-white/5 dark:hover:bg-white/3 print:break-inside-avoid"
              >
                <td
                  v-for="(column, columnIndex) in result.columns"
                  :key="column.key"
                  class="px-3 py-2.5 align-top text-neutral-800 first:pl-5 last:pr-5 dark:text-neutral-200 print:px-1.5 print:py-1"
                  :class="[
                    numericKeys.has(column.key) && 'text-right whitespace-nowrap tabular-nums',
                    row._reversed && 'text-neutral-400 line-through',
                  ]"
                >
                  <RouterLink
                    v-if="columnIndex === 0 && linkOf(row)"
                    :to="linkOf(row)!"
                    class="font-medium text-brand-700 hover:underline dark:text-mint-300 print:text-inherit"
                  >
                    {{ formatCell(column.type, row[column.key]) }}
                  </RouterLink>
                  <template v-else>{{ formatCell(column.type, row[column.key]) }}</template>
                </td>
              </tr>
            </tbody>
            <tfoot v-if="result.totals">
              <tr
                class="border-t-2 border-neutral-300 bg-neutral-50 font-semibold dark:border-white/15 dark:bg-white/3"
              >
                <td
                  v-for="column in result.columns"
                  :key="column.key"
                  class="px-3 py-2.5 text-neutral-900 first:pl-5 last:pr-5 dark:text-white print:px-1.5 print:py-1"
                  :class="
                    numericKeys.has(column.key) && 'text-right whitespace-nowrap tabular-nums'
                  "
                >
                  {{
                    result.totals[column.key] === undefined || result.totals[column.key] === null
                      ? ''
                      : formatCell(column.type, result.totals[column.key])
                  }}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p v-if="result.rows.length" class="mt-2 text-xs text-neutral-500 print:hidden">
          {{ result.rows.length.toLocaleString('es-CO') }}
          {{ result.rows.length === 1 ? 'fila' : 'filas' }}
        </p>

        <ul
          v-if="result.notes.length"
          class="mt-4 space-y-1 text-sm text-neutral-600 dark:text-neutral-400"
        >
          <li v-for="note in result.notes" :key="note" class="flex gap-2">
            <i class="mdi mdi-information-outline mt-0.5 text-neutral-400" aria-hidden="true" />
            {{ note }}
          </li>
        </ul>
      </template>
    </template>
  </div>
</template>
