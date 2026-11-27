<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  UiBadge,
  UiButton,
  UiInput,
  UiSelect,
  UiTable,
  UiTabs,
  useToast,
  type TableColumn,
} from '@aptoph/ui'
import {
  CHARGE_CONCEPT_TYPE_LABELS,
  FEE_METHOD_LABELS,
  type ApiPaginated,
  type ChargeConcept,
  type ContributionModule,
  type FeeSchedule,
  type RecurringCharge,
} from '@aptoph/shared'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import FeeScheduleModal from '@/components/finance/FeeScheduleModal.vue'
import RecurringFormModal from '@/components/finance/RecurringFormModal.vue'
import ConceptFormModal from '@/components/finance/ConceptFormModal.vue'
import ModuleFormModal from '@/components/finance/ModuleFormModal.vue'
import { financeApi } from '@/api/finance'
import { useFinanceCatalog } from '@/composables/useFinanceCatalog'
import { errorMessage } from '@/lib/errors'
import { formatDateTime, formatMoney, formatPeriod, thisMonthInput, unitLabel } from '@/lib/format'
import { useTenantStore } from '@/stores/tenant'

const route = useRoute()
const router = useRouter()
const tenant = useTenantStore()
const toast = useToast()
const catalog = useFinanceCatalog()

const tab = ref(String(route.query.tab ?? 'fees'))
watch(tab, (value) => router.replace({ query: { tab: value } }))
const tabs = [
  { label: 'Tarifas vigentes', value: 'fees', icon: 'mdi mdi-home-currency-usd' },
  { label: 'Cálculos', value: 'schedules', icon: 'mdi mdi-calculator-variant-outline' },
  { label: 'Conceptos', value: 'concepts', icon: 'mdi mdi-tag-multiple-outline' },
  { label: 'Módulos', value: 'modules', icon: 'mdi mdi-view-grid-outline' },
]

// Fees in effect in a month
const month = ref(thisMonthInput())
const conceptId = ref('')
const search = ref('')
const page = ref(1)
const fees = ref<(ApiPaginated<RecurringCharge> & { total: string }) | null>(null)
const loadingFees = ref(false)
const calculatorOpen = ref(false)
const recurringOpen = ref(false)
const ending = ref<RecurringCharge | null>(null)
const endOpen = ref(false)
const busy = ref(false)

const feeColumns: TableColumn[] = [
  { name: 'unit', label: 'Unidad' },
  { name: 'concept', label: 'Concepto' },
  { name: 'validity', label: 'Vigencia' },
  { name: 'amount', label: 'Valor mensual', classes: 'text-right' },
  ...(tenant.canManageFinance ? [{ name: 'actions', label: '', classes: 'w-24 text-right' }] : []),
]
const conceptOptions = computed(() => [
  { value: '', label: 'Todos los conceptos' },
  ...catalog.concepts.value
    .filter((c) => c.type !== 'interest')
    .map((c) => ({ value: c.id, label: c.name })),
])

async function loadFees() {
  loadingFees.value = true
  try {
    fees.value = await financeApi.recurring({
      period: month.value,
      conceptId: conceptId.value || undefined,
      search: search.value || undefined,
      page: page.value,
      perPage: 100,
    })
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    loadingFees.value = false
  }
}
let timer: ReturnType<typeof setTimeout> | undefined
watch([month, conceptId], () => ((page.value = 1), loadFees()))
watch(search, () => {
  clearTimeout(timer)
  timer = setTimeout(() => ((page.value = 1), loadFees()), 300)
})

async function endFee() {
  if (!ending.value) return
  busy.value = true
  try {
    // Last month billed is the previous one: from next month on it no longer applies
    await financeApi.endRecurring(ending.value.id, thisMonthInput())
    toast.success('La tarifa termina este mes')
    endOpen.value = false
    await loadFees()
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    busy.value = false
  }
}

// Schedules
const schedules = ref<FeeSchedule[]>([])
async function loadSchedules() {
  schedules.value = (await financeApi.schedules()).data
}
const scheduleColumns: TableColumn[] = [
  { name: 'effectiveFrom', label: 'Desde' },
  { name: 'concept', label: 'Concepto' },
  { name: 'method', label: 'Método' },
  { name: 'unitsCount', label: 'Unidades', classes: 'text-right' },
  { name: 'totalAmount', label: 'Total mensual', classes: 'text-right' },
  { name: 'createdAt', label: 'Calculado' },
]

// Concepts
const conceptFormOpen = ref(false)
const editingConcept = ref<ChargeConcept | null>(null)
const conceptColumns: TableColumn[] = [
  { name: 'name', label: 'Concepto' },
  { name: 'accounts', label: 'Cuentas' },
  { name: 'rules', label: 'Reglas' },
  { name: 'defaultAmount', label: 'Valor sugerido', classes: 'text-right' },
  ...(tenant.canManageFinance ? [{ name: 'actions', label: '', classes: 'w-20 text-right' }] : []),
]

// Modules
const modules = ref<ContributionModule[]>([])
const moduleFormOpen = ref(false)
const editingModule = ref<ContributionModule | null>(null)
const deletingModule = ref<ContributionModule | null>(null)
const deleteModuleOpen = ref(false)
async function loadModules() {
  modules.value = (await financeApi.modules()).data
}
async function deleteModule() {
  if (!deletingModule.value) return
  busy.value = true
  try {
    await financeApi.removeModule(deletingModule.value.id)
    toast.success('Módulo eliminado')
    deleteModuleOpen.value = false
    await loadModules()
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    busy.value = false
  }
}

function afterCalculation() {
  loadFees()
  loadSchedules()
}

onMounted(() => {
  catalog.load()
  loadFees()
  loadSchedules().catch(() => undefined)
  loadModules().catch(() => undefined)
})
</script>

<template>
  <PageHeader
    title="Tarifas y cuotas"
    subtitle="Lo que paga cada unidad cada mes y cómo se calcula"
  >
    <template v-if="tenant.canManageFinance" #actions>
      <UiButton variant="outline" @click="recurringOpen = true">
        <span class="mr-1"><i class="mdi mdi-plus" aria-hidden="true" /></span>Tarifa de una unidad
      </UiButton>
      <UiButton color="primary" @click="calculatorOpen = true">
        <span class="mr-1"><i class="mdi mdi-calculator-variant-outline" aria-hidden="true" /></span
        >Calcular cuotas
      </UiButton>
    </template>
  </PageHeader>

  <UiTabs v-model="tab" :tabs="tabs" class="mb-4" aria-label="Vista" />

  <template v-if="tab === 'fees'">
    <div class="mb-4 grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)_16rem]">
      <UiInput v-model="month" type="month" aria-label="Mes" block />
      <UiInput
        v-model="search"
        type="search"
        placeholder="Buscar por unidad"
        aria-label="Buscar por unidad"
        block
      />
      <UiSelect v-model="conceptId" :options="conceptOptions" aria-label="Concepto" block />
    </div>
    <p v-if="fees" class="mb-3 text-sm text-neutral-600 dark:text-neutral-300">
      En {{ formatPeriod(`${month}-01`).toLowerCase() }} se facturan
      <strong>{{ fees.metadata.total }}</strong> tarifas por
      <strong>{{ formatMoney(fees.total) }}</strong
      >.
    </p>
    <UiTable
      :columns="feeColumns"
      :rows="fees?.data ?? []"
      :loading="loadingFees"
      :pagination="
        fees
          ? {
              page: fees.metadata.currentPage,
              perPage: fees.metadata.perPage,
              total: fees.metadata.total,
            }
          : undefined
      "
      @paginate="(p: number) => ((page = p), loadFees())"
    >
      <template #unit="row">
        <RouterLink
          v-if="row.unit"
          :to="{ name: 'finance-statement', params: { unitId: row.unit.id } }"
          class="font-medium hover:underline"
        >
          {{ unitLabel(row.unit) }}
        </RouterLink>
        <span v-if="row.description" class="block text-xs text-neutral-500">{{
          row.description
        }}</span>
      </template>
      <template #concept="row">{{ row.concept?.name }}</template>
      <template #validity="{ startsOn, endsOn }">
        {{ formatPeriod(startsOn) }}<template v-if="endsOn"> → {{ formatPeriod(endsOn) }}</template>
      </template>
      <template #amount="{ amount }"
        ><span class="font-semibold tabular-nums">{{ formatMoney(amount) }}</span></template
      >
      <template #actions="row">
        <UiButton
          v-if="!row.endsOn"
          size="sm"
          variant="ghost"
          color="danger"
          @click="((ending = row as RecurringCharge), (endOpen = true))"
          >Terminar</UiButton
        >
      </template>
      <template #empty>
        <EmptyState
          title="No hay tarifas en este mes"
          description="Usa «Calcular cuotas» para repartir el presupuesto entre las unidades, o agrega la tarifa de una unidad."
        />
      </template>
    </UiTable>
  </template>

  <UiTable v-else-if="tab === 'schedules'" :columns="scheduleColumns" :rows="schedules">
    <template #effectiveFrom="{ effectiveFrom }"
      ><span class="font-medium">{{ formatPeriod(effectiveFrom) }}</span></template
    >
    <template #concept="row">{{ row.concept?.name }}</template>
    <template #method="{ method }">{{
      FEE_METHOD_LABELS[method as keyof typeof FEE_METHOD_LABELS]
    }}</template>
    <template #totalAmount="{ totalAmount }"
      ><span class="tabular-nums">{{ formatMoney(totalAmount) }}</span></template
    >
    <template #createdAt="{ createdAt }">{{ formatDateTime(createdAt) }}</template>
    <template #empty>
      <EmptyState
        title="Aún no has calculado cuotas"
        description="Cada cálculo queda aquí como historial de los cambios de tarifa."
      />
    </template>
  </UiTable>

  <template v-else-if="tab === 'concepts'">
    <div v-if="tenant.canManageFinance" class="mb-3 flex justify-end">
      <UiButton
        size="sm"
        color="primary"
        @click="((editingConcept = null), (conceptFormOpen = true))"
      >
        <span class="mr-1"><i class="mdi mdi-plus" aria-hidden="true" /></span>Nuevo concepto
      </UiButton>
    </div>
    <UiTable :columns="conceptColumns" :rows="catalog.concepts.value">
      <template #name="row">
        <span class="font-medium" :class="row.isActive ? '' : 'text-neutral-400 line-through'">{{
          row.name
        }}</span>
        <span class="block text-xs text-neutral-500">{{
          CHARGE_CONCEPT_TYPE_LABELS[row.type as keyof typeof CHARGE_CONCEPT_TYPE_LABELS]
        }}</span>
      </template>
      <template #accounts="row">
        <span class="block text-xs tabular-nums"
          >{{ row.receivableAccount?.code }} · {{ row.receivableAccount?.name }}</span
        >
        <span class="block text-xs text-neutral-500 tabular-nums"
          >{{ row.incomeAccount?.code }} · {{ row.incomeAccount?.name }}</span
        >
      </template>
      <template #rules="row">
        <div class="flex flex-wrap gap-1">
          <UiBadge
            v-if="row.accruesInterest"
            label="Genera mora"
            size="sm"
            variant="soft"
            color="warning"
          />
          <UiBadge
            v-if="row.allowsEarlyDiscount"
            label="Pronto pago"
            size="sm"
            variant="soft"
            color="success"
          />
          <UiBadge v-if="row.isSystem" label="Del sistema" size="sm" variant="soft" />
        </div>
      </template>
      <template #defaultAmount="{ defaultAmount }"
        ><span class="tabular-nums">{{ formatMoney(defaultAmount) }}</span></template
      >
      <template #actions="row">
        <UiButton
          v-if="row.type !== 'interest'"
          size="sm"
          variant="ghost"
          @click="((editingConcept = row as ChargeConcept), (conceptFormOpen = true))"
          >Editar</UiButton
        >
      </template>
    </UiTable>
  </template>

  <template v-else>
    <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
      <p class="max-w-2xl text-sm text-neutral-600 dark:text-neutral-300">
        Los módulos sirven cuando el reglamento divide los gastos por sectores: torres con ascensor,
        locales comerciales, zona de parqueaderos. Cada unidad paga su parte del total de cada
        módulo al que pertenece.
      </p>
      <UiButton
        v-if="tenant.canManageFinance"
        size="sm"
        color="primary"
        @click="((editingModule = null), (moduleFormOpen = true))"
      >
        <span class="mr-1"><i class="mdi mdi-plus" aria-hidden="true" /></span>Nuevo módulo
      </UiButton>
    </div>
    <div v-if="modules.length" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <article
        v-for="module in modules"
        :key="module.id"
        class="rounded-2xl bg-white p-4 ring-1 ring-brand-900/5 dark:bg-neutral-900 dark:ring-white/10"
      >
        <h3 class="font-semibold">{{ module.name }}</h3>
        <p v-if="module.description" class="text-sm text-neutral-500">{{ module.description }}</p>
        <p class="mt-2 text-sm">{{ module.unitsCount }} unidades</p>
        <div v-if="tenant.canManageFinance" class="mt-3 flex gap-2">
          <UiButton
            size="sm"
            variant="outline"
            @click="((editingModule = module), (moduleFormOpen = true))"
            >Editar</UiButton
          >
          <UiButton
            size="sm"
            variant="ghost"
            color="danger"
            @click="((deletingModule = module), (deleteModuleOpen = true))"
            >Eliminar</UiButton
          >
        </div>
      </article>
    </div>
    <EmptyState
      v-else
      title="Sin módulos"
      description="La mayoría de conjuntos residenciales no los necesitan: reparten por coeficiente."
    />
  </template>

  <FeeScheduleModal v-model="calculatorOpen" @applied="afterCalculation" />
  <RecurringFormModal v-model="recurringOpen" @saved="loadFees" />
  <ConceptFormModal v-model="conceptFormOpen" :concept="editingConcept" />
  <ModuleFormModal v-model="moduleFormOpen" :module="editingModule" @saved="loadModules" />
  <ConfirmDialog
    v-model="endOpen"
    title="Terminar tarifa"
    :message="
      ending
        ? `${unitLabel(ending.unit)} deja de pagar «${ending.concept?.name}» a partir del próximo mes.`
        : ''
    "
    confirm-label="Terminar"
    :loading="busy"
    @confirm="endFee"
  />
  <ConfirmDialog
    v-model="deleteModuleOpen"
    title="Eliminar módulo"
    :message="`¿Eliminar «${deletingModule?.name}»? Las tarifas ya calculadas no cambian.`"
    confirm-label="Eliminar"
    :loading="busy"
    @confirm="deleteModule"
  />
</template>
