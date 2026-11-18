<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  DuiAlert,
  DuiButton,
  DuiCard,
  DuiInput,
  DuiLabel,
  DuiModal,
  DuiSkeleton,
  DuiTabs,
  useToast,
} from '@dronico/droni-kit'
import type { BudgetDetail, BudgetExecutionRow } from '@aptoph/shared'
import PageHeader from '@/components/PageHeader.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import StatusBadge from '@/components/finance/StatusBadge.vue'
import StatTile from '@/components/finance/StatTile.vue'
import AccountSelect from '@/components/finance/AccountSelect.vue'
import { financeApi } from '@/api/finance'
import { useFinanceCatalog } from '@/composables/useFinanceCatalog'
import { errorMessage, fieldErrors } from '@/lib/errors'
import {
  csvAmount,
  downloadCsv,
  formatAmount,
  formatDate,
  formatMoney,
  parseAmount,
  todayInput,
} from '@/lib/format'
import { useTenantStore } from '@/stores/tenant'

const route = useRoute()
const router = useRouter()
const tenant = useTenantStore()
const toast = useToast()
const catalog = useFinanceCatalog()
const id = String(route.params.id)

const budget = ref<BudgetDetail | null>(null)
const error = ref<string | null>(null)
const tab = ref('execution')

type Item = { accountId: string; description: string; annualAmount: string }
const form = ref({ name: '', year: 0, reserveFundRate: '1', notes: '' })
const items = ref<Item[]>([])
const errors = ref<Record<string, string>>({})
const saving = ref(false)
const dirty = ref(false)
const approveOpen = ref(false)
const approval = ref({ approvedOn: todayInput(), approvalReference: '' })
const deleteOpen = ref(false)
const busy = ref(false)

async function load() {
  try {
    await catalog.load()
    budget.value = (await financeApi.budget(id)).data
    const b = budget.value
    form.value = {
      name: b.name,
      year: b.year,
      reserveFundRate: String(Number(b.reserveFundRate)),
      notes: b.notes ?? '',
    }
    items.value = (b.items ?? []).map((item) => ({
      accountId: item.accountId,
      description: item.description ?? '',
      annualAmount: String(Number(item.annualAmount)),
    }))
    tab.value = b.status === 'draft' ? 'items' : 'execution'
    dirty.value = false
  } catch (e) {
    error.value = errorMessage(e)
  }
}
onMounted(load)

const editable = computed(() => budget.value?.status === 'draft' && tenant.canManageFinance)
const accountClass = (accountId: string) =>
  catalog.accounts.value.find((a) => a.id === accountId)?.class
const sum = (kind: 'income' | 'expense') =>
  items.value
    .filter((item) => accountClass(item.accountId) === kind)
    .reduce((total, item) => total + (parseAmount(item.annualAmount) || 0), 0)
const totals = computed(() => {
  const income = sum('income')
  const expense = sum('expense')
  const reserve = (expense * (Number(form.value.reserveFundRate.replace(',', '.')) || 0)) / 100
  return { income, expense, reserve }
})

async function save() {
  saving.value = true
  errors.value = {}
  try {
    budget.value = (
      await financeApi.updateBudget(id, {
        year: form.value.year,
        name: form.value.name,
        reserveFundRate: Number(form.value.reserveFundRate.replace(',', '.')),
        notes: form.value.notes || null,
        items: items.value
          .filter((item) => item.accountId)
          .map((item) => ({
            accountId: item.accountId,
            description: item.description || null,
            annualAmount: parseAmount(item.annualAmount) || 0,
          })),
      })
    ).data
    dirty.value = false
    toast.success('Presupuesto guardado')
  } catch (e) {
    errors.value = fieldErrors(e)
    toast.error(errorMessage(e))
  } finally {
    saving.value = false
  }
}

async function approve() {
  busy.value = true
  try {
    if (dirty.value) await save()
    await financeApi.approveBudget(id, {
      approvedOn: approval.value.approvedOn,
      approvalReference: approval.value.approvalReference || null,
    })
    approveOpen.value = false
    toast.success('Presupuesto aprobado')
    await load()
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    busy.value = false
  }
}

async function reopen() {
  busy.value = true
  try {
    await financeApi.reopenBudget(id)
    await load()
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    busy.value = false
  }
}

async function remove() {
  busy.value = true
  try {
    await financeApi.removeBudget(id)
    toast.success('Presupuesto eliminado')
    await router.push({ name: 'finance-budgets' })
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    busy.value = false
  }
}

const tone = (row: BudgetExecutionRow, kind: 'income' | 'expense') => {
  if (row.execution === null) return ''
  const over = kind === 'expense' ? row.execution > 100 : row.execution < 90
  return over ? 'text-coral-700 dark:text-coral-300' : ''
}

function exportCsv() {
  if (!budget.value) return
  const e = budget.value.execution
  const rows = (kind: 'income' | 'expense') =>
    e[kind].rows.map((row) => [
      kind === 'income' ? 'Ingreso' : 'Gasto',
      row.code,
      row.name,
      csvAmount(row.budgeted),
      csvAmount(row.toDate),
      csvAmount(row.actual),
      csvAmount(row.variance),
      row.execution ?? '',
    ])
  downloadCsv(`ejecucion-presupuesto-${budget.value.year}.csv`, [
    [
      'Tipo',
      'Cuenta',
      'Nombre',
      'Presupuesto anual',
      'Presupuesto a la fecha',
      'Ejecutado',
      'Diferencia',
      '% ejecución',
    ],
    ...rows('income'),
    ...rows('expense'),
  ])
}
</script>

<template>
  <DuiAlert v-if="error" color="danger" variant="soft">{{ error }}</DuiAlert>
  <DuiSkeleton v-else-if="!budget" class="h-64 rounded-2xl" />
  <template v-else>
    <PageHeader
      :title="budget.name"
      :subtitle="
        budget.approvedOn
          ? `Aprobado el ${formatDate(budget.approvedOn)}${budget.approvalReference ? ` · ${budget.approvalReference}` : ''}`
          : 'Borrador: aún no se ha aprobado en asamblea'
      "
    >
      <template #before>
        <RouterLink
          :to="{ name: 'finance-budgets' }"
          class="mb-1 inline-block text-sm text-neutral-500 hover:underline"
        >
          <span aria-hidden="true"><i class="mdi mdi-arrow-left" /></span> Presupuestos
        </RouterLink>
      </template>
      <template #actions>
        <StatusBadge kind="budget" :status="budget.status" />
        <template v-if="tenant.canManageFinance">
          <template v-if="budget.status === 'draft'">
            <DuiButton variant="ghost" color="danger" @click="deleteOpen = true"
              >Eliminar</DuiButton
            >
            <DuiButton variant="outline" :loading="saving" :disabled="!dirty" @click="save"
              >Guardar</DuiButton
            >
            <DuiButton color="primary" @click="approveOpen = true">Aprobar</DuiButton>
          </template>
          <DuiButton v-else variant="outline" :loading="busy" @click="reopen"
            >Volver a borrador</DuiButton
          >
        </template>
      </template>
    </PageHeader>

    <div class="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatTile
        label="Gastos del año"
        :value="formatMoney(budget.execution.expense.totals.budgeted)"
        icon="mdi mdi-receipt-text-outline"
        tone="amber"
      />
      <StatTile
        label="Fondo de imprevistos"
        :value="formatMoney(budget.monthlyBase.reserve)"
        :hint="`${Number(budget.reserveFundRate)} % de los gastos`"
        icon="mdi mdi-shield-check-outline"
        tone="brand"
      />
      <StatTile
        label="Otros ingresos"
        :value="formatMoney(budget.monthlyBase.otherIncome)"
        hint="Parqueaderos, alquileres, intereses…"
        icon="mdi mdi-cash-plus"
      />
      <StatTile
        label="A recaudar en cuotas"
        :value="`${formatMoney(budget.monthlyBase.monthly)} / mes`"
        hint="Base para calcular las cuotas"
        icon="mdi mdi-calculator-variant-outline"
        tone="coral"
        :to="{ name: 'finance-fees' }"
      />
    </div>

    <DuiTabs
      v-model="tab"
      :tabs="[
        { label: 'Ejecución', value: 'execution', icon: 'mdi mdi-chart-bar' },
        { label: 'Partidas', value: 'items', icon: 'mdi mdi-format-list-numbered' },
      ]"
      class="mb-4"
      aria-label="Vista"
    />

    <template v-if="tab === 'execution'">
      <div
        class="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-neutral-600 dark:text-neutral-300"
      >
        <span
          >Al {{ formatDate(budget.execution.asOf) }} · {{ budget.execution.monthsElapsed }} de 12
          meses transcurridos</span
        >
        <DuiButton size="sm" variant="outline" @click="exportCsv">
          <span class="mr-1"><i class="mdi mdi-download" aria-hidden="true" /></span>CSV
        </DuiButton>
      </div>
      <DuiCard
        v-for="kind in ['income', 'expense'] as const"
        :key="kind"
        :title="kind === 'income' ? 'Ingresos' : 'Gastos'"
        class="mb-6"
      >
        <div class="overflow-x-auto">
          <table class="w-full min-w-[42rem] text-sm">
            <thead class="text-left text-xs text-neutral-500 uppercase">
              <tr>
                <th class="py-2 font-medium">Cuenta</th>
                <th class="py-2 text-right font-medium">Anual</th>
                <th class="py-2 text-right font-medium">A la fecha</th>
                <th class="py-2 text-right font-medium">Ejecutado</th>
                <th class="py-2 text-right font-medium">Diferencia</th>
                <th class="w-40 py-2 pl-4 font-medium">Ejecución</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-neutral-100 dark:divide-white/10">
              <tr
                v-for="row in budget.execution[kind].rows"
                :key="row.accountId + (row.itemId ?? '')"
              >
                <td class="py-2">
                  <span class="tabular-nums text-neutral-500">{{ row.code }}</span>
                  {{ row.description ?? row.name }}
                  <span v-if="!row.itemId" class="ml-1 text-xs text-amber-700 dark:text-amber-300"
                    >(sin presupuesto)</span
                  >
                </td>
                <td class="py-2 text-right tabular-nums">{{ formatAmount(row.budgeted) }}</td>
                <td class="py-2 text-right tabular-nums">{{ formatAmount(row.toDate) }}</td>
                <td class="py-2 text-right font-semibold tabular-nums">
                  {{ formatAmount(row.actual) }}
                </td>
                <td class="py-2 text-right tabular-nums" :class="tone(row, kind)">
                  {{ formatAmount(row.variance) }}
                </td>
                <td class="py-2 pl-4">
                  <div v-if="row.execution !== null" class="flex items-center gap-2">
                    <span
                      class="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-white/10"
                    >
                      <span
                        class="block h-full rounded-full"
                        :class="
                          kind === 'expense' && row.execution > 100 ? 'bg-coral-500' : 'bg-mint-500'
                        "
                        :style="{ width: `${Math.min(row.execution, 100)}%` }"
                      />
                    </span>
                    <span
                      class="w-14 shrink-0 text-right text-xs whitespace-nowrap tabular-nums"
                      :class="tone(row, kind)"
                      >{{ row.execution }} %</span
                    >
                  </div>
                </td>
              </tr>
            </tbody>
            <tfoot class="font-semibold">
              <tr>
                <td class="pt-2">Total</td>
                <td class="pt-2 text-right tabular-nums">
                  {{ formatMoney(budget.execution[kind].totals.budgeted) }}
                </td>
                <td class="pt-2 text-right tabular-nums">
                  {{ formatMoney(budget.execution[kind].totals.toDate) }}
                </td>
                <td class="pt-2 text-right tabular-nums">
                  {{ formatMoney(budget.execution[kind].totals.actual) }}
                </td>
                <td class="pt-2 text-right tabular-nums">
                  {{ formatMoney(budget.execution[kind].totals.variance) }}
                </td>
                <td class="pt-2 pl-4 text-xs tabular-nums">
                  {{ budget.execution[kind].totals.execution ?? '—' }} %
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </DuiCard>
    </template>

    <DuiCard v-else>
      <div class="mb-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem_10rem]">
        <DuiLabel title="Nombre" :error="errors.name">
          <DuiInput
            v-model="form.name"
            :disabled="!editable"
            maxlength="120"
            @input="dirty = true"
          />
        </DuiLabel>
        <DuiLabel title="Año" :error="errors.year">
          <DuiInput
            v-model.number="form.year"
            type="number"
            :disabled="!editable"
            @input="dirty = true"
          />
        </DuiLabel>
        <DuiLabel
          title="Fondo de imprevistos %"
          help-text="Mínimo 1 % (Ley 675)"
          :error="errors.reserveFundRate"
        >
          <DuiInput
            v-model="form.reserveFundRate"
            inputmode="decimal"
            :disabled="!editable"
            @input="dirty = true"
          />
        </DuiLabel>
      </div>
      <div class="flex flex-col gap-2">
        <div
          v-for="(item, i) in items"
          :key="i"
          class="grid gap-2 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_10rem_2rem]"
        >
          <AccountSelect
            v-if="editable"
            v-model="item.accountId"
            :classes="['income', 'expense']"
            :aria-label="`Cuenta de la partida ${i + 1}`"
            @change="dirty = true"
          />
          <span v-else class="py-2 text-sm"
            >{{ catalog.accounts.value.find((a) => a.id === item.accountId)?.code }} ·
            {{ catalog.accounts.value.find((a) => a.id === item.accountId)?.name }}</span
          >
          <DuiInput
            v-model="item.description"
            maxlength="255"
            placeholder="Detalle"
            :disabled="!editable"
            :aria-label="`Detalle de la partida ${i + 1}`"
            @input="dirty = true"
          />
          <DuiInput
            v-model="item.annualAmount"
            inputmode="decimal"
            placeholder="Valor anual"
            :disabled="!editable"
            :aria-label="`Valor anual de la partida ${i + 1}`"
            @input="dirty = true"
          />
          <button
            v-if="editable"
            type="button"
            class="text-neutral-400 hover:text-coral-600"
            :aria-label="`Quitar partida ${i + 1}`"
            @click="(items.splice(i, 1), (dirty = true))"
          >
            <i class="mdi mdi-close" aria-hidden="true" />
          </button>
        </div>
        <button
          v-if="editable"
          type="button"
          class="self-start text-sm font-semibold text-mint-700 dark:text-mint-300"
          @click="items.push({ accountId: '', description: '', annualAmount: '' })"
        >
          + Agregar partida
        </button>
        <p v-if="errors.items" class="text-sm text-coral-700">{{ errors.items }}</p>
      </div>
      <dl
        class="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-neutral-50 p-4 text-sm sm:grid-cols-4 dark:bg-white/5"
      >
        <div>
          <dt class="text-neutral-500">Gastos</dt>
          <dd class="font-semibold tabular-nums">{{ formatMoney(totals.expense) }}</dd>
        </div>
        <div>
          <dt class="text-neutral-500">Fondo de imprevistos</dt>
          <dd class="font-semibold tabular-nums">{{ formatMoney(totals.reserve) }}</dd>
        </div>
        <div>
          <dt class="text-neutral-500">Ingresos presupuestados</dt>
          <dd class="font-semibold tabular-nums">{{ formatMoney(totals.income) }}</dd>
        </div>
        <div>
          <dt class="text-neutral-500">Cuota mensual estimada</dt>
          <dd class="font-semibold tabular-nums">{{ formatMoney(budget.monthlyBase.monthly) }}</dd>
        </div>
      </dl>
    </DuiCard>

    <DuiModal v-model="approveOpen" title="Aprobar presupuesto" size="sm" :persistent="busy">
      <div class="flex flex-col gap-4">
        <DuiLabel title="Fecha de la asamblea" required>
          <DuiInput v-model="approval.approvedOn" type="date" required />
        </DuiLabel>
        <DuiLabel title="Acta" help-text="Referencia del acta de asamblea">
          <DuiInput
            v-model="approval.approvalReference"
            maxlength="120"
            placeholder="Acta 23 de asamblea ordinaria"
          />
        </DuiLabel>
      </div>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <DuiButton variant="ghost" :disabled="busy" @click="approveOpen = false"
            >Cancelar</DuiButton
          >
          <DuiButton color="primary" :loading="busy" @click="approve">Aprobar</DuiButton>
        </div>
      </template>
    </DuiModal>
    <ConfirmDialog
      v-model="deleteOpen"
      title="Eliminar presupuesto"
      :message="`¿Eliminar «${budget.name}»?`"
      confirm-label="Eliminar"
      :loading="busy"
      @confirm="remove"
    />
  </template>
</template>
