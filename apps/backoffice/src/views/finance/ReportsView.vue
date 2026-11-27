<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  UiAlert,
  UiButton,
  UiCard,
  UiInput,
  UiLabel,
  UiSelect,
  UiSkeleton,
  UiTabs,
} from '@aptoph/ui'
import {
  JOURNAL_ENTRY_TYPE_LABELS,
  type BalanceSheet,
  type IncomeStatement,
  type LedgerReport,
  type StatementSection,
  type TrialBalance,
} from '@aptoph/shared'
import PageHeader from '@/components/PageHeader.vue'
import AccountSelect from '@/components/finance/AccountSelect.vue'
import JournalEntryModal from '@/components/finance/JournalEntryModal.vue'
import { financeApi } from '@/api/finance'
import { errorMessage } from '@/lib/errors'
import {
  csvAmount,
  downloadCsv,
  formatAmount,
  formatDate,
  formatMoney,
  todayInput,
} from '@/lib/format'

const route = useRoute()
const router = useRouter()

const tab = ref(String(route.query.tab ?? 'income'))
const tabs = [
  { label: 'Estado de resultados', value: 'income', icon: 'mdi mdi-chart-line' },
  { label: 'Balance general', value: 'balance', icon: 'mdi mdi-scale-balance' },
  { label: 'Balance de prueba', value: 'trial', icon: 'mdi mdi-table' },
  { label: 'Libro auxiliar', value: 'ledger', icon: 'mdi mdi-book-search-outline' },
]
const from = ref(`${new Date().getFullYear()}-01-01`)
const to = ref(todayInput())
const level = ref(4)
const accountId = ref(String(route.query.cuenta ?? ''))
const levelOptions = [
  { value: 1, label: 'Clase' },
  { value: 2, label: 'Grupo' },
  { value: 4, label: 'Cuenta' },
  { value: 6, label: 'Subcuenta' },
  { value: 8, label: 'Auxiliar' },
]

const trial = ref<TrialBalance | null>(null)
const income = ref<IncomeStatement | null>(null)
const balance = ref<BalanceSheet | null>(null)
const ledger = ref<LedgerReport | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const entryOpen = ref(false)
const entryId = ref<string | null>(null)

/** The API levels are 1–5 (class, group, account, subaccount, auxiliary) */
const apiLevel = () =>
  (({ 1: 1, 2: 2, 4: 3, 6: 4, 8: 5 }) as Record<number, number>)[level.value] ?? 3

async function load() {
  loading.value = true
  error.value = null
  try {
    const range = { from: from.value || undefined, to: to.value || undefined }
    if (tab.value === 'trial')
      trial.value = (await financeApi.trialBalance({ ...range, level: apiLevel() })).data
    if (tab.value === 'income') income.value = (await financeApi.incomeStatement(range)).data
    if (tab.value === 'balance')
      balance.value = (await financeApi.balanceSheet({ to: range.to, level: apiLevel() })).data
    if (tab.value === 'ledger')
      ledger.value = accountId.value
        ? (await financeApi.ledger({ accountId: accountId.value, ...range })).data
        : null
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}

watch(tab, (value) => {
  router.replace({
    query: {
      tab: value,
      ...(value === 'ledger' && accountId.value ? { cuenta: accountId.value } : {}),
    },
  })
  load()
})
watch([from, to, level], load)
watch(accountId, (value) => {
  router.replace({ query: { tab: 'ledger', cuenta: value } })
  load()
})
onMounted(load)

const sectionRows = (section: StatementSection) =>
  section.rows.map((row) => [row.code, row.name, csvAmount(row.amount)])

function exportCsv() {
  if (tab.value === 'trial' && trial.value) {
    downloadCsv(`balance-de-prueba-${trial.value.to}.csv`, [
      ['Código', 'Cuenta', 'Saldo inicial', 'Débitos', 'Créditos', 'Saldo final'],
      ...trial.value.rows.map((r) => [
        r.code,
        r.name,
        csvAmount(r.opening),
        csvAmount(r.debit),
        csvAmount(r.credit),
        csvAmount(r.closing),
      ]),
      [
        '',
        'Totales',
        '',
        csvAmount(trial.value.totals.debit),
        csvAmount(trial.value.totals.credit),
        '',
      ],
    ])
  } else if (tab.value === 'income' && income.value) {
    downloadCsv(`estado-de-resultados-${income.value.to}.csv`, [
      ['Código', 'Cuenta', 'Valor'],
      ['', 'INGRESOS', ''],
      ...sectionRows(income.value.income),
      ['', 'Total ingresos', csvAmount(income.value.income.total)],
      ['', 'GASTOS', ''],
      ...sectionRows(income.value.expense),
      ['', 'Total gastos', csvAmount(income.value.expense.total)],
      ['', 'Excedente (déficit)', csvAmount(income.value.result)],
    ])
  } else if (tab.value === 'balance' && balance.value) {
    const b = balance.value
    downloadCsv(`balance-general-${b.asOf}.csv`, [
      ['Código', 'Cuenta', 'Valor'],
      ['', 'ACTIVO', ''],
      ...sectionRows(b.assets),
      ['', 'Total activo', csvAmount(b.assets.total)],
      ['', 'PASIVO', ''],
      ...sectionRows(b.liabilities),
      ['', 'Total pasivo', csvAmount(b.liabilities.total)],
      ['', 'PATRIMONIO', ''],
      ...sectionRows(b.equity),
      ['', 'Excedente del ejercicio', csvAmount(b.result)],
      ['', 'Total pasivo y patrimonio', csvAmount(b.totalLiabilitiesAndEquity)],
    ])
  } else if (tab.value === 'ledger' && ledger.value) {
    const l = ledger.value
    downloadCsv(`auxiliar-${l.account.code}.csv`, [
      ['Cuenta', `${l.account.code} ${l.account.name}`],
      ['Fecha', 'Comprobante', 'Descripción', 'Tercero', 'Débito', 'Crédito', 'Saldo'],
      ['', '', 'Saldo inicial', '', '', '', csvAmount(l.opening)],
      ...l.rows.map((r) => [
        r.date,
        `${JOURNAL_ENTRY_TYPE_LABELS[r.type]} ${r.number}`,
        r.description,
        r.thirdParty,
        csvAmount(r.debit),
        csvAmount(r.credit),
        csvAmount(r.balance),
      ]),
    ])
  }
}
</script>

<template>
  <PageHeader
    title="Informes contables"
    subtitle="Estados financieros para el consejo, la revisoría fiscal y la asamblea"
  >
    <template #actions>
      <UiButton variant="outline" @click="exportCsv">
        <span class="mr-1"><i class="mdi mdi-download" aria-hidden="true" /></span>Exportar CSV
      </UiButton>
    </template>
  </PageHeader>
  <UiTabs v-model="tab" :tabs="tabs" class="mb-4" aria-label="Informe" />

  <div class="mb-4 flex flex-wrap items-end gap-3">
    <UiLabel v-if="tab === 'ledger'" title="Cuenta" class="w-full sm:w-96">
      <AccountSelect v-model="accountId" />
    </UiLabel>
    <UiLabel v-if="tab !== 'balance'" title="Desde"
      ><UiInput v-model="from" type="date"
    /></UiLabel>
    <UiLabel :title="tab === 'balance' ? 'Corte' : 'Hasta'"
      ><UiInput v-model="to" type="date"
    /></UiLabel>
    <UiLabel v-if="tab === 'trial' || tab === 'balance'" title="Nivel">
      <UiSelect v-model="level" :options="levelOptions" />
    </UiLabel>
  </div>

  <UiAlert v-if="error" color="danger" variant="soft" class="mb-4">{{ error }}</UiAlert>
  <UiSkeleton v-if="loading" class="h-64 rounded-2xl" />

  <template v-else-if="tab === 'income' && income">
    <UiCard
      v-for="section in [
        ['Ingresos', income.income],
        ['Gastos', income.expense],
      ] as const"
      :key="section[0]"
      :title="section[0]"
      class="mb-4"
    >
      <table class="w-full text-sm">
        <tbody class="divide-y divide-neutral-100 dark:divide-white/10">
          <tr
            v-for="row in section[1].rows"
            :key="row.accountId"
            :class="row.level <= 2 ? 'font-semibold' : ''"
          >
            <td class="py-1.5" :style="{ paddingLeft: `${(row.level - 1) * 1}rem` }">
              <span class="tabular-nums text-neutral-500">{{ row.code }}</span> {{ row.name }}
            </td>
            <td class="py-1.5 text-right tabular-nums">{{ formatMoney(row.amount) }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="font-semibold">
            <td class="pt-2">Total {{ section[0].toLowerCase() }}</td>
            <td class="pt-2 text-right tabular-nums">{{ formatMoney(section[1].total) }}</td>
          </tr>
        </tfoot>
      </table>
    </UiCard>
    <div
      class="flex justify-between rounded-2xl p-4 text-lg font-bold ring-1"
      :class="
        Number(income.result) >= 0
          ? 'bg-mint-50 ring-mint-200 dark:bg-mint-400/10 dark:ring-mint-400/30'
          : 'bg-coral-50 ring-coral-200 dark:bg-coral-400/10 dark:ring-coral-400/30'
      "
    >
      <span
        >{{ Number(income.result) >= 0 ? 'Excedente' : 'Déficit' }} del
        {{ formatDate(income.from) }} al {{ formatDate(income.to) }}</span
      >
      <span class="tabular-nums">{{ formatMoney(income.result) }}</span>
    </div>
  </template>

  <template v-else-if="tab === 'balance' && balance">
    <div class="grid gap-4 lg:grid-cols-2">
      <UiCard title="Activo">
        <table class="w-full text-sm">
          <tbody class="divide-y divide-neutral-100 dark:divide-white/10">
            <tr
              v-for="row in balance.assets.rows"
              :key="row.accountId"
              :class="row.level <= 2 ? 'font-semibold' : ''"
            >
              <td class="py-1.5" :style="{ paddingLeft: `${(row.level - 1) * 1}rem` }">
                <span class="tabular-nums text-neutral-500">{{ row.code }}</span> {{ row.name }}
              </td>
              <td class="py-1.5 text-right tabular-nums">{{ formatMoney(row.amount) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="font-bold">
              <td class="pt-2">Total activo</td>
              <td class="pt-2 text-right tabular-nums">{{ formatMoney(balance.assets.total) }}</td>
            </tr>
          </tfoot>
        </table>
      </UiCard>
      <UiCard title="Pasivo y patrimonio">
        <table class="w-full text-sm">
          <tbody class="divide-y divide-neutral-100 dark:divide-white/10">
            <tr
              v-for="row in [...balance.liabilities.rows, ...balance.equity.rows]"
              :key="row.accountId"
              :class="row.level <= 2 ? 'font-semibold' : ''"
            >
              <td class="py-1.5" :style="{ paddingLeft: `${(row.level - 1) * 1}rem` }">
                <span class="tabular-nums text-neutral-500">{{ row.code }}</span> {{ row.name }}
              </td>
              <td class="py-1.5 text-right tabular-nums">{{ formatMoney(row.amount) }}</td>
            </tr>
            <tr>
              <td class="py-1.5">Excedente del ejercicio</td>
              <td class="py-1.5 text-right tabular-nums">{{ formatMoney(balance.result) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="text-neutral-600 dark:text-neutral-300">
              <td class="pt-2">Total pasivo</td>
              <td class="pt-2 text-right tabular-nums">
                {{ formatMoney(balance.liabilities.total) }}
              </td>
            </tr>
            <tr class="font-bold">
              <td class="pt-1">Total pasivo y patrimonio</td>
              <td class="pt-1 text-right tabular-nums">
                {{ formatMoney(balance.totalLiabilitiesAndEquity) }}
              </td>
            </tr>
          </tfoot>
        </table>
      </UiCard>
    </div>
    <p
      v-if="balance.assets.total !== balance.totalLiabilitiesAndEquity"
      class="mt-3 text-sm text-coral-700"
    >
      El balance no cuadra: revisa los comprobantes del periodo.
    </p>
  </template>

  <UiCard v-else-if="tab === 'trial' && trial">
    <div class="overflow-x-auto">
      <table class="w-full min-w-[44rem] text-sm">
        <thead class="text-left text-xs text-neutral-500 uppercase">
          <tr>
            <th class="py-2 font-medium">Cuenta</th>
            <th class="py-2 text-right font-medium">Saldo inicial</th>
            <th class="py-2 text-right font-medium">Débitos</th>
            <th class="py-2 text-right font-medium">Créditos</th>
            <th class="py-2 text-right font-medium">Saldo final</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-neutral-100 dark:divide-white/10">
          <tr
            v-for="row in trial.rows"
            :key="row.accountId"
            :class="row.level <= 2 ? 'font-semibold' : ''"
          >
            <td class="py-1.5" :style="{ paddingLeft: `${(row.level - 1) * 0.75}rem` }">
              <button
                v-if="row.isPostable"
                type="button"
                class="text-left hover:underline"
                @click="((accountId = row.accountId), (tab = 'ledger'))"
              >
                <span class="tabular-nums text-neutral-500">{{ row.code }}</span> {{ row.name }}
              </button>
              <template v-else
                ><span class="tabular-nums text-neutral-500">{{ row.code }}</span>
                {{ row.name }}</template
              >
            </td>
            <td class="py-1.5 text-right tabular-nums">{{ formatAmount(row.opening) }}</td>
            <td class="py-1.5 text-right tabular-nums">{{ formatAmount(row.debit) }}</td>
            <td class="py-1.5 text-right tabular-nums">{{ formatAmount(row.credit) }}</td>
            <td class="py-1.5 text-right tabular-nums">{{ formatAmount(row.closing) }}</td>
          </tr>
        </tbody>
        <tfoot class="font-bold">
          <tr>
            <td class="pt-2">Sumas</td>
            <td />
            <td class="pt-2 text-right tabular-nums">{{ formatMoney(trial.totals.debit) }}</td>
            <td class="pt-2 text-right tabular-nums">{{ formatMoney(trial.totals.credit) }}</td>
            <td
              class="pt-2 text-right text-xs font-medium"
              :class="
                trial.totals.debit === trial.totals.credit
                  ? 'text-mint-700 dark:text-mint-300'
                  : 'text-coral-700'
              "
            >
              {{ trial.totals.debit === trial.totals.credit ? 'Sumas iguales' : 'Descuadrado' }}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  </UiCard>

  <template v-else-if="tab === 'ledger'">
    <p v-if="!accountId" class="py-10 text-center text-sm text-neutral-500">
      Elige una cuenta para ver sus movimientos.
    </p>
    <UiCard v-else-if="ledger" :title="`${ledger.account.code} · ${ledger.account.name}`">
      <UiAlert v-if="ledger.truncated" color="warning" variant="soft" class="mb-3"
        >Se muestran los primeros movimientos: acota el rango de fechas.</UiAlert
      >
      <div class="overflow-x-auto">
        <table class="w-full min-w-[48rem] text-sm">
          <thead class="text-left text-xs text-neutral-500 uppercase">
            <tr>
              <th class="py-2 font-medium">Fecha</th>
              <th class="py-2 font-medium">Comprobante</th>
              <th class="py-2 font-medium">Descripción</th>
              <th class="py-2 font-medium">Tercero</th>
              <th class="py-2 text-right font-medium">Débito</th>
              <th class="py-2 text-right font-medium">Crédito</th>
              <th class="py-2 text-right font-medium">Saldo</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-100 dark:divide-white/10">
            <tr class="text-neutral-500">
              <td class="py-1.5" colspan="6">Saldo inicial</td>
              <td class="py-1.5 text-right tabular-nums">{{ formatMoney(ledger.opening) }}</td>
            </tr>
            <tr v-for="row in ledger.rows" :key="row.id">
              <td class="py-1.5 whitespace-nowrap">{{ formatDate(row.date) }}</td>
              <td class="py-1.5 whitespace-nowrap">
                <button
                  type="button"
                  class="hover:underline"
                  @click="((entryId = row.entryId), (entryOpen = true))"
                >
                  {{ JOURNAL_ENTRY_TYPE_LABELS[row.type] }} {{ row.number }}
                </button>
              </td>
              <td class="py-1.5">{{ row.description }}</td>
              <td class="py-1.5">{{ row.thirdParty ?? '' }}</td>
              <td class="py-1.5 text-right tabular-nums">{{ formatAmount(row.debit) }}</td>
              <td class="py-1.5 text-right tabular-nums">{{ formatAmount(row.credit) }}</td>
              <td class="py-1.5 text-right font-medium tabular-nums">
                {{ formatMoney(row.balance) }}
              </td>
            </tr>
          </tbody>
          <tfoot class="font-semibold">
            <tr>
              <td class="pt-2" colspan="4">Totales</td>
              <td class="pt-2 text-right tabular-nums">{{ formatMoney(ledger.debit) }}</td>
              <td class="pt-2 text-right tabular-nums">{{ formatMoney(ledger.credit) }}</td>
              <td class="pt-2 text-right tabular-nums">{{ formatMoney(ledger.closing) }}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </UiCard>
  </template>

  <JournalEntryModal v-model="entryOpen" :entry-id="entryId" @show="(id) => (entryId = id)" />
</template>
