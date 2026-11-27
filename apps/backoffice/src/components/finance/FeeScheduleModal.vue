<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  UiAlert,
  UiButton,
  UiCheckbox,
  UiInput,
  UiLabel,
  UiModal,
  UiSelect,
  useToast,
} from '@aptoph/ui'
import {
  FEE_METHODS,
  FEE_METHOD_DESCRIPTIONS,
  FEE_METHOD_LABELS,
  ROUNDING_MODES,
  ROUNDING_MODE_LABELS,
  ROUNDING_STEPS,
  UNIT_TYPES,
  UNIT_TYPE_LABELS,
  type Budget,
  type ContributionModule,
  type FeeMethod,
  type FeePreview,
  type FeeScheduleInput,
  type RoundingMode,
  type RoundingStep,
  type UnitType,
} from '@aptoph/shared'
import { financeApi } from '@/api/finance'
import { useFinanceCatalog } from '@/composables/useFinanceCatalog'
import { errorMessage, fieldErrors } from '@/lib/errors'
import {
  addMonthsInput,
  formatMoney,
  formatPeriod,
  parseAmount,
  thisMonthInput,
} from '@/lib/format'

const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ applied: [] }>()
const toast = useToast()
const catalog = useFinanceCatalog()

const budgets = ref<Budget[]>([])
const modules = ref<ContributionModule[]>([])
const step = ref<'form' | 'preview'>('form')
const source = ref<'amount' | 'budget'>('amount')
const form = ref({
  conceptId: '',
  method: 'coefficient' as FeeMethod,
  effectiveFrom: addMonthsInput(thisMonthInput(), 1),
  monthlyTotal: '',
  budgetId: '',
  unitTypes: [] as UnitType[],
  mergeAnnexes: true,
  rounding: 100 as RoundingStep,
  roundingMode: 'nearest' as RoundingMode,
  amountsByType: {} as Partial<Record<UnitType, string>>,
  modules: {} as Record<string, string>,
})
const preview = ref<FeePreview | null>(null)
const errors = ref<Record<string, string>>({})
const error = ref<string | null>(null)
const busy = ref(false)

watch(open, async (isOpen) => {
  if (!isOpen) return
  step.value = 'form'
  preview.value = null
  errors.value = {}
  error.value = null
  await catalog.load()
  const [budgetList, moduleList] = await Promise.all([financeApi.budgets(), financeApi.modules()])
  budgets.value = budgetList.data.filter((budget) => budget.status === 'approved')
  modules.value = moduleList.data
  const ordinary = catalog.concepts.value.find((concept) => concept.type === 'ordinary_fee')
  if (!form.value.conceptId && ordinary) form.value.conceptId = ordinary.id
})

const conceptOptions = computed(() =>
  catalog.activeConcepts.value
    .filter((concept) => concept.type !== 'interest')
    .map((concept) => ({ value: concept.id, label: concept.name })),
)
const methodOptions = FEE_METHODS.map((value) => ({ value, label: FEE_METHOD_LABELS[value] }))
const budgetOptions = computed(() => [
  { value: '', label: 'Selecciona un presupuesto aprobado' },
  ...budgets.value.map((budget) => ({
    value: budget.id,
    label: `${budget.name} (${budget.year})`,
  })),
])
const roundingOptions = ROUNDING_STEPS.map((value) => ({
  value,
  label: value === 1 ? 'Sin redondeo' : `A $ ${value.toLocaleString('es-CO')}`,
}))
const roundingModeOptions = ROUNDING_MODES.map((value) => ({
  value,
  label: ROUNDING_MODE_LABELS[value],
}))
const usesTotal = computed(() => ['coefficient', 'area', 'equal'].includes(form.value.method))

function input(): FeeScheduleInput {
  const value = form.value
  return {
    conceptId: value.conceptId,
    method: value.method,
    effectiveFrom: value.effectiveFrom,
    monthlyTotal:
      usesTotal.value && source.value === 'amount' ? parseAmount(value.monthlyTotal) : null,
    budgetId: usesTotal.value && source.value === 'budget' ? value.budgetId || null : null,
    unitTypes: value.unitTypes.length ? value.unitTypes : undefined,
    mergeAnnexes: value.mergeAnnexes,
    rounding: value.rounding,
    roundingMode: value.roundingMode,
    amountsByType:
      value.method === 'fixed_by_type'
        ? Object.fromEntries(
            Object.entries(value.amountsByType)
              .filter(([, amount]) => amount !== '' && amount !== undefined)
              .map(([type, amount]) => [type, parseAmount(amount)]),
          )
        : undefined,
    modules:
      value.method === 'module'
        ? Object.entries(value.modules)
            .filter(([, amount]) => parseAmount(amount) > 0)
            .map(([moduleId, amount]) => ({ moduleId, monthlyTotal: parseAmount(amount) }))
        : undefined,
  }
}

async function run(action: 'preview' | 'apply') {
  busy.value = true
  errors.value = {}
  error.value = null
  try {
    if (action === 'preview') {
      preview.value = (await financeApi.previewSchedule(input())).data
      step.value = 'preview'
    } else {
      const { data } = await financeApi.applySchedule(input())
      toast.success(
        `Tarifas aplicadas a ${data.rows.length} unidades desde ${formatPeriod(`${form.value.effectiveFrom}-01`).toLowerCase()}`,
      )
      emit('applied')
      open.value = false
    }
  } catch (e) {
    errors.value = fieldErrors(e)
    error.value = errorMessage(e)
    if (action === 'apply') step.value = 'form'
  } finally {
    busy.value = false
  }
}

const changed = computed(
  () => (preview.value?.rows ?? []).filter((row) => row.current !== row.amount).length,
)
</script>

<template>
  <UiModal
    v-model="open"
    title="Calcular cuotas"
    description="Reparte un valor mensual entre las unidades y deja las tarifas listas para facturar"
    size="xl"
    :persistent="busy"
    scrollable
  >
    <UiAlert v-if="error" color="danger" variant="soft" class="mb-4">{{ error }}</UiAlert>

    <form v-if="step === 'form'" class="flex flex-col gap-4" @submit.prevent="run('preview')">
      <div class="grid gap-4 sm:grid-cols-2">
        <UiLabel title="Concepto" required :error="errors.conceptId">
          <UiSelect v-model="form.conceptId" :options="conceptOptions" block />
        </UiLabel>
        <UiLabel
          title="Desde el mes"
          required
          :error="errors.effectiveFrom"
          help-text="Reemplaza las tarifas vigentes de ese concepto"
        >
          <UiInput v-model="form.effectiveFrom" type="month" required />
        </UiLabel>
      </div>

      <UiLabel title="Cómo se reparte" required :help-text="FEE_METHOD_DESCRIPTIONS[form.method]">
        <UiSelect v-model="form.method" :options="methodOptions" block />
      </UiLabel>

      <template v-if="usesTotal">
        <div class="flex gap-4 text-sm">
          <label class="flex items-center gap-1.5"
            ><input v-model="source" type="radio" value="amount" /> Valor mensual</label
          >
          <label class="flex items-center gap-1.5"
            ><input v-model="source" type="radio" value="budget" /> Desde el presupuesto
            aprobado</label
          >
        </div>
        <UiLabel
          v-if="source === 'amount'"
          title="Total mensual a recaudar"
          required
          :error="errors.monthlyTotal"
        >
          <UiInput
            v-model="form.monthlyTotal"
            inputmode="decimal"
            placeholder="45.000.000"
            required
          />
        </UiLabel>
        <UiLabel
          v-else
          title="Presupuesto"
          required
          :error="errors.budgetId"
          help-text="(Gastos + fondo de imprevistos − otros ingresos) ÷ 12"
        >
          <UiSelect v-model="form.budgetId" :options="budgetOptions" block />
        </UiLabel>
      </template>

      <div v-if="form.method === 'fixed_by_type'" class="grid gap-3 sm:grid-cols-3">
        <UiLabel v-for="type in UNIT_TYPES" :key="type" :title="UNIT_TYPE_LABELS[type]">
          <UiInput
            v-model="form.amountsByType[type]"
            inputmode="decimal"
            placeholder="Sin cobro"
          />
        </UiLabel>
      </div>

      <div v-if="form.method === 'module'" class="flex flex-col gap-2">
        <p v-if="modules.length === 0" class="text-sm text-neutral-500">
          Aún no hay módulos. Créalos en la pestaña <strong>Módulos</strong> con las unidades y su
          participación.
        </p>
        <UiLabel
          v-for="module in modules"
          :key="module.id"
          :title="`${module.name} · ${module.unitsCount} unidades`"
        >
          <UiInput
            v-model="form.modules[module.id]"
            inputmode="decimal"
            placeholder="Total mensual del módulo"
          />
        </UiLabel>
      </div>

      <fieldset v-if="form.method !== 'module'">
        <legend class="mb-2 text-sm font-medium">Tipos de unidad que pagan</legend>
        <div class="flex flex-wrap gap-x-5 gap-y-2">
          <UiCheckbox
            v-for="type in UNIT_TYPES"
            :key="type"
            :model-value="form.unitTypes.includes(type)"
            :label="UNIT_TYPE_LABELS[type]"
            @update:model-value="
              (checked: boolean | unknown[]) =>
                (form.unitTypes =
                  checked === true
                    ? [...form.unitTypes, type]
                    : form.unitTypes.filter((t) => t !== type))
            "
          />
        </div>
        <p class="mt-1 text-xs text-neutral-500">Sin selección: todas las unidades activas.</p>
      </fieldset>

      <UiCheckbox
        v-if="form.method !== 'fixed_by_type'"
        v-model="form.mergeAnnexes"
        label="Sumar parqueaderos y depósitos anexos a su unidad principal (una sola cuota)"
      />

      <div class="grid gap-4 sm:grid-cols-2">
        <UiLabel title="Redondeo">
          <UiSelect v-model="form.rounding" :options="roundingOptions" block />
        </UiLabel>
        <UiLabel title="Sentido del redondeo">
          <UiSelect v-model="form.roundingMode" :options="roundingModeOptions" block />
        </UiLabel>
      </div>
    </form>

    <div v-else-if="preview" class="flex flex-col gap-4 text-sm">
      <dl class="grid gap-3 rounded-xl bg-neutral-50 p-4 sm:grid-cols-4 dark:bg-white/5">
        <div>
          <dt class="text-neutral-500">Total mensual</dt>
          <dd class="font-semibold tabular-nums">{{ formatMoney(preview.total) }}</dd>
        </div>
        <div>
          <dt class="text-neutral-500">Vigente hoy</dt>
          <dd class="font-semibold tabular-nums">{{ formatMoney(preview.currentTotal) }}</dd>
        </div>
        <div>
          <dt class="text-neutral-500">Diferencia por redondeo</dt>
          <dd class="font-semibold tabular-nums">{{ formatMoney(preview.roundingDifference) }}</dd>
        </div>
        <div>
          <dt class="text-neutral-500">Unidades que cambian</dt>
          <dd class="font-semibold tabular-nums">{{ changed }} de {{ preview.rows.length }}</dd>
        </div>
      </dl>
      <p v-if="preview.budgetBase" class="text-neutral-600 dark:text-neutral-300">
        Base del presupuesto: gastos {{ formatMoney(preview.budgetBase.expenses) }} + fondo
        {{ formatMoney(preview.budgetBase.reserve) }} − otros ingresos
        {{ formatMoney(preview.budgetBase.otherIncome) }} =
        <strong>{{ formatMoney(preview.budgetBase.monthly) }} al mes</strong>.
      </p>
      <ul
        v-if="preview.warnings.length"
        class="flex flex-col gap-1 text-amber-800 dark:text-amber-200"
      >
        <li v-for="warning in preview.warnings" :key="warning" class="flex gap-2">
          <span aria-hidden="true"><i class="mdi mdi-alert-outline" /></span>{{ warning }}
        </li>
      </ul>
      <div class="max-h-96 overflow-y-auto rounded-lg ring-1 ring-neutral-200 dark:ring-white/10">
        <table class="w-full">
          <thead
            class="sticky top-0 bg-white text-left text-xs text-neutral-500 uppercase dark:bg-neutral-900"
          >
            <tr>
              <th class="px-3 py-2 font-medium">Unidad</th>
              <th class="px-3 py-2 text-right font-medium">Base</th>
              <th class="px-3 py-2 text-right font-medium">Actual</th>
              <th class="px-3 py-2 text-right font-medium">Nueva</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-100 dark:divide-white/10">
            <tr v-for="row in preview.rows" :key="row.unitId">
              <td class="px-3 py-1.5">
                <span class="font-medium">{{
                  [row.building, `${UNIT_TYPE_LABELS[row.type]} ${row.code}`]
                    .filter(Boolean)
                    .join(' · ')
                }}</span>
                <span v-if="row.includes.length" class="block text-xs text-neutral-500"
                  >Incluye {{ row.includes.join(', ') }}</span
                >
              </td>
              <td class="px-3 py-1.5 text-right text-neutral-500 tabular-nums">
                {{ row.basis ?? '—' }}
              </td>
              <td class="px-3 py-1.5 text-right tabular-nums">{{ formatMoney(row.current) }}</td>
              <td
                class="px-3 py-1.5 text-right font-semibold tabular-nums"
                :class="row.current !== row.amount ? 'text-mint-700 dark:text-mint-300' : ''"
              >
                {{ formatMoney(row.amount) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <template v-if="step === 'form'">
          <UiButton variant="ghost" :disabled="busy" @click="open = false">Cancelar</UiButton>
          <UiButton color="primary" :loading="busy" @click="run('preview')">Calcular</UiButton>
        </template>
        <template v-else>
          <UiButton variant="ghost" :disabled="busy" @click="step = 'form'">Volver</UiButton>
          <UiButton
            color="primary"
            :loading="busy"
            :disabled="!preview?.rows.length"
            @click="run('apply')"
          >
            Aplicar desde {{ formatPeriod(`${form.effectiveFrom}-01`).toLowerCase() }}
          </UiButton>
        </template>
      </div>
    </template>
  </UiModal>
</template>
