<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  UiButton,
  UiInput,
  UiSelect,
  UiTable,
  UiTabs,
  useToast,
  type TableColumn,
} from '@aptoph/ui'
import {
  BILL_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  type ApiPaginated,
  type Bill,
  type BillStatus,
  type PayablesAging,
  type Vendor,
  type VendorPayment,
} from '@aptoph/shared'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import StatusBadge from '@/components/finance/StatusBadge.vue'
import BillFormModal from '@/components/finance/BillFormModal.vue'
import BillDetailModal from '@/components/finance/BillDetailModal.vue'
import VendorFormModal from '@/components/finance/VendorFormModal.vue'
import VendorPaymentModal from '@/components/finance/VendorPaymentModal.vue'
import VendorPaymentDetailModal from '@/components/finance/VendorPaymentDetailModal.vue'
import { financeApi } from '@/api/finance'
import { errorMessage } from '@/lib/errors'
import { formatAmount, formatDate, formatMoney, todayInput } from '@/lib/format'
import { useTenantStore } from '@/stores/tenant'

const route = useRoute()
const router = useRouter()
const tenant = useTenantStore()
const toast = useToast()
const today = todayInput()

const tab = ref(String(route.query.tab ?? 'bills'))
watch(tab, (value) => {
  router.replace({ query: { tab: value } })
  if (value === 'aging') loadAging()
  if (value === 'payments') loadPayments()
})
const tabs = [
  { label: 'Facturas', value: 'bills', icon: 'mdi mdi-receipt-text-outline' },
  { label: 'Egresos', value: 'payments', icon: 'mdi mdi-bank-transfer-out' },
  { label: 'Proveedores', value: 'vendors', icon: 'mdi mdi-domain' },
  { label: 'Por pagar', value: 'aging', icon: 'mdi mdi-calendar-clock' },
]

const vendors = ref<Vendor[]>([])
async function loadVendors() {
  vendors.value = (await financeApi.vendors()).data
}

// Bills
const billStatus = ref<BillStatus | 'open' | ''>('open')
const billVendor = ref('')
const billPage = ref(1)
const bills = ref<ApiPaginated<Bill> | null>(null)
const loadingBills = ref(false)
const billFormOpen = ref(false)
const billDetailOpen = ref(false)
const billId = ref<string | null>(null)
const billColumns: TableColumn[] = [
  { name: 'vendor', label: 'Proveedor' },
  { name: 'description', label: 'Descripción' },
  { name: 'issuedOn', label: 'Fecha' },
  { name: 'dueOn', label: 'Vence' },
  { name: 'netAmount', label: 'Neto', classes: 'text-right' },
  { name: 'balance', label: 'Saldo', classes: 'text-right' },
  { name: 'status', label: 'Estado' },
]
const billStatusOptions = [
  { value: 'open', label: 'Por pagar' },
  { value: '', label: 'Todas' },
  { value: 'paid', label: BILL_STATUS_LABELS.paid },
  { value: 'cancelled', label: BILL_STATUS_LABELS.cancelled },
]
const vendorOptions = computed(() => [
  { value: '', label: 'Todos los proveedores' },
  ...vendors.value.map((v) => ({ value: v.id, label: v.name })),
])

async function loadBills() {
  loadingBills.value = true
  try {
    bills.value = await financeApi.bills({
      status: billStatus.value,
      vendorId: billVendor.value || undefined,
      page: billPage.value,
      perPage: 50,
    })
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    loadingBills.value = false
  }
}
watch([billStatus, billVendor], () => ((billPage.value = 1), loadBills()))

// Vendor payments
const payments = ref<ApiPaginated<VendorPayment> | null>(null)
const paymentPage = ref(1)
const payOpen = ref(false)
const payVendorId = ref<string | null>(null)
const payBillId = ref<string | null>(null)
const paymentDetailOpen = ref(false)
const paymentId = ref<string | null>(null)
const paymentColumns: TableColumn[] = [
  { name: 'number', label: 'Egreso' },
  { name: 'vendor', label: 'Proveedor' },
  { name: 'paidOn', label: 'Fecha' },
  { name: 'cashAccount', label: 'Desde' },
  { name: 'amount', label: 'Valor', classes: 'text-right' },
  { name: 'status', label: 'Estado' },
]
async function loadPayments() {
  payments.value = await financeApi.vendorPayments({ page: paymentPage.value })
}
function pay(vendorId: string | null = null, bill: Bill | null = null) {
  payVendorId.value = bill?.vendor?.id ?? vendorId
  payBillId.value = bill?.id ?? null
  billDetailOpen.value = false
  payOpen.value = true
}

// Vendors
const vendorSearch = ref('')
const vendorFormOpen = ref(false)
const editingVendor = ref<Vendor | null>(null)
const vendorColumns: TableColumn[] = [
  { name: 'name', label: 'Proveedor' },
  { name: 'contact', label: 'Contacto' },
  { name: 'defaultAccount', label: 'Gasto habitual' },
  { name: 'balance', label: 'Debemos', classes: 'text-right' },
  ...(tenant.canManageFinance ? [{ name: 'actions', label: '', classes: 'w-40 text-right' }] : []),
]
const filteredVendors = computed(() => {
  const term = vendorSearch.value.toLowerCase()
  return vendors.value.filter(
    (v) => !term || v.name.toLowerCase().includes(term) || v.documentNumber?.includes(term),
  )
})

// Aging
const aging = ref<PayablesAging | null>(null)
async function loadAging() {
  aging.value = (await financeApi.payables()).data
}
const agingColumns: TableColumn[] = [
  { name: 'name', label: 'Proveedor' },
  { name: 'bills', label: 'Facturas', classes: 'text-right' },
  { name: 'current', label: 'Por vencer', classes: 'text-right' },
  { name: 'd30', label: '1–30 días', classes: 'text-right' },
  { name: 'd60', label: '31–60', classes: 'text-right' },
  { name: 'over60', label: 'Más de 60', classes: 'text-right' },
  { name: 'total', label: 'Total', classes: 'text-right' },
]

function refresh() {
  loadBills()
  loadVendors()
  if (tab.value === 'payments') loadPayments()
  if (tab.value === 'aging') loadAging()
}

onMounted(() => {
  loadVendors()
  loadBills()
  if (tab.value === 'payments') loadPayments()
  if (tab.value === 'aging') loadAging()
})
</script>

<template>
  <PageHeader
    title="Gastos y proveedores"
    subtitle="Facturas por pagar, egresos y proveedores de la copropiedad"
  >
    <template v-if="tenant.canManageFinance" #actions>
      <UiButton variant="outline" @click="pay()">
        <span class="mr-1"><i class="mdi mdi-bank-transfer-out" aria-hidden="true" /></span>Pagar
      </UiButton>
      <UiButton color="primary" @click="billFormOpen = true">
        <span class="mr-1"><i class="mdi mdi-plus" aria-hidden="true" /></span>Registrar gasto
      </UiButton>
    </template>
  </PageHeader>

  <UiTabs v-model="tab" :tabs="tabs" class="mb-4" aria-label="Vista" />

  <template v-if="tab === 'bills'">
    <div class="mb-4 grid gap-3 sm:grid-cols-[14rem_minmax(0,18rem)]">
      <UiSelect v-model="billStatus" :options="billStatusOptions" aria-label="Estado" block />
      <UiSelect v-model="billVendor" :options="vendorOptions" aria-label="Proveedor" block />
    </div>
    <UiTable
      :columns="billColumns"
      :rows="bills?.data ?? []"
      :loading="loadingBills"
      :pagination="
        bills
          ? {
              page: bills.metadata.currentPage,
              perPage: bills.metadata.perPage,
              total: bills.metadata.total,
            }
          : undefined
      "
      @paginate="(p: number) => ((billPage = p), loadBills())"
    >
      <template #vendor="row">
        <span class="font-medium">{{ row.vendor?.name }}</span>
        <span v-if="row.number" class="block text-xs text-neutral-500">{{ row.number }}</span>
      </template>
      <template #description="row">
        <button
          type="button"
          class="max-w-xs truncate text-left hover:underline"
          @click="((billId = row.id), (billDetailOpen = true))"
        >
          {{ row.description }}
        </button>
      </template>
      <template #issuedOn="{ issuedOn }"
        ><span class="whitespace-nowrap">{{ formatDate(issuedOn) }}</span></template
      >
      <template #dueOn="{ dueOn }"
        ><span class="whitespace-nowrap">{{ formatDate(dueOn) }}</span></template
      >
      <template #netAmount="{ netAmount }"
        ><span class="tabular-nums">{{ formatMoney(netAmount) }}</span></template
      >
      <template #balance="{ balance }"
        ><span class="font-semibold tabular-nums">{{ formatAmount(balance) }}</span></template
      >
      <template #status="row">
        <StatusBadge
          kind="bill"
          :status="row.status"
          :overdue="['pending', 'partially_paid'].includes(row.status) && row.dueOn < today"
        />
      </template>
      <template #empty>
        <EmptyState
          title="No hay facturas aquí"
          description="Registra las facturas de vigilancia, aseo, servicios públicos y demás gastos para controlar lo que se debe y pagarlo a tiempo."
        />
      </template>
    </UiTable>
  </template>

  <UiTable
    v-else-if="tab === 'payments'"
    :columns="paymentColumns"
    :rows="payments?.data ?? []"
    :loading="!payments"
    :pagination="
      payments
        ? {
            page: payments.metadata.currentPage,
            perPage: payments.metadata.perPage,
            total: payments.metadata.total,
          }
        : undefined
    "
    @paginate="(p: number) => ((paymentPage = p), loadPayments())"
  >
    <template #number="row">
      <button
        type="button"
        class="font-semibold hover:underline"
        @click="((paymentId = row.id), (paymentDetailOpen = true))"
      >
        CE-{{ row.number }}
      </button>
    </template>
    <template #vendor="row">{{ row.vendor?.name }}</template>
    <template #paidOn="row">
      <span class="whitespace-nowrap">{{ formatDate(row.paidOn) }}</span>
      <span class="block text-xs text-neutral-500">{{
        PAYMENT_METHOD_LABELS[row.method as keyof typeof PAYMENT_METHOD_LABELS]
      }}</span>
    </template>
    <template #cashAccount="row">{{ row.cashAccount?.name }}</template>
    <template #amount="{ amount }"
      ><span class="font-semibold tabular-nums">{{ formatMoney(amount) }}</span></template
    >
    <template #status="row"><StatusBadge kind="vendorPayment" :status="row.status" /></template>
    <template #empty><EmptyState title="Aún no hay egresos" /></template>
  </UiTable>

  <template v-else-if="tab === 'vendors'">
    <div class="mb-4 flex flex-wrap justify-between gap-3">
      <UiInput
        v-model="vendorSearch"
        type="search"
        placeholder="Nombre o NIT"
        aria-label="Buscar proveedor"
        class="w-full sm:w-72"
      />
      <UiButton
        v-if="tenant.canManageFinance"
        size="sm"
        color="primary"
        @click="((editingVendor = null), (vendorFormOpen = true))"
      >
        <span class="mr-1"><i class="mdi mdi-plus" aria-hidden="true" /></span>Nuevo proveedor
      </UiButton>
    </div>
    <UiTable :columns="vendorColumns" :rows="filteredVendors">
      <template #name="row">
        <span class="font-medium" :class="row.isActive ? '' : 'text-neutral-400 line-through'">{{
          row.name
        }}</span>
        <span v-if="row.documentNumber" class="block text-xs text-neutral-500"
          >{{ row.documentType }} {{ row.documentNumber }}</span
        >
      </template>
      <template #contact="row">
        <span class="block">{{ row.contactName ?? '—' }}</span>
        <span class="block text-xs text-neutral-500">{{
          [row.phone, row.email].filter(Boolean).join(' · ')
        }}</span>
      </template>
      <template #defaultAccount="row">
        <span v-if="row.defaultAccount" class="text-xs"
          >{{ row.defaultAccount.code }} · {{ row.defaultAccount.name }}</span
        >
      </template>
      <template #balance="{ balance }"
        ><span class="font-semibold tabular-nums">{{ formatAmount(balance) }}</span></template
      >
      <template #actions="row">
        <div class="flex justify-end gap-1">
          <UiButton v-if="Number(row.balance) > 0" size="sm" variant="outline" @click="pay(row.id)"
            >Pagar</UiButton
          >
          <UiButton
            size="sm"
            variant="ghost"
            @click="((editingVendor = row as Vendor), (vendorFormOpen = true))"
            >Editar</UiButton
          >
        </div>
      </template>
      <template #empty
        ><EmptyState
          title="Sin proveedores"
          description="Agrega la empresa de vigilancia, aseo, mantenimiento de ascensores y demás."
      /></template>
    </UiTable>
  </template>

  <UiTable v-else :columns="agingColumns" :rows="aging?.rows ?? []" :loading="!aging">
    <template #name="row">
      <span class="font-medium">{{ row.name }}</span>
      <span v-if="row.documentNumber" class="block text-xs text-neutral-500">{{
        row.documentNumber
      }}</span>
    </template>
    <template #current="{ current }"
      ><span class="tabular-nums">{{ formatAmount(current) }}</span></template
    >
    <template #d30="{ d30 }"
      ><span class="tabular-nums">{{ formatAmount(d30) }}</span></template
    >
    <template #d60="{ d60 }"
      ><span class="tabular-nums">{{ formatAmount(d60) }}</span></template
    >
    <template #over60="{ over60 }"
      ><span class="tabular-nums text-coral-700 dark:text-coral-300">{{
        formatAmount(over60)
      }}</span></template
    >
    <template #total="{ total }"
      ><span class="font-semibold tabular-nums">{{ formatMoney(total) }}</span></template
    >
    <template #empty><EmptyState title="No se le debe a ningún proveedor" /></template>
  </UiTable>
  <p v-if="tab === 'aging' && aging" class="mt-3 text-right text-sm font-semibold">
    Total por pagar {{ formatMoney(aging.totals.total) }}
  </p>

  <BillFormModal
    v-model="billFormOpen"
    :vendors="vendors"
    @saved="refresh"
    @vendor-created="loadVendors"
  />
  <BillDetailModal
    v-model="billDetailOpen"
    :bill-id="billId"
    @changed="refresh"
    @pay="(bill) => pay(null, bill)"
  />
  <VendorFormModal v-model="vendorFormOpen" :vendor="editingVendor" @saved="loadVendors" />
  <VendorPaymentModal
    v-model="payOpen"
    :vendors="vendors"
    :vendor-id="payVendorId"
    :bill-id="payBillId"
    @saved="refresh"
  />
  <VendorPaymentDetailModal
    v-model="paymentDetailOpen"
    :payment-id="paymentId"
    @changed="refresh"
  />
</template>
