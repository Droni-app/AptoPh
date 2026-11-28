<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { UiAlert, UiButton, UiLabel, UiModal, UiSelect, useToast } from '@aptoph/ui'
import type { BankColumnMapping, BankStatementPreview } from '@aptoph/shared'
import { financeApi } from '@/api/finance'
import { useFinanceCatalog } from '@/composables/useFinanceCatalog'
import { errorMessage } from '@/lib/errors'
import { formatDate, formatMoney } from '@/lib/format'

/**
 * Import of a bank statement: pick the account and the file, check the columns
 * the system guessed (each bank exports its own format) and import.
 */
const props = defineProps<{ cashAccountId?: string }>()
const open = defineModel<boolean>({ required: true })
const router = useRouter()
const toast = useToast()
const catalog = useFinanceCatalog()

const accountId = ref('')
const file = ref<File | null>(null)
const preview = ref<BankStatementPreview | null>(null)
const mapping = ref<BankColumnMapping | null>(null)
const reading = ref(false)
const importing = ref(false)
const error = ref<string | null>(null)
const input = ref<HTMLInputElement | null>(null)
const dragging = ref(false)

const banks = computed(() =>
  catalog.activeCashAccounts.value
    .filter((account) => account.type === 'bank')
    .map((account) => ({ value: account.id, label: account.name })),
)

watch(open, async (isOpen) => {
  if (!isOpen) return
  file.value = null
  preview.value = null
  mapping.value = null
  error.value = null
  await catalog.load()
  accountId.value = props.cashAccountId ?? banks.value[0]?.value ?? ''
})

async function read(columns?: BankColumnMapping) {
  if (!file.value) return
  reading.value = true
  error.value = null
  try {
    preview.value = (await financeApi.previewBankStatement(file.value, columns)).data
    mapping.value = { ...preview.value.mapping }
  } catch (e) {
    error.value = errorMessage(e)
    if (!columns) preview.value = null
  } finally {
    reading.value = false
  }
}

function choose(picked: File | undefined | null) {
  if (!picked) return
  file.value = picked
  read()
}

/** Re-reads with the columns the person changed */
let timer: ReturnType<typeof setTimeout> | undefined
function remap(patch: Partial<BankColumnMapping>) {
  if (!mapping.value) return
  mapping.value = { ...mapping.value, ...patch }
  clearTimeout(timer)
  timer = setTimeout(() => read(mapping.value!), 250)
}

const header = computed(() => {
  if (!preview.value || !mapping.value) return []
  const row = preview.value.rows[mapping.value.headerRow] ?? []
  const width = Math.max(...preview.value.rows.map((r) => r.length))
  return Array.from({ length: width }, (_, i) => row[i] || `Columna ${i + 1}`)
})
const columnOptions = computed(() => [
  { value: '', label: '— No tiene —' },
  ...header.value.map((name, i) => ({ value: String(i), label: `${i + 1}. ${name}` })),
])
const headerOptions = computed(() =>
  (preview.value?.rows ?? []).slice(0, 25).map((row, i) => ({
    value: String(i),
    label: `Fila ${i + 1}: ${row.filter(Boolean).slice(0, 4).join(' · ').slice(0, 60)}`,
  })),
)
const dateFormats = [
  { value: 'dmy', label: 'Día/mes/año (28/11/2026)' },
  { value: 'ymd', label: 'Año-mes-día (2026-11-28)' },
  { value: 'mdy', label: 'Mes/día/año (11/28/2026)' },
]
const twoColumns = computed(() => mapping.value?.amount === null)
const column = (value: number | null) => (value === null ? '' : String(value))
const parse = (value: string | number) => (value === '' ? null : Number(value))

function setAmountMode(mode: string) {
  if (!mapping.value) return
  if (mode === 'one') {
    remap({ amount: mapping.value.credit ?? mapping.value.debit ?? 0, credit: null, debit: null })
  } else {
    remap({ amount: null, credit: mapping.value.amount ?? 0, debit: null })
  }
}

async function importFile() {
  if (!file.value || !mapping.value || !accountId.value) return
  importing.value = true
  error.value = null
  try {
    const statement = (
      await financeApi.importBankStatement(file.value, accountId.value, mapping.value)
    ).data
    toast.success(
      statement.duplicatesCount
        ? `${statement.linesCount} movimientos importados (${statement.duplicatesCount} ya estaban)`
        : `${statement.linesCount} movimientos importados`,
    )
    open.value = false
    await router.push({ name: 'finance-reconciliation-statement', params: { id: statement.id } })
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    importing.value = false
  }
}
</script>

<template>
  <UiModal v-model="open" title="Importar extracto bancario" size="xl" scrollable>
    <div class="flex flex-col gap-5 text-sm">
      <UiAlert v-if="!banks.length" color="warning" variant="soft">
        Primero crea la cuenta bancaria en Finanzas → Bancos.
      </UiAlert>
      <UiLabel title="Cuenta bancaria">
        <UiSelect v-model="accountId" :options="banks" block />
      </UiLabel>

      <input
        ref="input"
        type="file"
        accept=".csv,.txt,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        class="sr-only"
        aria-label="Elegir el extracto"
        @change="choose(($event.target as HTMLInputElement).files?.[0])"
      />
      <button
        type="button"
        :disabled="reading"
        :class="[
          'flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-6 py-6 text-center transition-colors disabled:cursor-wait',
          dragging
            ? 'border-brand-500 bg-brand-50 dark:border-brand-300 dark:bg-brand-400/10'
            : 'border-neutral-300 bg-white hover:border-brand-400 dark:border-white/15 dark:bg-neutral-900 dark:hover:border-brand-300',
        ]"
        @click="input?.click()"
        @dragover.prevent="dragging = true"
        @dragleave="dragging = false"
        @drop.prevent="((dragging = false), choose($event.dataTransfer?.files?.[0]))"
      >
        <span
          :class="[
            'mdi text-3xl text-neutral-400',
            reading ? 'mdi-loading animate-spin' : 'mdi-file-table-outline',
          ]"
          aria-hidden="true"
        />
        <span class="font-semibold text-neutral-800 dark:text-neutral-100">
          {{ file ? file.name : 'Sube el extracto del banco' }}
        </span>
        <span class="max-w-md text-neutral-500">
          CSV o Excel (.xlsx) descargado de la sucursal virtual. Los movimientos que ya importaste
          antes se omiten.
        </span>
      </button>

      <UiAlert v-if="error" color="danger" variant="soft">{{ error }}</UiAlert>

      <template v-if="preview && mapping">
        <section class="grid gap-3 rounded-xl bg-neutral-50 p-4 sm:grid-cols-2 dark:bg-white/5">
          <h3 class="font-semibold sm:col-span-2">Columnas del archivo</h3>
          <UiLabel title="Fila de encabezados">
            <UiSelect
              :model-value="String(mapping.headerRow)"
              :options="headerOptions"
              block
              @update:model-value="remap({ headerRow: Number($event) })"
            />
          </UiLabel>
          <UiLabel title="Formato de la fecha">
            <UiSelect
              :model-value="mapping.dateFormat"
              :options="dateFormats"
              block
              @update:model-value="remap({ dateFormat: $event as BankColumnMapping['dateFormat'] })"
            />
          </UiLabel>
          <UiLabel title="Fecha">
            <UiSelect
              :model-value="String(mapping.date)"
              :options="columnOptions.slice(1)"
              block
              @update:model-value="remap({ date: Number($event) })"
            />
          </UiLabel>
          <UiLabel title="Referencia" help-text="Con ella se reconoce la unidad o el pago">
            <UiSelect
              :model-value="column(mapping.reference)"
              :options="columnOptions"
              block
              @update:model-value="remap({ reference: parse($event) })"
            />
          </UiLabel>
          <UiLabel title="Descripción">
            <UiSelect
              :model-value="column(mapping.description)"
              :options="columnOptions"
              block
              @update:model-value="remap({ description: parse($event) })"
            />
          </UiLabel>
          <UiLabel title="Los valores vienen en">
            <UiSelect
              :model-value="twoColumns ? 'two' : 'one'"
              :options="[
                { value: 'one', label: 'Una columna (salidas con signo menos)' },
                { value: 'two', label: 'Dos columnas: créditos y débitos' },
              ]"
              block
              @update:model-value="setAmountMode(String($event))"
            />
          </UiLabel>
          <UiLabel v-if="!twoColumns" title="Valor">
            <UiSelect
              :model-value="column(mapping.amount)"
              :options="columnOptions.slice(1)"
              block
              @update:model-value="remap({ amount: Number($event) })"
            />
          </UiLabel>
          <template v-else>
            <UiLabel title="Créditos (entradas)">
              <UiSelect
                :model-value="column(mapping.credit)"
                :options="columnOptions"
                block
                @update:model-value="remap({ credit: parse($event) })"
              />
            </UiLabel>
            <UiLabel title="Débitos (salidas)">
              <UiSelect
                :model-value="column(mapping.debit)"
                :options="columnOptions"
                block
                @update:model-value="remap({ debit: parse($event) })"
              />
            </UiLabel>
          </template>
        </section>

        <section>
          <h3 class="mb-2 font-semibold">
            Así se leen: {{ preview.total }}
            {{ preview.total === 1 ? 'movimiento' : 'movimientos' }}
          </h3>
          <div class="overflow-x-auto rounded-xl ring-1 ring-neutral-200 dark:ring-white/10">
            <table class="w-full text-left">
              <thead class="bg-neutral-50 text-xs text-neutral-500 dark:bg-white/5">
                <tr>
                  <th class="px-3 py-2">Fecha</th>
                  <th class="px-3 py-2">Descripción</th>
                  <th class="px-3 py-2">Referencia</th>
                  <th class="px-3 py-2 text-right">Valor</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-neutral-100 dark:divide-white/10">
                <tr v-for="(line, i) in preview.sample" :key="i">
                  <td class="px-3 py-2 whitespace-nowrap">{{ formatDate(line.postedOn) }}</td>
                  <td class="px-3 py-2">{{ line.description || '—' }}</td>
                  <td class="px-3 py-2">{{ line.reference ?? '—' }}</td>
                  <td
                    :class="[
                      'px-3 py-2 text-right tabular-nums',
                      Number(line.amount) < 0
                        ? 'text-coral-700 dark:text-coral-300'
                        : 'text-mint-700 dark:text-mint-300',
                    ]"
                  >
                    {{ formatMoney(line.amount) }}
                  </td>
                </tr>
                <tr v-if="!preview.sample.length">
                  <td colspan="4" class="px-3 py-6 text-center text-neutral-500">
                    Ninguna fila tiene fecha y valor con estas columnas.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <UiAlert v-if="preview.errors.length" color="warning" variant="soft" class="mt-3">
            {{ preview.errors.length }} filas no se pueden leer (fila
            {{ preview.errors.map((e) => e.line).join(', ') }}): se omitirán.
          </UiAlert>
        </section>
      </template>
    </div>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UiButton variant="ghost" @click="open = false">Cancelar</UiButton>
        <UiButton
          color="primary"
          :loading="importing"
          :disabled="!preview?.total || !accountId || reading"
          @click="importFile"
          >Importar {{ preview?.total ? `${preview.total} movimientos` : '' }}</UiButton
        >
      </div>
    </template>
  </UiModal>
</template>
