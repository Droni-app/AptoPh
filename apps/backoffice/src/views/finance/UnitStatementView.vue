<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import {
  UiAlert,
  UiButton,
  UiCard,
  UiInput,
  UiSkeleton,
  UiTable,
  type TableColumn,
} from '@aptoph/ui'
import {
  JOURNAL_ENTRY_TYPE_LABELS,
  type BackofficeUnitStatement,
  type FinanceCharge,
} from '@aptoph/shared'
import PageHeader from '@/components/PageHeader.vue'
import StatTile from '@/components/finance/StatTile.vue'
import StatusBadge from '@/components/finance/StatusBadge.vue'
import PaymentFormModal from '@/components/finance/PaymentFormModal.vue'
import ChargeFormModal from '@/components/finance/ChargeFormModal.vue'
import ChargeDetailModal from '@/components/finance/ChargeDetailModal.vue'
import { financeApi } from '@/api/finance'
import { errorMessage } from '@/lib/errors'
import {
  csvAmount,
  downloadCsv,
  formatAmount,
  formatDate,
  formatMoney,
  formatPeriod,
  todayInput,
  unitLabel,
} from '@/lib/format'
import { useTenantStore } from '@/stores/tenant'

const route = useRoute()
const tenant = useTenantStore()
const unitId = String(route.params.unitId)

const statement = ref<BackofficeUnitStatement | null>(null)
const error = ref<string | null>(null)
const from = ref(`${new Date().getFullYear()}-01-01`)
const to = ref(todayInput())
const paymentOpen = ref(false)
const chargeOpen = ref(false)
const detailOpen = ref(false)
const detailId = ref<string | null>(null)
const today = todayInput()

async function load() {
  try {
    statement.value = (
      await financeApi.statement(unitId, {
        from: from.value || undefined,
        to: to.value || undefined,
      })
    ).data
    error.value = null
  } catch (e) {
    error.value = errorMessage(e)
  }
}
onMounted(load)

const picked = computed(() =>
  statement.value
    ? { id: unitId, code: statement.value.unit.code, label: unitLabel(statement.value.unit) }
    : null,
)

const openColumns: TableColumn[] = [
  { name: 'concept', label: 'Concepto' },
  { name: 'period', label: 'Mes' },
  { name: 'dueOn', label: 'Vence' },
  { name: 'amount', label: 'Valor', classes: 'text-right' },
  { name: 'balance', label: 'Saldo', classes: 'text-right' },
  { name: 'status', label: '' },
]
const movementColumns: TableColumn[] = [
  { name: 'date', label: 'Fecha' },
  { name: 'description', label: 'Movimiento' },
  { name: 'charge', label: 'Cargos', classes: 'text-right' },
  { name: 'payment', label: 'Abonos', classes: 'text-right' },
  { name: 'balance', label: 'Saldo', classes: 'text-right' },
]

function openCharge(charge: FinanceCharge) {
  detailId.value = charge.id
  detailOpen.value = true
}

function exportCsv() {
  if (!statement.value) return
  const s = statement.value
  downloadCsv(`estado-de-cuenta-${s.unit.code}.csv`, [
    ['Estado de cuenta', unitLabel(s.unit)],
    ['Desde', s.from ?? '', 'Hasta', s.to],
    [],
    ['Fecha', 'Comprobante', 'Movimiento', 'Cargos', 'Abonos', 'Saldo'],
    ['', '', 'Saldo inicial', '', '', csvAmount(s.opening)],
    ...s.rows.map((row) => [
      row.date,
      row.number,
      [row.description, ...row.details].join(' · '),
      csvAmount(row.charge),
      csvAmount(row.payment),
      csvAmount(row.balance),
    ]),
  ])
}
</script>

<template>
  <UiAlert v-if="error" color="danger" variant="soft">{{ error }}</UiAlert>
  <UiSkeleton v-else-if="!statement" class="h-64 rounded-2xl" />
  <template v-else>
    <PageHeader
      :title="`Estado de cuenta · ${unitLabel(statement.unit)}`"
      subtitle="Cobros, pagos y saldo de la unidad"
    >
      <template #before>
        <RouterLink
          :to="{ name: 'finance-receivables' }"
          class="mb-1 inline-block text-sm text-neutral-500 hover:underline"
        >
          <span aria-hidden="true"><i class="mdi mdi-arrow-left" /></span> Cartera
        </RouterLink>
      </template>
      <template #actions>
        <RouterLink :to="{ name: 'unit', params: { id: unitId } }"
          ><UiButton variant="ghost">Ver unidad</UiButton></RouterLink
        >
        <template v-if="tenant.canManageFinance">
          <UiButton variant="outline" @click="chargeOpen = true">Nuevo cobro</UiButton>
          <UiButton color="primary" @click="paymentOpen = true">Registrar pago</UiButton>
        </template>
      </template>
    </PageHeader>

    <div class="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatTile
        label="Deuda total"
        :value="formatMoney(statement.debt)"
        icon="mdi mdi-cash-clock"
        tone="brand"
      />
      <StatTile
        label="Vencido"
        :value="formatMoney(statement.overdue)"
        icon="mdi mdi-alert-circle-outline"
        tone="coral"
      />
      <StatTile
        label="Saldo a favor"
        :value="formatMoney(statement.credit)"
        icon="mdi mdi-piggy-bank-outline"
      />
      <StatTile
        label="Para estar al día hoy"
        :value="formatMoney(statement.toPay)"
        :hint="
          Number(statement.availableDiscount) > 0
            ? `Incluye ${formatMoney(statement.availableDiscount)} de pronto pago`
            : undefined
        "
        icon="mdi mdi-check-decagram-outline"
        tone="amber"
      />
    </div>

    <h2 class="mb-3 text-lg font-semibold">Cobros pendientes</h2>
    <UiTable :columns="openColumns" :rows="statement.openCharges" class="mb-8">
      <template #concept="row">
        <button
          type="button"
          class="text-left hover:underline"
          @click="openCharge(row as FinanceCharge)"
        >
          {{ row.concept?.name }}
          <span v-if="row.description" class="block text-xs text-neutral-500">{{
            row.description
          }}</span>
        </button>
      </template>
      <template #period="{ period }"
        ><span class="whitespace-nowrap">{{ formatPeriod(period) }}</span></template
      >
      <template #dueOn="{ dueOn }"
        ><span class="whitespace-nowrap">{{ formatDate(dueOn) }}</span></template
      >
      <template #amount="{ amount }"
        ><span class="tabular-nums">{{ formatMoney(amount) }}</span></template
      >
      <template #balance="{ balance }"
        ><span class="font-semibold tabular-nums">{{ formatMoney(balance) }}</span></template
      >
      <template #status="row"
        ><StatusBadge kind="charge" :status="row.status" :overdue="row.dueOn < today"
      /></template>
      <template #empty
        ><p class="py-6 text-center text-sm text-neutral-500">La unidad está al día.</p></template
      >
    </UiTable>

    <UiCard>
      <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h2 class="text-lg font-semibold">Movimientos</h2>
        <div class="flex flex-wrap items-center gap-2">
          <div class="w-40">
            <UiInput v-model="from" type="date" aria-label="Desde" @change="load" />
          </div>
          <div class="w-40">
            <UiInput v-model="to" type="date" aria-label="Hasta" @change="load" />
          </div>
          <UiButton variant="outline" @click="exportCsv">
            <span class="mr-1"><i class="mdi mdi-download" aria-hidden="true" /></span>CSV
          </UiButton>
        </div>
      </div>
      <UiTable :columns="movementColumns" :rows="statement.rows">
        <template #date="{ date }"
          ><span class="whitespace-nowrap">{{ formatDate(date) }}</span></template
        >
        <template #description="row">
          <span class="font-medium">{{ row.description }}</span>
          <span
            class="line-clamp-2 block max-w-2xl text-xs text-neutral-500"
            :title="row.details.join(' · ')"
          >
            {{ JOURNAL_ENTRY_TYPE_LABELS[row.type as keyof typeof JOURNAL_ENTRY_TYPE_LABELS] }}
            {{ row.number
            }}<template v-if="row.details.length"> · {{ row.details.join(' · ') }}</template>
          </span>
        </template>
        <template #charge="{ charge }"
          ><span class="tabular-nums">{{ formatAmount(charge) }}</span></template
        >
        <template #payment="{ payment }"
          ><span class="tabular-nums text-mint-700 dark:text-mint-300">{{
            formatAmount(payment)
          }}</span></template
        >
        <template #balance="{ balance }"
          ><span class="font-semibold tabular-nums">{{ formatMoney(balance) }}</span></template
        >
        <template #empty
          ><p class="py-6 text-center text-sm text-neutral-500">
            Sin movimientos en el rango.
          </p></template
        >
      </UiTable>
      <p class="mt-3 flex justify-between text-sm text-neutral-600 dark:text-neutral-300">
        <span>Saldo inicial {{ formatMoney(statement.opening) }}</span>
        <span class="font-semibold">Saldo final {{ formatMoney(statement.closing) }}</span>
      </p>
    </UiCard>

    <PaymentFormModal v-model="paymentOpen" :fixed-unit="picked" @saved="load" />
    <ChargeFormModal v-model="chargeOpen" :fixed-unit="picked" @saved="load" />
    <ChargeDetailModal v-model="detailOpen" :charge-id="detailId" @changed="load" />
  </template>
</template>
