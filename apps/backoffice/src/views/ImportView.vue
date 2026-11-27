<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { UiAlert, UiButton, UiTabs, useToast } from '@aptoph/ui'
import {
  IMPORT_COLUMNS,
  IMPORT_MAX_MB,
  IMPORT_MAX_ROWS,
  importExampleCsv,
  type ImportPlanRow,
} from '@aptoph/shared'
import PageHeader from '@/components/PageHeader.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import ImportRowItem, { type RowState } from '@/components/import/ImportRowItem.vue'
import { importApi } from '@/api/backoffice'
import { errorMessage, fieldErrors } from '@/lib/errors'

const toast = useToast()
const stepClass =
  'grid size-6 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700 dark:bg-brand-400/15 dark:text-brand-200'

// ---------------------------------------------------------------- file

const fileName = ref<string | null>(null)
const reading = ref(false)
const fileError = ref<string | null>(null)
const dragging = ref(false)
const input = ref<HTMLInputElement | null>(null)

function downloadExample() {
  const blob = new Blob([importExampleCsv()], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'aptoph-importacion-ejemplo.csv'
  link.click()
  URL.revokeObjectURL(url)
}

async function read(file: File | undefined) {
  if (!file) return
  fileError.value = null
  if (!/\.(csv|txt)$/i.test(file.name)) {
    fileError.value = 'El archivo debe ser CSV. En Excel: Archivo › Guardar como › CSV.'
    return
  }
  if (file.size > IMPORT_MAX_MB * 1024 * 1024) {
    fileError.value = `El archivo pesa más de ${IMPORT_MAX_MB} MB`
    return
  }
  reading.value = true
  try {
    const { data } = await importApi.preview(file)
    rows.value = data.rows
    states.value = Object.fromEntries(data.rows.map((row) => [row.line, 'pending' as RowState]))
    failures.value = {}
    fileName.value = file.name
    filter.value = 'all'
  } catch (e) {
    fileError.value = fieldErrors(e).file ?? errorMessage(e)
  } finally {
    reading.value = false
  }
}
function pick(event: Event) {
  const target = event.target as HTMLInputElement
  read(target.files?.[0])
  target.value = ''
}
function drop(event: DragEvent) {
  dragging.value = false
  read(event.dataTransfer?.files[0])
}
function reset() {
  rows.value = []
  fileName.value = null
}

// ---------------------------------------------------------------- preview

const rows = ref<ImportPlanRow[]>([])
const states = ref<Record<number, RowState>>({})
const failures = ref<Record<number, string>>({})
const stateOf = (row: ImportPlanRow) => states.value[row.line] ?? 'pending'
const isOpen = (row: ImportPlanRow) => ['pending', 'failed', 'importing'].includes(stateOf(row))
const importable = (row: ImportPlanRow) =>
  isOpen(row) && stateOf(row) !== 'importing' && ['create', 'update'].includes(row.status)

type Filter = 'all' | 'create' | 'update' | 'unchanged' | 'error' | 'done'
const filter = ref<Filter>('all')
const count = (test: (row: ImportPlanRow) => boolean) => rows.value.filter(test).length
const tabs = computed(() => [
  { value: 'all', label: 'Todas', badge: rows.value.length },
  { value: 'create', label: 'Nuevas', badge: count((r) => isOpen(r) && r.status === 'create') },
  { value: 'update', label: 'Actualizan', badge: count((r) => isOpen(r) && r.status === 'update') },
  {
    value: 'unchanged',
    label: 'Sin cambios',
    badge: count((r) => isOpen(r) && r.status === 'unchanged'),
  },
  { value: 'error', label: 'Con errores', badge: count((r) => isOpen(r) && r.status === 'error') },
  { value: 'done', label: 'Importadas o descartadas', badge: count((r) => !isOpen(r)) },
])
const visible = computed(() =>
  rows.value.filter((row) => {
    if (filter.value === 'all') return true
    if (filter.value === 'done') return !isOpen(row)
    return isOpen(row) && row.status === filter.value
  }),
)
const pendingImports = computed(() => rows.value.filter(importable))
const importedCount = computed(() => count((r) => stateOf(r) === 'imported'))

/** After an import the other rows may change (the tower or the unit now exist) */
async function replan() {
  const open = rows.value.filter((row) => isOpen(row) && row.input && row.status !== 'error')
  if (open.length === 0) return
  try {
    const { data } = await importApi.plan(
      open.map((row) => ({ line: row.line, input: row.input! })),
    )
    const byLine = new Map(data.map((row) => [row.line, row]))
    rows.value = rows.value.map((row) => {
      const fresh = byLine.get(row.line)
      // Keep the warnings read from the file (repeated rows are checked again)
      return fresh
        ? {
            ...fresh,
            warnings: [
              ...new Set([
                ...row.warnings.filter((w) => w.startsWith('Columnas')),
                ...fresh.warnings,
              ]),
            ],
          }
        : row
    })
  } catch {
    // The preview stays as it was; importing a row plans it again on the server
  }
}

async function importOne(row: ImportPlanRow, options: { replan: boolean } = { replan: true }) {
  if (!row.input) return false
  states.value[row.line] = 'importing'
  try {
    const { data } = await importApi.apply(row.line, row.input)
    rows.value = rows.value.map((r) => (r.line === row.line ? { ...data.row, warnings: [] } : r))
    states.value[row.line] = 'imported'
    delete failures.value[row.line]
    if (options.replan) await replan()
    return true
  } catch (e) {
    states.value[row.line] = 'failed'
    failures.value[row.line] = errorMessage(e)
    return false
  }
}

// ---------------------------------------------------------------- import all

const confirmAll = ref(false)
const running = ref(false)
const stopRequested = ref(false)
const progress = ref({ done: 0, total: 0 })

async function importAll() {
  confirmAll.value = false
  const queue = [...pendingImports.value]
  running.value = true
  stopRequested.value = false
  progress.value = { done: 0, total: queue.length }
  let failed = 0
  for (const row of queue) {
    if (stopRequested.value) break
    if (!(await importOne(row, { replan: false }))) failed += 1
    progress.value.done += 1
  }
  running.value = false
  await replan()
  const ok = progress.value.done - failed
  if (failed) toast.warning(`Se importaron ${ok} filas; ${failed} no se pudieron importar`)
  else toast.success(ok === 1 ? 'Se importó 1 fila' : `Se importaron ${ok} filas`)
}

function discard(row: ImportPlanRow) {
  states.value[row.line] = 'discarded'
}
function restore(row: ImportPlanRow) {
  states.value[row.line] = 'pending'
}
</script>

<template>
  <PageHeader
    title="Importar"
    subtitle="Carga masiva de torres, unidades y personas desde un archivo CSV"
  >
    <template v-if="fileName" #actions>
      <UiButton variant="outline" :disabled="running" @click="reset">
        <span class="mdi mdi-file-replace-outline mr-1" aria-hidden="true" />Cargar otro archivo
      </UiButton>
    </template>
  </PageHeader>

  <!-- Step 1: the file -->
  <div v-if="!fileName" class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
    <section
      class="rounded-xl border border-neutral-200 bg-white p-5 dark:border-white/10 dark:bg-neutral-900"
    >
      <h2 class="text-base font-semibold text-neutral-900 dark:text-white">Cómo funciona</h2>
      <ol class="mt-4 flex flex-col gap-4 text-sm text-neutral-600 dark:text-neutral-300">
        <li class="flex gap-3">
          <span :class="stepClass">1</span>
          <div>
            <p class="font-medium text-neutral-900 dark:text-white">
              Descarga el archivo de ejemplo
            </p>
            <p class="mt-0.5">Ábrelo en Excel o Google Sheets y reemplaza las filas de ejemplo.</p>
            <UiButton class="mt-2.5" size="sm" variant="outline" @click="downloadExample">
              <span class="mdi mdi-download mr-1" aria-hidden="true" />CSV de ejemplo
            </UiButton>
          </div>
        </li>
        <li class="flex gap-3">
          <span :class="stepClass">2</span>
          <div>
            <p class="font-medium text-neutral-900 dark:text-white">
              Una fila por unidad y persona
            </p>
            <p class="mt-0.5">
              Si el 101 tiene propietario y arrendatario, van en dos filas con la misma torre y
              unidad. Una unidad sin personas lleva el nombre vacío.
            </p>
          </div>
        </li>
        <li class="flex gap-3">
          <span :class="stepClass">3</span>
          <div>
            <p class="font-medium text-neutral-900 dark:text-white">Sube el archivo y revisa</p>
            <p class="mt-0.5">
              Verás qué es nuevo y qué cambia sobre lo que ya existe. Nada se guarda hasta que
              importes cada fila; las celdas vacías no borran lo que ya hay.
            </p>
          </div>
        </li>
      </ol>
    </section>

    <section class="flex flex-col gap-3">
      <input
        ref="input"
        type="file"
        accept=".csv,text/csv,.txt"
        class="sr-only"
        aria-label="Elegir archivo CSV"
        @change="pick"
      />
      <button
        type="button"
        :disabled="reading"
        :class="[
          'flex min-h-56 flex-1 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors disabled:cursor-wait',
          dragging
            ? 'border-brand-500 bg-brand-50 dark:border-brand-300 dark:bg-brand-400/10'
            : 'border-neutral-300 bg-white hover:border-brand-400 dark:border-white/15 dark:bg-neutral-900 dark:hover:border-brand-300',
        ]"
        @click="input?.click()"
        @dragover.prevent="dragging = true"
        @dragleave="dragging = false"
        @drop.prevent="drop"
      >
        <span
          :class="[
            'mdi text-4xl text-neutral-400',
            reading ? 'mdi-loading animate-spin' : 'mdi-file-delimited-outline',
          ]"
          aria-hidden="true"
        />
        <span class="text-base font-semibold text-neutral-800 dark:text-neutral-100">
          {{ reading ? 'Leyendo el archivo…' : 'Sube el archivo CSV' }}
        </span>
        <span class="max-w-sm text-sm text-neutral-500">
          Arrástralo aquí o haz clic para elegirlo. Hasta
          {{ IMPORT_MAX_ROWS.toLocaleString('es-CO') }} filas y {{ IMPORT_MAX_MB }} MB; separado por
          punto y coma o por coma.
        </span>
      </button>
      <UiAlert v-if="fileError" color="danger" variant="soft">{{ fileError }}</UiAlert>
    </section>

    <details
      class="group rounded-xl border border-neutral-200 bg-white lg:col-span-2 dark:border-white/10 dark:bg-neutral-900"
    >
      <summary
        class="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3.5 text-sm font-semibold text-neutral-900 dark:text-white"
      >
        Columnas del archivo
        <span
          class="mdi mdi-chevron-down text-lg text-neutral-400 transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div class="overflow-x-auto border-t border-neutral-200 dark:border-white/10">
        <table class="w-full text-left text-sm">
          <thead class="bg-neutral-50 text-xs text-neutral-500 dark:bg-white/3">
            <tr>
              <th scope="col" class="px-5 py-2 font-medium">Encabezado</th>
              <th scope="col" class="px-3 py-2 font-medium">Dato</th>
              <th scope="col" class="px-3 py-2 font-medium">Qué escribir</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-100 dark:divide-white/5">
            <tr v-for="column in IMPORT_COLUMNS" :key="column.field">
              <td class="px-5 py-2 align-top">
                <code class="rounded bg-neutral-100 px-1.5 py-0.5 text-xs dark:bg-white/8">{{
                  column.header
                }}</code>
              </td>
              <td class="px-3 py-2 align-top whitespace-nowrap text-neutral-900 dark:text-white">
                {{ column.label }}<span v-if="column.required" class="text-red-600"> *</span>
              </td>
              <td class="px-3 py-2 align-top text-neutral-600 dark:text-neutral-300">
                {{ column.help }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </details>
  </div>

  <!-- Step 2: the preview -->
  <template v-else>
    <div
      class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-neutral-900"
    >
      <div class="flex min-w-0 items-center gap-3">
        <span class="mdi mdi-file-delimited-outline text-2xl text-neutral-400" aria-hidden="true" />
        <div class="min-w-0">
          <p class="truncate text-sm font-medium text-neutral-900 dark:text-white">
            {{ fileName }}
          </p>
          <p class="text-xs text-neutral-500">
            {{ rows.length }} {{ rows.length === 1 ? 'fila' : 'filas' }}
            <template v-if="importedCount">, {{ importedCount }} importadas</template>
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <template v-if="running">
          <span class="text-sm text-neutral-600 tabular-nums dark:text-neutral-300">
            Importando {{ progress.done }} de {{ progress.total }}…
          </span>
          <UiButton
            size="sm"
            variant="ghost"
            :disabled="stopRequested"
            @click="stopRequested = true"
          >
            Detener
          </UiButton>
        </template>
        <UiButton
          v-else
          color="primary"
          :disabled="pendingImports.length === 0"
          @click="confirmAll = true"
        >
          <span class="mdi mdi-database-import-outline mr-1" aria-hidden="true" />
          Importar pendientes ({{ pendingImports.length }})
        </UiButton>
      </div>
    </div>

    <UiTabs v-model="filter" :tabs="tabs" aria-label="Filtrar filas" class="mb-3" />

    <ul
      v-if="visible.length"
      class="divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white dark:divide-white/5 dark:border-white/10 dark:bg-neutral-900"
    >
      <ImportRowItem
        v-for="row in visible"
        :key="row.line"
        :row="row"
        :state="stateOf(row)"
        :failure="failures[row.line]"
        :busy="running"
        @import="importOne(row)"
        @discard="discard(row)"
        @restore="restore(row)"
      />
    </ul>
    <p
      v-else
      class="rounded-xl border border-dashed border-neutral-300 px-4 py-10 text-center text-sm text-neutral-500 dark:border-white/15"
    >
      No hay filas en este grupo.
    </p>

    <p v-if="importedCount" class="mt-4 text-sm text-neutral-500">
      Revisa lo importado en
      <RouterLink
        :to="{ name: 'units' }"
        class="font-medium text-brand-600 hover:underline dark:text-brand-200"
        >Unidades</RouterLink
      >
      y
      <RouterLink
        :to="{ name: 'buildings' }"
        class="font-medium text-brand-600 hover:underline dark:text-brand-200"
        >Torres</RouterLink
      >.
    </p>

    <ConfirmDialog
      v-model="confirmAll"
      title="Importar filas pendientes"
      :message="`Se importarán ${pendingImports.length} filas nuevas o con cambios, una por una. Las filas con errores, sin cambios o descartadas no se tocan.`"
      confirm-label="Importar"
      @confirm="importAll"
    />
  </template>
</template>
