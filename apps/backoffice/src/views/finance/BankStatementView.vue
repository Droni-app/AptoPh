<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  UiAlert,
  UiBadge,
  UiButton,
  UiSkeleton,
  UiTable,
  UiTabs,
  useToast,
  type TableColumn,
} from '@aptoph/ui'
import type { BankLineSuggestion, BankStatementDetail, BankStatementLine } from '@aptoph/shared'
import PageHeader from '@/components/PageHeader.vue'
import StatTile from '@/components/finance/StatTile.vue'
import ReconcileLineModal from '@/components/finance/ReconcileLineModal.vue'
import PaymentDetailModal from '@/components/finance/PaymentDetailModal.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { financeApi } from '@/api/finance'
import { errorMessage } from '@/lib/errors'
import { formatDate, formatMoney } from '@/lib/format'
import { useTenantStore } from '@/stores/tenant'

/** One imported statement: its movements, the suggestions and what each was reconciled with */
const route = useRoute()
const router = useRouter()
const tenant = useTenantStore()
const toast = useToast()
const id = String(route.params.id)

const statement = ref<BankStatementDetail | null>(null)
const error = ref<string | null>(null)
const filter = ref<'pending' | 'reconciled' | 'ignored' | 'all'>('pending')
const busy = ref<string | null>(null)
const applying = ref(false)
const lineOpen = ref(false)
const selected = ref<BankStatementLine | null>(null)
const paymentOpen = ref(false)
const paymentId = ref<string | null>(null)
const removeOpen = ref(false)

async function load() {
  try {
    statement.value = (await financeApi.bankStatement(id)).data
    error.value = null
    if (!statement.value.pending && filter.value === 'pending') filter.value = 'all'
  } catch (e) {
    error.value = errorMessage(e)
  }
}
onMounted(load)

const lines = computed(() =>
  (statement.value?.lines ?? []).filter(
    (line) => filter.value === 'all' || line.status === filter.value,
  ),
)
const tabs = computed(() => [
  { value: 'pending', label: 'Por conciliar', badge: statement.value?.pending ?? 0 },
  { value: 'reconciled', label: 'Conciliados', badge: statement.value?.reconciled ?? 0 },
  { value: 'ignored', label: 'Ignorados', badge: statement.value?.ignored ?? 0 },
  { value: 'all', label: 'Todos' },
])
const totals = computed(() => {
  let incoming = 0
  let outgoing = 0
  for (const line of statement.value?.lines ?? []) {
    const value = Number(line.amount)
    if (value > 0) incoming += value
    else outgoing -= value
  }
  return { incoming: incoming.toFixed(2), outgoing: outgoing.toFixed(2) }
})
const sure = computed(
  () =>
    statement.value?.lines.filter((line) => line.suggestion?.confidence === 'high').length ?? 0,
)

const columns: TableColumn[] = [
  { name: 'postedOn', label: 'Fecha' },
  { name: 'description', label: 'Movimiento' },
  { name: 'amount', label: 'Valor', classes: 'text-right' },
  { name: 'match', label: 'Conciliación' },
  { name: 'actions', label: '', classes: 'text-right' },
]

function describe(suggestion: BankLineSuggestion) {
  switch (suggestion.action) {
    case 'link':
      return `Recibo de caja ${suggestion.payment.number} · ${suggestion.payment.unit ?? ''}`
    case 'confirm':
      return `Confirmar el pago que reportó ${suggestion.payment.unit ?? 'el residente'}`
    case 'register':
      return `Registrar el pago de ${[suggestion.unit.building, suggestion.unit.code].filter(Boolean).join(' · ')}`
    case 'link_vendor_payment':
      return `Egreso ${suggestion.vendorPayment.number} · ${suggestion.vendorPayment.vendor ?? ''}`
  }
}

function inputOf(suggestion: BankLineSuggestion) {
  switch (suggestion.action) {
    case 'register':
      return { action: 'register' as const, unitId: suggestion.unit.id }
    case 'link_vendor_payment':
      return {
        action: 'link_vendor_payment' as const,
        vendorPaymentId: suggestion.vendorPayment.id,
      }
    default:
      return { action: suggestion.action, paymentId: suggestion.payment.id }
  }
}

async function accept(line: BankStatementLine) {
  if (!line.suggestion) return
  busy.value = line.id
  try {
    statement.value = (await financeApi.reconcileLine(line.id, inputOf(line.suggestion))).data.statement
    toast.success('Movimiento conciliado')
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    busy.value = null
  }
}

async function undo(line: BankStatementLine) {
  busy.value = line.id
  try {
    statement.value = (await financeApi.undoLine(line.id)).data.statement
    toast.success(
      line.payment
        ? 'Conciliación deshecha. El recibo de caja sigue registrado.'
        : 'Conciliación deshecha',
    )
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    busy.value = null
  }
}

async function applyAll() {
  applying.value = true
  try {
    const result = (await financeApi.applySuggestions(id)).data
    statement.value = result.statement
    if (result.failed.length) {
      toast.warning(
        `${result.applied} conciliados; ${result.failed.length} no se pudieron: ${result.failed[0]!.message}`,
      )
    } else {
      toast.success(`${result.applied} movimientos conciliados`)
    }
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    applying.value = false
  }
}

async function remove() {
  try {
    await financeApi.removeBankStatement(id)
    toast.success('Extracto eliminado')
    await router.push({ name: 'finance-reconciliation' })
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    removeOpen.value = false
  }
}

function manual(line: BankStatementLine) {
  selected.value = line
  lineOpen.value = true
}
function showPayment(id: string) {
  paymentId.value = id
  paymentOpen.value = true
}
</script>

<template>
  <UiAlert v-if="error" color="danger" variant="soft">{{ error }}</UiAlert>
  <UiSkeleton v-else-if="!statement" class="h-64 rounded-2xl" />
  <template v-else>
    <PageHeader
      :title="statement.fileName"
      :subtitle="`${statement.cashAccount?.name ?? ''} · ${formatDate(statement.startsOn)} – ${formatDate(statement.endsOn)}${statement.duplicatesCount ? ` · ${statement.duplicatesCount} movimientos ya estaban en otro extracto` : ''}`"
    >
      <template #before>
        <RouterLink
          :to="{ name: 'finance-reconciliation' }"
          class="mb-1 inline-block text-sm text-neutral-500 hover:underline"
        >
          <span aria-hidden="true"><i class="mdi mdi-arrow-left" /></span> Conciliación bancaria
        </RouterLink>
      </template>
      <template v-if="tenant.canManageFinance" #actions>
        <UiButton
          v-if="!statement.reconciled"
          variant="ghost"
          color="danger"
          @click="removeOpen = true"
          >Eliminar extracto</UiButton
        >
        <UiButton color="primary" :disabled="!sure" :loading="applying" @click="applyAll">
          <span class="mr-1"><i class="mdi mdi-auto-fix" aria-hidden="true" /></span>Aplicar
          {{ sure }} sugerencias seguras
        </UiButton>
      </template>
    </PageHeader>

    <div class="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatTile
        label="Por conciliar"
        :value="String(statement.pending)"
        icon="mdi mdi-progress-clock"
        tone="amber"
      />
      <StatTile
        label="Conciliados"
        :value="String(statement.reconciled + statement.ignored)"
        :hint="statement.ignored ? `${statement.ignored} ignorados` : undefined"
        icon="mdi mdi-check-all"
      />
      <StatTile
        label="Entradas"
        :value="formatMoney(totals.incoming)"
        icon="mdi mdi-arrow-down-bold-circle-outline"
        tone="brand"
      />
      <StatTile
        label="Salidas"
        :value="formatMoney(totals.outgoing)"
        icon="mdi mdi-arrow-up-bold-circle-outline"
        tone="coral"
      />
    </div>

    <UiTabs v-model="filter" :tabs="tabs" aria-label="Estado" class="mb-4" />

    <UiTable :columns="columns" :rows="lines">
      <template #postedOn="{ postedOn }"
        ><span class="whitespace-nowrap">{{ formatDate(postedOn) }}</span></template
      >
      <template #description="row">
        <span class="font-medium">{{ row.description || '—' }}</span>
        <span v-if="row.reference" class="block text-xs text-neutral-500"
          >Ref. {{ row.reference }}</span
        >
      </template>
      <template #amount="{ amount }">
        <span
          :class="[
            'font-semibold whitespace-nowrap tabular-nums',
            Number(amount) > 0
              ? 'text-mint-700 dark:text-mint-300'
              : 'text-coral-700 dark:text-coral-300',
          ]"
          >{{ formatMoney(amount) }}</span
        >
      </template>
      <template #match="row">
        <template v-if="row.status === 'reconciled'">
          <button
            v-if="row.payment"
            type="button"
            class="text-left text-brand-700 hover:underline dark:text-brand-200"
            @click="showPayment(row.payment.id)"
          >
            <i class="mdi mdi-check-circle text-mint-600" aria-hidden="true" />
            Recibo de caja {{ row.payment.number }} · {{ row.payment.unit }}
          </button>
          <span v-else-if="row.vendorPayment">
            <i class="mdi mdi-check-circle text-mint-600" aria-hidden="true" />
            Egreso {{ row.vendorPayment.number }} · {{ row.vendorPayment.vendor }}
          </span>
          <span v-if="row.reconciledBy" class="block text-xs text-neutral-500">{{
            row.reconciledBy
          }}</span>
        </template>
        <span v-else-if="row.status === 'ignored'" class="text-neutral-500">
          <i class="mdi mdi-minus-circle-outline" aria-hidden="true" /> {{ row.note }}
        </span>
        <template v-else-if="row.suggestion">
          <span class="flex flex-wrap items-center gap-2">
            <span>{{ describe(row.suggestion) }}</span>
            <UiBadge
              :label="row.suggestion.confidence === 'high' ? 'Segura' : 'Revisar'"
              :color="row.suggestion.confidence === 'high' ? 'success' : 'warning'"
              variant="soft"
              size="xs"
            />
          </span>
          <span class="block text-xs text-neutral-500">{{ row.suggestion.reason }}</span>
        </template>
        <span v-else class="text-neutral-400">Sin sugerencia</span>
      </template>
      <template #actions="row">
        <div v-if="tenant.canManageFinance" class="flex justify-end gap-1">
          <template v-if="row.status === 'pending'">
            <UiButton
              v-if="row.suggestion"
              size="sm"
              color="primary"
              variant="soft"
              :loading="busy === row.id"
              @click="accept(row as BankStatementLine)"
              >Aplicar</UiButton
            >
            <UiButton size="sm" variant="ghost" @click="manual(row as BankStatementLine)">{{
              row.suggestion ? 'Otro…' : 'Conciliar…'
            }}</UiButton>
          </template>
          <UiButton
            v-else
            size="sm"
            variant="ghost"
            :loading="busy === row.id"
            @click="undo(row as BankStatementLine)"
            >Deshacer</UiButton
          >
        </div>
      </template>
      <template #empty>
        <p class="py-6 text-center text-sm text-neutral-500">
          {{
            filter === 'pending'
              ? 'Todo el extracto está conciliado.'
              : 'No hay movimientos en esta pestaña.'
          }}
        </p>
      </template>
    </UiTable>

    <ReconcileLineModal
      v-model="lineOpen"
      :line="selected"
      :cash-account-id="statement.cashAccount?.id ?? null"
      @saved="statement = $event"
    />
    <PaymentDetailModal v-model="paymentOpen" :payment-id="paymentId" @changed="load" />
    <ConfirmDialog
      v-model="removeOpen"
      title="Eliminar extracto"
      message="Se borran sus movimientos. Puedes volver a importar el archivo después."
      confirm-label="Eliminar"
      @confirm="remove"
    />
  </template>
</template>
