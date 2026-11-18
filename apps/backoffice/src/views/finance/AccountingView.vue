<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  DuiButton,
  DuiInput,
  DuiSelect,
  DuiTable,
  DuiTabs,
  useToast,
  type TableColumn,
} from '@dronico/droni-kit'
import {
  ACCOUNT_CLASSES,
  ACCOUNT_CLASS_LABELS,
  JOURNAL_ENTRY_TYPES,
  JOURNAL_ENTRY_TYPE_LABELS,
  type AccountClass,
  type ApiPaginated,
  type JournalEntry,
  type JournalEntryType,
  type LedgerAccount,
} from '@aptoph/shared'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import JournalEntryModal from '@/components/finance/JournalEntryModal.vue'
import ManualEntryModal from '@/components/finance/ManualEntryModal.vue'
import LedgerAccountModal from '@/components/finance/LedgerAccountModal.vue'
import { financeApi } from '@/api/finance'
import { useFinanceCatalog } from '@/composables/useFinanceCatalog'
import { errorMessage } from '@/lib/errors'
import { formatDate, formatMoney } from '@/lib/format'
import { useTenantStore } from '@/stores/tenant'

const route = useRoute()
const router = useRouter()
const tenant = useTenantStore()
const toast = useToast()
const catalog = useFinanceCatalog()

const tab = ref(String(route.query.tab ?? 'journal'))
watch(tab, (value) => router.replace({ query: { tab: value } }))
const tabs = [
  { label: 'Libro diario', value: 'journal', icon: 'mdi mdi-book-open-variant' },
  { label: 'Plan de cuentas', value: 'chart', icon: 'mdi mdi-file-tree-outline' },
]

// Journal
const filters = ref({ type: '' as JournalEntryType | '', search: '', from: '', to: '', page: 1 })
const journal = ref<ApiPaginated<JournalEntry> | null>(null)
const loading = ref(false)
const entryOpen = ref(false)
const entryId = ref<string | null>(null)
const manualOpen = ref(false)
const typeOptions = [
  { value: '', label: 'Todos los comprobantes' },
  ...JOURNAL_ENTRY_TYPES.map((value) => ({ value, label: JOURNAL_ENTRY_TYPE_LABELS[value] })),
]
const columns: TableColumn[] = [
  { name: 'number', label: 'N.º' },
  { name: 'date', label: 'Fecha' },
  { name: 'type', label: 'Tipo' },
  { name: 'description', label: 'Descripción' },
  { name: 'total', label: 'Valor', classes: 'text-right' },
]

async function loadJournal() {
  loading.value = true
  try {
    journal.value = await financeApi.journal({
      ...filters.value,
      from: filters.value.from || undefined,
      to: filters.value.to || undefined,
    })
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    loading.value = false
  }
}
let timer: ReturnType<typeof setTimeout> | undefined
watch(
  () => [filters.value.type, filters.value.from, filters.value.to],
  () => ((filters.value.page = 1), loadJournal()),
)
watch(
  () => filters.value.search,
  () => {
    clearTimeout(timer)
    timer = setTimeout(() => ((filters.value.page = 1), loadJournal()), 300)
  },
)
function show(id: string) {
  entryId.value = id
  entryOpen.value = true
}

// Chart of accounts
const accountClass = ref<AccountClass | ''>('')
const accountSearch = ref('')
const accountModalOpen = ref(false)
const parent = ref<LedgerAccount | null>(null)
const editing = ref<LedgerAccount | null>(null)
const classOptions = [
  { value: '', label: 'Todas las clases' },
  ...ACCOUNT_CLASSES.map((value) => ({ value, label: ACCOUNT_CLASS_LABELS[value] })),
]
const accounts = computed(() => {
  const term = accountSearch.value.toLowerCase()
  return catalog.accounts.value.filter(
    (a) =>
      (!accountClass.value || a.class === accountClass.value) &&
      (!term || a.code.startsWith(term) || a.name.toLowerCase().includes(term)),
  )
})
const indent = (code: string) =>
  (({ 1: 0, 2: 1, 4: 2, 6: 3 }) as Record<number, number>)[code.length] ?? 4
/** New subaccounts hang from 4-digit accounts and up, never from the bank/cash ones (created from Bancos) */
const canAddUnder = (account: LedgerAccount) =>
  account.code.length >= 4 &&
  account.code.length < 10 &&
  !['1105', '1110', '1120'].some((prefix) => account.code.startsWith(prefix))

onMounted(() => {
  catalog.load()
  loadJournal()
})
</script>

<template>
  <PageHeader
    title="Contabilidad"
    subtitle="Comprobantes por partida doble y plan único de cuentas (PUC)"
  >
    <template v-if="tenant.canManageFinance" #actions>
      <DuiButton color="primary" @click="manualOpen = true">
        <span class="mr-1"><i class="mdi mdi-plus" aria-hidden="true" /></span>Nota de contabilidad
      </DuiButton>
    </template>
  </PageHeader>
  <DuiTabs v-model="tab" :tabs="tabs" class="mb-4" aria-label="Vista" />

  <template v-if="tab === 'journal'">
    <div class="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_14rem_10rem_10rem]">
      <DuiInput
        v-model="filters.search"
        type="search"
        placeholder="Número o descripción"
        aria-label="Buscar"
        block
      />
      <DuiSelect v-model="filters.type" :options="typeOptions" aria-label="Tipo" block />
      <DuiInput v-model="filters.from" type="date" aria-label="Desde" block />
      <DuiInput v-model="filters.to" type="date" aria-label="Hasta" block />
    </div>
    <DuiTable
      :columns="columns"
      :rows="journal?.data ?? []"
      :loading="loading"
      :pagination="
        journal
          ? {
              page: journal.metadata.currentPage,
              perPage: journal.metadata.perPage,
              total: journal.metadata.total,
            }
          : undefined
      "
      @paginate="(page: number) => ((filters.page = page), loadJournal())"
    >
      <template #number="row">
        <button
          type="button"
          class="font-semibold tabular-nums hover:underline"
          @click="show(row.id)"
        >
          {{ row.number }}
        </button>
      </template>
      <template #date="{ date }">{{ formatDate(date) }}</template>
      <template #type="row">
        {{ JOURNAL_ENTRY_TYPE_LABELS[row.type as JournalEntryType] }}
        <span v-if="row.reversedByEntryId" class="block text-xs text-coral-700 dark:text-coral-300"
          >Reversado</span
        >
      </template>
      <template #description="row"
        ><span class="block max-w-md truncate">{{ row.description }}</span></template
      >
      <template #total="{ total }"
        ><span class="tabular-nums">{{ formatMoney(total) }}</span></template
      >
      <template #empty><EmptyState title="No hay comprobantes con estos filtros" /></template>
    </DuiTable>
  </template>

  <template v-else>
    <div class="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem]">
      <DuiInput
        v-model="accountSearch"
        type="search"
        placeholder="Código o nombre"
        aria-label="Buscar cuenta"
        block
      />
      <DuiSelect v-model="accountClass" :options="classOptions" aria-label="Clase" block />
    </div>
    <div
      class="overflow-hidden rounded-2xl bg-white ring-1 ring-brand-900/5 dark:bg-neutral-900 dark:ring-white/10"
    >
      <ul class="divide-y divide-neutral-100 text-sm dark:divide-white/5">
        <li
          v-for="account in accounts"
          :key="account.id"
          class="group flex items-center justify-between gap-3 px-4 py-2"
          :class="[
            account.code.length <= 2 ? 'bg-neutral-50 font-semibold dark:bg-white/5' : '',
            account.isActive ? '' : 'opacity-50',
          ]"
        >
          <span
            class="flex min-w-0 items-center gap-3"
            :style="{ paddingLeft: `${indent(account.code) * 1.25}rem` }"
          >
            <span
              class="w-20 shrink-0 tabular-nums"
              :class="account.isPostable ? 'text-mint-700 dark:text-mint-300' : 'text-neutral-500'"
              >{{ account.code }}</span
            >
            <span class="truncate">{{ account.name }}</span>
          </span>
          <span
            v-if="tenant.canManageFinance"
            class="flex shrink-0 gap-1 opacity-100 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
          >
            <DuiButton
              v-if="canAddUnder(account)"
              size="sm"
              variant="ghost"
              @click="((parent = account), (editing = null), (accountModalOpen = true))"
              >+ Subcuenta</DuiButton
            >
            <DuiButton
              v-if="account.code.length >= 6"
              size="sm"
              variant="ghost"
              @click="((editing = account), (parent = null), (accountModalOpen = true))"
              >Editar</DuiButton
            >
          </span>
        </li>
      </ul>
    </div>
    <p class="mt-2 text-xs text-neutral-500">
      Las cuentas en verde reciben movimientos (auxiliares).
    </p>
  </template>

  <JournalEntryModal v-model="entryOpen" :entry-id="entryId" @changed="loadJournal" @show="show" />
  <ManualEntryModal v-model="manualOpen" @saved="loadJournal" />
  <LedgerAccountModal v-model="accountModalOpen" :parent="parent" :account="editing" />
</template>
