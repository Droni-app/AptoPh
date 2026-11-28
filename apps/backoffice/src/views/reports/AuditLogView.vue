<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  UiAlert,
  UiBadge,
  UiButton,
  UiCard,
  UiInput,
  UiLabel,
  UiModal,
  UiPagination,
  UiSelect,
  UiSkeleton,
  useToast,
  type UiColor,
} from '@aptoph/ui'
import {
  AUDIT_ACTION_LABELS,
  AUDIT_ACTIONS,
  AUDIT_FIELD_LABELS,
  AUDIT_FULL_ROLES,
  AUDIT_MODULE_LABELS,
  AUDIT_MODULES,
  type AuditAction,
  type AuditLogDetail,
  type AuditLogEntry,
  type ReportExportFormat,
  type ReportOption,
} from '@aptoph/shared'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import { reportsApi, type AuditQuery } from '@/api/reports'
import { errorMessage } from '@/lib/errors'
import { formatDateTime, todayInput } from '@/lib/format'
import { useTenantStore } from '@/stores/tenant'

const route = useRoute()
const router = useRouter()
const tenant = useTenantStore()
const toast = useToast()

/** The accountant sees only the finance entries */
const full = computed(() => tenant.hasRole(...AUDIT_FULL_ROLES))

const text = (key: string) => (typeof route.query[key] === 'string' ? String(route.query[key]) : '')
const filters = reactive({
  from: text('from') || todayInput(-30),
  to: text('to') || todayInput(),
  module: text('module'),
  action: text('action'),
  userId: text('userId'),
  search: text('search'),
  recordId: text('recordId'),
})
const page = ref(Number(route.query.page ?? 1) || 1)

const entries = ref<AuditLogEntry[]>([])
const total = ref(0)
const perPage = ref(50)
const loading = ref(false)
const error = ref<string | null>(null)
const members = ref<ReportOption[]>([])
const downloading = ref<ReportExportFormat | null>(null)

const moduleOptions = computed(() => [
  { value: '', label: 'Todos' },
  ...AUDIT_MODULES.filter((module) => full.value || module === 'finance').map((module) => ({
    value: module,
    label: AUDIT_MODULE_LABELS[module],
  })),
])
const actionOptions = [
  { value: '', label: 'Todas' },
  ...AUDIT_ACTIONS.map((action) => ({ value: action, label: AUDIT_ACTION_LABELS[action] })),
]
const userOptions = computed(() => [{ value: '', label: 'Todas' }, ...members.value])

const actionColors: Record<AuditAction, UiColor> = {
  created: 'success',
  updated: 'primary',
  deleted: 'danger',
  restored: 'secondary',
  exported: 'warning',
}

const query = (): AuditQuery =>
  Object.fromEntries(
    Object.entries({ ...filters, page: page.value > 1 ? page.value : undefined }).filter(
      ([, value]) => value !== '' && value !== undefined,
    ),
  )

async function load() {
  loading.value = true
  error.value = null
  try {
    const response = await reportsApi.audit(query())
    entries.value = response.data
    total.value = response.metadata.total
    perPage.value = response.metadata.perPage
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}

function apply() {
  page.value = 1
  void router.replace({ query: query() as Record<string, string> })
  void load()
}

function paginate(next: number) {
  page.value = next
  void router.replace({ query: query() as Record<string, string> })
  void load()
}

function clearRecord() {
  filters.recordId = ''
  apply()
}

async function download(format: ReportExportFormat) {
  downloading.value = format
  try {
    await reportsApi.downloadAudit(format, query())
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    downloading.value = null
  }
}

// Detail

const detailOpen = ref(false)
const detail = ref<AuditLogDetail | null>(null)
const detailLoading = ref(false)

async function open(entry: AuditLogEntry) {
  detailOpen.value = true
  detail.value = null
  detailLoading.value = true
  try {
    detail.value = (await reportsApi.auditEntry(entry.id)).data
  } catch (e) {
    toast.error(errorMessage(e))
    detailOpen.value = false
  } finally {
    detailLoading.value = false
  }
}

const fieldLabel = (key: string) => AUDIT_FIELD_LABELS[key] ?? key

function valueText(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) return formatDateTime(value)
  if (typeof value === 'object') return JSON.stringify(value, null, 1)
  return String(value)
}

/** The rows of the change: field, before and after */
const changeRows = computed(() => {
  const changes = detail.value?.changes
  if (!changes) return []
  const before = changes.before ?? {}
  const after = changes.after ?? {}
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])]
  return keys.map((key) => ({
    key,
    label: fieldLabel(key),
    before: key in before ? valueText(before[key]) : null,
    after: key in after ? valueText(after[key]) : null,
  }))
})
const detailRows = computed(() =>
  Object.entries(detail.value?.changes?.details ?? {}).map(([key, value]) => ({
    key,
    label: fieldLabel(key),
    value: valueText(value),
  })),
)

const fieldsText = (entry: AuditLogEntry) =>
  entry.action === 'updated' ? entry.fields.map(fieldLabel).join(', ') : ''

onMounted(() => {
  void load()
  reportsApi
    .options()
    .then((response) => (members.value = response.data.members))
    .catch(() => {})
})
</script>

<template>
  <div>
    <PageHeader
      title="Auditoría"
      :subtitle="
        full
          ? 'Quién cambió qué y cuándo: dinero, censo, accesos, configuración y comunicaciones.'
          : 'Quién cambió qué y cuándo en las finanzas del conjunto.'
      "
    >
      <template #actions>
        <UiButton
          variant="outline"
          icon="mdi-file-delimited-outline"
          :loading="downloading === 'csv'"
          :disabled="!!downloading"
          @click="download('csv')"
        >
          CSV
        </UiButton>
        <UiButton
          color="primary"
          icon="mdi-microsoft-excel"
          :loading="downloading === 'xlsx'"
          :disabled="!!downloading"
          @click="download('xlsx')"
        >
          Excel
        </UiButton>
      </template>
    </PageHeader>

    <UiCard size="sm" class="mb-5">
      <form class="flex flex-wrap items-end gap-3" @submit.prevent="apply">
        <UiLabel title="Desde" class="w-full sm:w-auto">
          <UiInput v-model="filters.from" type="date" block />
        </UiLabel>
        <UiLabel title="Hasta" class="w-full sm:w-auto">
          <UiInput v-model="filters.to" type="date" block />
        </UiLabel>
        <UiLabel title="Módulo" class="w-full sm:w-44">
          <UiSelect v-model="filters.module" :options="moduleOptions" block />
        </UiLabel>
        <UiLabel title="Acción" class="w-full sm:w-40">
          <UiSelect v-model="filters.action" :options="actionOptions" block />
        </UiLabel>
        <UiLabel title="Persona" class="w-full sm:w-52">
          <UiSelect v-model="filters.userId" :options="userOptions" block />
        </UiLabel>
        <UiLabel title="Buscar" class="w-full sm:w-56">
          <UiInput
            v-model="filters.search"
            type="search"
            placeholder="Recibo, unidad, persona…"
            block
          />
        </UiLabel>
        <UiButton type="submit" color="primary" icon="mdi-magnify" :loading="loading">
          Filtrar
        </UiButton>
      </form>
      <p v-if="filters.recordId" class="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
        Mostrando la historia de un solo registro.
        <button
          type="button"
          class="font-medium text-brand-700 underline dark:text-mint-300"
          @click="clearRecord"
        >
          Ver todos
        </button>
      </p>
    </UiCard>

    <UiAlert v-if="error" color="danger" class="mb-5">{{ error }}</UiAlert>

    <div v-if="loading && !entries.length" class="space-y-2">
      <UiSkeleton v-for="n in 6" :key="n" class="h-12" />
    </div>

    <EmptyState
      v-else-if="!entries.length"
      title="No hay movimientos con estos filtros"
      description="Amplía el rango de fechas o quita algún filtro."
    />

    <template v-else>
      <div
        class="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-white/8 dark:bg-neutral-900"
        :class="loading && 'opacity-60'"
      >
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr
              class="border-b border-neutral-200 bg-neutral-50/80 text-left text-xs font-semibold text-neutral-500 dark:border-white/8 dark:bg-white/3 dark:text-neutral-400"
            >
              <th scope="col" class="h-10 px-3 pl-5 whitespace-nowrap">Fecha y hora</th>
              <th scope="col" class="px-3">Persona</th>
              <th scope="col" class="px-3">Acción</th>
              <th scope="col" class="px-3">Registro</th>
              <th scope="col" class="px-3">Campos</th>
              <th scope="col" class="px-3 pr-5">IP</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="entry in entries"
              :key="entry.id"
              class="cursor-pointer border-b border-neutral-100 last:border-0 hover:bg-neutral-50/70 dark:border-white/5 dark:hover:bg-white/3"
              tabindex="0"
              @click="open(entry)"
              @keydown.enter="open(entry)"
            >
              <td class="px-3 py-2.5 pl-5 whitespace-nowrap text-neutral-600 dark:text-neutral-400">
                {{ formatDateTime(entry.createdAt) }}
              </td>
              <td class="px-3 py-2.5">
                <span v-if="entry.user" class="text-neutral-900 dark:text-white">{{
                  entry.user.fullName
                }}</span>
                <span v-else class="text-neutral-500 italic">Sistema</span>
              </td>
              <td class="px-3 py-2.5">
                <UiBadge
                  :label="AUDIT_ACTION_LABELS[entry.action] ?? entry.action"
                  :color="actionColors[entry.action] ?? 'neutral'"
                />
              </td>
              <td class="px-3 py-2.5">
                <span class="block text-xs text-neutral-500">{{ entry.typeLabel }}</span>
                <span class="text-neutral-900 dark:text-white">{{ entry.label ?? '—' }}</span>
              </td>
              <td class="max-w-64 truncate px-3 py-2.5 text-neutral-600 dark:text-neutral-400">
                {{ fieldsText(entry) }}
              </td>
              <td class="px-3 py-2.5 pr-5 font-mono text-xs text-neutral-500">
                {{ entry.ipAddress ?? '' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <UiPagination
        v-if="total > perPage"
        class="mt-3 px-1"
        :page="page"
        :per-page="perPage"
        :total="total"
        @paginate="paginate"
      />
    </template>

    <UiModal
      v-model="detailOpen"
      :title="detail ? `${AUDIT_ACTION_LABELS[detail.action]} · ${detail.typeLabel}` : 'Detalle'"
      :description="detail?.label ?? undefined"
      size="lg"
      scrollable
    >
      <div v-if="detailLoading" class="space-y-2">
        <UiSkeleton class="h-6" />
        <UiSkeleton class="h-32" />
      </div>
      <template v-else-if="detail">
        <dl class="mb-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt class="text-xs text-neutral-500">Persona</dt>
            <dd class="text-neutral-900 dark:text-white">
              {{ detail.user?.fullName ?? 'Sistema' }}
              <span v-if="detail.user" class="block text-xs text-neutral-500">{{
                detail.user.email
              }}</span>
            </dd>
          </div>
          <div>
            <dt class="text-xs text-neutral-500">Fecha y hora</dt>
            <dd class="text-neutral-900 dark:text-white">{{ formatDateTime(detail.createdAt) }}</dd>
          </div>
          <div>
            <dt class="text-xs text-neutral-500">Dirección IP</dt>
            <dd class="font-mono text-neutral-900 dark:text-white">
              {{ detail.ipAddress ?? '—' }}
            </dd>
          </div>
        </dl>

        <table v-if="changeRows.length" class="w-full border-collapse text-sm">
          <thead>
            <tr
              class="border-b border-neutral-200 text-left text-xs text-neutral-500 dark:border-white/8"
            >
              <th scope="col" class="py-2 pr-3">Campo</th>
              <th v-if="detail.action !== 'created'" scope="col" class="px-3 py-2">Antes</th>
              <th v-if="detail.action !== 'deleted'" scope="col" class="py-2 pl-3">
                {{ detail.action === 'created' ? 'Valor' : 'Después' }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in changeRows"
              :key="row.key"
              class="border-b border-neutral-100 align-top last:border-0 dark:border-white/5"
            >
              <th
                scope="row"
                class="py-2 pr-3 text-left font-medium text-neutral-700 dark:text-neutral-300"
              >
                {{ row.label }}
              </th>
              <td
                v-if="detail.action !== 'created'"
                class="px-3 py-2 break-words whitespace-pre-wrap"
                :class="
                  detail.action === 'updated'
                    ? 'text-red-700 line-through decoration-red-300 dark:text-red-300'
                    : 'text-neutral-800 dark:text-neutral-200'
                "
              >
                {{ row.before ?? '—' }}
              </td>
              <td
                v-if="detail.action !== 'deleted'"
                class="py-2 pl-3 break-words whitespace-pre-wrap"
                :class="
                  detail.action === 'updated'
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-neutral-800 dark:text-neutral-200'
                "
              >
                {{ row.after ?? '—' }}
              </td>
            </tr>
          </tbody>
        </table>

        <dl v-if="detailRows.length" class="space-y-2 text-sm">
          <div v-for="row in detailRows" :key="row.key">
            <dt class="text-xs text-neutral-500">{{ row.label }}</dt>
            <dd class="break-words whitespace-pre-wrap text-neutral-900 dark:text-white">
              {{ row.value }}
            </dd>
          </div>
        </dl>

        <p v-if="!changeRows.length && !detailRows.length" class="text-sm text-neutral-500">
          Este movimiento no tiene detalle de campos.
        </p>
      </template>
      <template v-if="detail?.recordId" #footer>
        <UiButton
          variant="ghost"
          icon="mdi-history"
          @click="
            () => {
              filters.recordId = detail!.recordId!
              detailOpen = false
              apply()
            }
          "
        >
          Ver la historia de este registro
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>
