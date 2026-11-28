<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import {
  UiAlert,
  UiBadge,
  UiButton,
  UiCard,
  UiDropdown,
  UiDropdownItem,
  UiSkeleton,
  UiTabs,
  useToast,
} from '@aptoph/ui'
import {
  CHARGE_STATUS_LABELS,
  OCCUPANT_RELATIONSHIP_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  PET_SPECIES_LABELS,
  UNIT_STATUS_LABELS,
  UNIT_TYPE_LABELS,
  VEHICLE_TYPE_LABELS,
  PARKING_OWNERSHIP_LABELS,
  VEHICLE_OWNER_RELATIONSHIP_LABELS,
  VISIT_TYPE_LABELS,
  type ResidentVisit,
  type VisitStatus,
  type HouseholdMember,
  type ResidentPayment,
  type ResidentPet,
  type ResidentUnitDetail,
  type UnitStatement,
  type ResidentVehicle,
} from '@aptoph/shared'
import BalanceBadge from '@/components/BalanceBadge.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import EmptyState from '@/components/EmptyState.vue'
import HouseholdMemberModal from '@/components/HouseholdMemberModal.vue'
import PageHeader from '@/components/PageHeader.vue'
import PetFormModal from '@/components/PetFormModal.vue'
import ReportPaymentModal from '@/components/ReportPaymentModal.vue'
import PaymentReceipts from '@/components/payments/PaymentReceipts.vue'
import ClearanceCard from '@/components/payments/ClearanceCard.vue'
import VehicleFormModal from '@/components/VehicleFormModal.vue'
import VisitFormModal from '@/components/VisitFormModal.vue'
import { residentApi } from '@/api/resident'
import { useSubmit } from '@/composables/useSubmit'
import { ApiError } from '@/lib/http'
import { errorMessage } from '@/lib/errors'
import {
  formatArea,
  formatCoefficient,
  formatDate,
  formatDateTime,
  formatMoney,
  formatPeriod,
  isZero,
} from '@/lib/format'
import { useTenantStore } from '@/stores/tenant'

const route = useRoute()
const router = useRouter()
const tenant = useTenantStore()
const toast = useToast()
const unit = ref<ResidentUnitDetail | null>(null)
const error = ref<string | null>(null)
const notFound = ref(false)

const currency = computed(() => tenant.current?.currency ?? 'COP')
const money = (amount: string) => formatMoney(amount, currency.value)

const vehicleIcons: Record<string, string> = {
  car: 'mdi mdi-car-outline',
  motorcycle: 'mdi mdi-motorbike',
  bicycle: 'mdi mdi-bicycle',
  other: 'mdi mdi-car-side',
}
/** Today in the conjunto, to flag expired SOAT and inspection */
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
const expired = (date: string | null) => !!date && date < today
const shortDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

const petIcons: Record<string, string> = {
  dog: 'mdi mdi-dog',
  cat: 'mdi mdi-cat',
  other: 'mdi mdi-paw',
}

async function load() {
  error.value = null
  notFound.value = false
  try {
    const { data } = await residentApi.unit(String(route.params.id))
    unit.value = data
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound.value = true
    else error.value = errorMessage(e, 'No pudimos cargar la unidad')
  }
}

/**
 * Sections of the unit, one at a time (?seccion=… keeps it on reload and
 * lets other pages link straight to one).
 */
const SECTIONS = ['pagos', 'hogar', 'vehiculos', 'mascotas', 'visitas', 'datos'] as const
type Section = (typeof SECTIONS)[number]
const sectionOf = (value: unknown): Section =>
  SECTIONS.includes(value as Section) ? (value as Section) : 'pagos'
const section = ref<Section>(sectionOf(route.query.seccion))
watch(section, (value) => {
  void router.replace({ query: { ...route.query, seccion: value === 'pagos' ? undefined : value } })
  if (value === 'visitas' && !visits.value) void loadVisits()
})
watch(
  () => route.query.seccion,
  (value) => (section.value = sectionOf(value)),
)
const sections = computed(() => {
  const u = unit.value
  const count = (n: number | undefined) => n || undefined
  return [
    {
      label: 'Pagos',
      value: 'pagos',
      icon: 'mdi mdi-cash-multiple',
      badge: count(u?.openCharges.length),
    },
    {
      label: 'Hogar',
      value: 'hogar',
      icon: 'mdi mdi-account-group-outline',
      badge: count(u?.household.length),
    },
    {
      label: 'Vehículos',
      value: 'vehiculos',
      icon: 'mdi mdi-car-outline',
      badge: count(u?.vehicles.length),
    },
    { label: 'Mascotas', value: 'mascotas', icon: 'mdi mdi-paw', badge: count(u?.pets.length) },
    {
      label: 'Visitas',
      value: 'visitas',
      icon: 'mdi mdi-account-clock-outline',
      badge: count(upcomingVisits.value.length),
    },
    { label: 'Datos', value: 'datos', icon: 'mdi mdi-information-outline' },
  ]
})

// Visits of this unit (the gate page has the ones of every unit)
const visits = ref<ResidentVisit[] | null>(null)
const visitModal = ref(false)
const VISIT_STATUS: Record<
  VisitStatus,
  { label: string; color: 'primary' | 'success' | 'neutral' | 'warning' }
> = {
  expected: { label: 'Autorizada', color: 'primary' },
  inside: { label: 'En el conjunto', color: 'success' },
  completed: { label: 'Finalizada', color: 'neutral' },
  expired: { label: 'No llegó', color: 'warning' },
}
const upcomingVisits = computed(() =>
  (visits.value ?? []).filter((v) => v.status === 'expected' || v.status === 'inside'),
)
const pastVisits = computed(() =>
  (visits.value ?? [])
    .filter((v) => v.status === 'completed' || v.status === 'expired')
    .slice(0, 10),
)
async function loadVisits() {
  try {
    const { data } = await residentApi.visits.list()
    visits.value = data.filter((visit) => visit.unit.id === String(route.params.id))
  } catch {
    visits.value = []
  }
}

// Finance: statement (with the early payment discount) and the unit's payments
const statement = ref<UnitStatement | null>(null)
const payments = ref<ResidentPayment[]>([])
const reportOpen = ref(false)
const showMovements = ref(false)

async function loadFinance() {
  const unitId = String(route.params.id)
  const yearAgo = new Date()
  yearAgo.setFullYear(yearAgo.getFullYear() - 1)
  try {
    const [account, list] = await Promise.all([
      residentApi.finance.statement(unitId, { from: yearAgo.toISOString().slice(0, 10) }),
      residentApi.finance.payments(),
    ])
    statement.value = account.data
    payments.value = list.data.filter((payment) => payment.unit?.id === unitId).slice(0, 10)
  } catch {
    // The rest of the page works without it
  }
}

const clearance = ref<InstanceType<typeof ClearanceCard> | null>(null)
const downloadingReceipt = ref<string | null>(null)
async function downloadReceipt(payment: ResidentPayment) {
  downloadingReceipt.value = payment.id
  try {
    await residentApi.finance.downloadReceipt(payment)
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    downloadingReceipt.value = null
  }
}

async function afterReport() {
  await Promise.all([load(), loadFinance(), clearance.value?.load()])
}

/** Reported payments the administration has not reviewed yet */
const pendingReview = computed(() =>
  payments.value
    .filter((payment) => payment.status === 'pending_review')
    .reduce((sum, payment) => sum + Number(payment.amount), 0),
)

const paymentColor = (status: ResidentPayment['status']) =>
  status === 'confirmed'
    ? 'success'
    : status === 'pending_review'
      ? 'warning'
      : status === 'rejected'
        ? 'danger'
        : 'neutral'

onMounted(() => {
  load()
  loadFinance()
  loadVisits()
})

// Editing: one modal per kind, plus a shared delete confirmation
const vehicleModal = ref(false)
const editingVehicle = ref<ResidentVehicle | null>(null)
const petModal = ref(false)
const editingPet = ref<ResidentPet | null>(null)
const memberModal = ref(false)
const editingMember = ref<HouseholdMember | null>(null)

function editVehicle(vehicle: ResidentVehicle | null) {
  editingVehicle.value = vehicle
  vehicleModal.value = true
}
function editPet(pet: ResidentPet | null) {
  editingPet.value = pet
  petModal.value = true
}
function editMember(member: HouseholdMember | null) {
  editingMember.value = member
  memberModal.value = true
}

type Removal = {
  title: string
  message: string
  confirmLabel: string
  success: string
  action: () => Promise<unknown>
}
const removal = ref<Removal | null>(null)
const removalOpen = ref(false)
const { saving: removing, run } = useSubmit()

function askRemove(value: Removal) {
  removal.value = value
  removalOpen.value = true
}
async function confirmRemove() {
  if (!removal.value) return
  const { action, success } = removal.value
  if (await run(action, success)) {
    removalOpen.value = false
    await load()
  }
}

const removeVehicle = (vehicle: ResidentVehicle) =>
  askRemove({
    title: 'Eliminar vehículo',
    message: `¿Eliminar el vehículo ${vehicle.plate} de la unidad?`,
    confirmLabel: 'Eliminar',
    success: 'Vehículo eliminado',
    action: () => residentApi.vehicles.remove(vehicle.id),
  })
const removePet = (pet: ResidentPet) =>
  askRemove({
    title: 'Eliminar mascota',
    message: `¿Eliminar a ${pet.name} del registro de mascotas?`,
    confirmLabel: 'Eliminar',
    success: 'Mascota eliminada',
    action: () => residentApi.pets.remove(pet.id),
  })
const removeMember = (member: HouseholdMember) =>
  askRemove({
    title: 'Retirar del hogar',
    message: `¿${member.fullName} ya no vive o trabaja en la unidad? Dejará de aparecer en el hogar.`,
    confirmLabel: 'Retirar',
    success: 'Persona retirada del hogar',
    action: () => residentApi.household.remove(member.id),
  })
</script>

<template>
  <RouterLink
    to="/"
    class="mb-2 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-mint-700 hover:underline dark:text-neutral-300 dark:hover:text-mint-300"
  >
    <span aria-hidden="true"><i class="mdi mdi-arrow-left" /></span> Inicio
  </RouterLink>

  <UiCard v-if="notFound">
    <div class="flex flex-col items-center gap-2 py-6 text-center">
      <span class="text-4xl text-neutral-300" aria-hidden="true"
        ><i class="mdi mdi-door-closed-lock"
      /></span>
      <p class="font-medium">Esta unidad no está asociada a tu cuenta</p>
      <UiButton class="mt-2" color="primary" to="/">Ver mis unidades</UiButton>
    </div>
  </UiCard>

  <div v-else-if="error" class="flex flex-col items-start gap-4">
    <UiAlert color="danger" variant="soft" class="w-full">{{ error }}</UiAlert>
    <UiButton variant="outline" @click="load">Reintentar</UiButton>
  </div>

  <template v-else-if="unit">
    <PageHeader
      :title="`${UNIT_TYPE_LABELS[unit.type]} ${unit.code}`"
      :subtitle="
        [unit.building?.name, OCCUPANT_RELATIONSHIP_LABELS[unit.relationship]]
          .filter(Boolean)
          .join(' · ')
      "
    >
      <template #actions>
        <BalanceBadge :balance="unit.balance" />
      </template>
    </PageHeader>

    <div
      class="sticky top-16 z-20 -mx-4 mb-6 bg-neutral-50/95 px-4 pt-1 backdrop-blur-md sm:-mx-6 sm:px-6 dark:bg-neutral-950/90"
    >
      <UiTabs v-model="section" :tabs="sections" aria-label="Secciones de la unidad" />
    </div>

    <!-- Pagos: estado de cuenta, cobros, pagos y movimientos -->
    <section v-if="section === 'pagos'" aria-labelledby="account-title">
      <h2 id="account-title" class="mb-3 text-lg font-semibold">Estado de cuenta</h2>
      <div class="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <div class="col-span-2 rounded-2xl bg-neutral-900 p-4 text-white sm:col-span-1 sm:p-5">
          <p class="text-xs tracking-wide text-neutral-200 uppercase">Saldo pendiente</p>
          <p class="font-display text-2xl font-semibold tabular-nums">
            {{ money(unit.balance.pending) }}
          </p>
        </div>
        <div
          class="rounded-2xl border p-4 sm:p-5"
          :class="
            isZero(unit.balance.overdue)
              ? 'border-neutral-100 bg-white dark:border-white/10 dark:bg-neutral-900'
              : 'border-red-200 bg-red-50 dark:border-red-400/30 dark:bg-red-500/10'
          "
        >
          <p class="text-xs tracking-wide text-neutral-500 uppercase dark:text-neutral-300">
            Vencido
          </p>
          <p
            class="font-display text-2xl font-semibold tabular-nums"
            :class="{ 'text-red-700 dark:text-red-300': !isZero(unit.balance.overdue) }"
          >
            {{ money(unit.balance.overdue) }}
          </p>
        </div>
        <div
          class="rounded-2xl border border-neutral-100 bg-white p-4 sm:p-5 dark:border-white/10 dark:bg-neutral-900"
        >
          <p class="text-xs tracking-wide text-neutral-500 uppercase dark:text-neutral-300">
            Cobros abiertos
          </p>
          <p class="font-display text-2xl font-semibold tabular-nums">
            {{ unit.balance.openCharges }}
          </p>
        </div>
      </div>

      <EmptyState
        v-if="unit.openCharges.length === 0"
        class="rounded-2xl border border-neutral-100 bg-white dark:border-white/10 dark:bg-neutral-900"
        art="al-dia"
        title="Estás al día"
        description="No tienes cobros pendientes en esta unidad."
      />

      <ul
        v-else
        class="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-100 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-neutral-900"
      >
        <li
          v-for="charge in unit.openCharges"
          :key="charge.id"
          class="flex flex-wrap items-center justify-between gap-3 p-4"
        >
          <div class="min-w-0">
            <p class="font-medium">{{ charge.concept }} · {{ formatPeriod(charge.period) }}</p>
            <p v-if="charge.description" class="text-sm text-neutral-500 dark:text-neutral-300">
              {{ charge.description }}
            </p>
            <p
              class="mt-1 text-xs"
              :class="
                charge.isOverdue
                  ? 'font-medium text-red-700 dark:text-red-300'
                  : 'text-neutral-500 dark:text-neutral-300'
              "
            >
              {{ charge.isOverdue ? 'Venció el' : 'Vence el' }} {{ formatDate(charge.dueOn) }}
            </p>
          </div>
          <div class="text-right">
            <p class="font-semibold tabular-nums">{{ money(charge.balance) }}</p>
            <p
              v-if="charge.balance !== charge.amount"
              class="text-xs text-neutral-500 tabular-nums dark:text-neutral-300"
            >
              de {{ money(charge.amount) }}
            </p>
            <UiBadge
              class="mt-1"
              :label="charge.isOverdue ? 'Vencido' : CHARGE_STATUS_LABELS[charge.status]"
              :color="
                charge.isOverdue
                  ? 'danger'
                  : charge.status === 'partially_paid'
                    ? 'primary'
                    : 'warning'
              "
              variant="soft"
              size="xs"
            />
          </div>
        </li>
      </ul>

      <div
        class="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-100 bg-white p-4 dark:border-white/10 dark:bg-neutral-900"
      >
        <div class="text-sm">
          <template v-if="statement && !isZero(statement.toPay)">
            <p>
              Para quedar al día hoy:
              <strong class="tabular-nums">{{ money(statement.toPay) }}</strong>
            </p>
            <p v-if="!isZero(statement.availableDiscount)" class="text-mint-700 dark:text-mint-300">
              Incluye {{ money(statement.availableDiscount) }} de descuento por pronto pago
            </p>
          </template>
          <p v-else-if="statement && !isZero(statement.credit)">
            Tienes <strong class="tabular-nums">{{ money(statement.credit) }}</strong> a favor: se
            aplicarán a tus próximos cobros.
          </p>
          <p v-else class="text-neutral-500 dark:text-neutral-300">
            ¿Ya pagaste? Repórtalo y la administración lo aplicará.
          </p>
          <p v-if="pendingReview > 0" class="mt-1 text-amber-700 dark:text-amber-300">
            Tienes {{ money(String(pendingReview)) }} reportados por confirmar.
          </p>
        </div>
        <UiButton color="primary" @click="reportOpen = true">
          <span class="mr-1"><i class="mdi mdi-cash-check" aria-hidden="true" /></span>Reportar un
          pago
        </UiButton>
      </div>

      <ClearanceCard ref="clearance" :unit-id="String(route.params.id)" :currency="currency" />

      <div v-if="payments.length" class="mt-6">
        <h3 class="mb-2 font-semibold">Tus pagos</h3>
        <ul
          class="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-100 bg-white text-sm dark:divide-white/10 dark:border-white/10 dark:bg-neutral-900"
        >
          <li
            v-for="payment in payments"
            :key="payment.id"
            class="flex flex-wrap items-center justify-between gap-3 p-4"
          >
            <div class="min-w-0">
              <p class="font-medium">
                {{ payment.number ? `Recibo de caja ${payment.number}` : 'Pago reportado' }}
                · {{ PAYMENT_METHOD_LABELS[payment.method] }}
              </p>
              <p class="text-xs text-neutral-500 dark:text-neutral-300">
                {{ formatDateTime(payment.paidAt) }}
                <template v-if="payment.reference"> · {{ payment.reference }}</template>
              </p>
              <p v-if="payment.rejectionReason" class="mt-1 text-xs text-red-700 dark:text-red-300">
                {{ payment.rejectionReason }}
              </p>
              <PaymentReceipts :payment="payment" />
            </div>
            <div class="text-right">
              <p class="font-semibold tabular-nums">{{ money(payment.amount) }}</p>
              <UiBadge
                class="mt-1"
                :label="PAYMENT_STATUS_LABELS[payment.status]"
                :color="paymentColor(payment.status)"
                variant="soft"
                size="xs"
              />
              <button
                v-if="payment.number !== null"
                type="button"
                class="mt-1 block text-xs font-semibold text-brand-700 hover:underline disabled:opacity-60 dark:text-brand-200"
                :disabled="downloadingReceipt === payment.id"
                @click="downloadReceipt(payment)"
              >
                <i class="mdi mdi-file-pdf-box" aria-hidden="true" /> Recibo PDF
              </button>
            </div>
          </li>
        </ul>
      </div>

      <div v-if="statement?.rows.length" class="mt-6">
        <button
          type="button"
          class="flex items-center gap-1 text-sm font-semibold text-mint-700 dark:text-mint-300"
          :aria-expanded="showMovements"
          @click="showMovements = !showMovements"
        >
          <i
            :class="showMovements ? 'mdi mdi-chevron-up' : 'mdi mdi-chevron-down'"
            aria-hidden="true"
          />
          {{ showMovements ? 'Ocultar movimientos' : 'Ver movimientos del último año' }}
        </button>
        <div
          v-if="showMovements"
          class="mt-2 overflow-x-auto rounded-2xl border border-neutral-100 bg-white dark:border-white/10 dark:bg-neutral-900"
        >
          <table class="w-full min-w-[32rem] text-sm">
            <thead class="text-left text-xs text-neutral-500 uppercase dark:text-neutral-300">
              <tr>
                <th class="px-4 py-2 font-medium">Fecha</th>
                <th class="px-4 py-2 font-medium">Movimiento</th>
                <th class="px-4 py-2 text-right font-medium">Cargo</th>
                <th class="px-4 py-2 text-right font-medium">Abono</th>
                <th class="px-4 py-2 text-right font-medium">Saldo</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-neutral-100 dark:divide-white/10">
              <tr v-for="row in [...statement.rows].reverse()" :key="row.entryId">
                <td class="px-4 py-2 whitespace-nowrap">{{ formatDate(row.date) }}</td>
                <td class="px-4 py-2">
                  {{ row.description }}
                  <span
                    v-if="row.details.length"
                    class="line-clamp-2 block text-xs text-neutral-500 dark:text-neutral-300"
                    :title="row.details.join(' · ')"
                    >{{ row.details.join(' · ') }}</span
                  >
                </td>
                <td class="px-4 py-2 text-right tabular-nums">
                  {{ isZero(row.charge) ? '' : money(row.charge) }}
                </td>
                <td class="px-4 py-2 text-right text-mint-700 tabular-nums dark:text-mint-300">
                  {{ isZero(row.payment) ? '' : money(row.payment) }}
                </td>
                <td class="px-4 py-2 text-right font-medium tabular-nums">
                  {{ money(row.balance) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <ReportPaymentModal
      v-model="reportOpen"
      :unit-id="unit.id"
      :suggested="statement?.toPay"
      @saved="afterReport"
    />

    <div>
      <!-- Hogar -->
      <section v-if="section === 'hogar'" aria-labelledby="household-title">
        <div class="mb-3 flex items-center justify-between gap-3">
          <h2 id="household-title" class="text-lg font-semibold">Quiénes viven aquí</h2>
          <UiButton
            v-if="unit.canManageHousehold"
            size="sm"
            variant="outline"
            @click="editMember(null)"
          >
            <span class="mr-1" aria-hidden="true"><i class="mdi mdi-account-plus-outline" /></span
            >Agregar
          </UiButton>
        </div>
        <ul
          class="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-100 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-neutral-900"
        >
          <li v-for="person in unit.household" :key="person.id" class="flex items-start gap-3 p-4">
            <span
              class="grid size-9 shrink-0 place-items-center rounded-full bg-neutral-100 text-sm font-semibold text-neutral-700 dark:bg-white/10 dark:text-neutral-100"
            >
              {{ person.fullName.charAt(0).toUpperCase() }}
            </span>
            <div class="min-w-0 flex-1">
              <p class="font-medium">
                {{ person.fullName }}
                <span
                  v-if="person.isMe"
                  class="text-sm font-normal text-neutral-500 dark:text-neutral-300"
                  >(tú)</span
                >
              </p>
              <p class="text-sm text-neutral-500 dark:text-neutral-300">
                {{ OCCUPANT_RELATIONSHIP_LABELS[person.relationship] }}
                <template v-if="person.phone"> · {{ person.phone }}</template>
              </p>
              <span
                v-if="person.isPrimaryContact || person.isBillingResponsible"
                class="mt-1 flex flex-wrap gap-1"
              >
                <UiBadge
                  v-if="person.isPrimaryContact"
                  label="Contacto principal"
                  size="xs"
                  color="primary"
                  variant="soft"
                />
                <UiBadge
                  v-if="person.isBillingResponsible"
                  label="Responsable de pagos"
                  size="xs"
                  color="secondary"
                  variant="soft"
                />
              </span>
            </div>
            <div v-if="person.editable" class="flex shrink-0 gap-1">
              <UiButton
                variant="ghost"
                size="sm"
                :aria-label="`Editar a ${person.fullName}`"
                @click="editMember(person)"
              >
                <span aria-hidden="true"><i class="mdi mdi-pencil-outline" /></span>
              </UiButton>
              <UiButton
                variant="ghost"
                size="sm"
                color="danger"
                :aria-label="`Retirar a ${person.fullName}`"
                @click="removeMember(person)"
              >
                <span aria-hidden="true"><i class="mdi mdi-account-remove-outline" /></span>
              </UiButton>
            </div>
          </li>
        </ul>
      </section>

      <!-- Vehículos -->
      <section v-if="section === 'vehiculos'" aria-labelledby="vehicles-title">
        <div class="mb-3 flex items-center justify-between gap-3">
          <h2 id="vehicles-title" class="text-lg font-semibold">Vehículos</h2>
          <UiButton size="sm" variant="outline" @click="editVehicle(null)">
            <span class="mr-1" aria-hidden="true"><i class="mdi mdi-plus" /></span>Registrar
          </UiButton>
        </div>
        <p
          v-if="unit.vehicles.length === 0"
          class="rounded-2xl border border-dashed border-neutral-200 p-4 text-sm text-neutral-500 dark:border-white/10 dark:text-neutral-300"
        >
          No hay vehículos registrados. Regístralos para que portería los reconozca.
        </p>
        <ul v-else class="grid gap-3 sm:grid-cols-2">
          <li
            v-for="vehicle in unit.vehicles"
            :key="vehicle.id"
            class="flex items-center gap-3 rounded-2xl border border-neutral-100 bg-white p-4 dark:border-white/10 dark:bg-neutral-900"
          >
            <span class="text-2xl text-mint-700 dark:text-mint-300" aria-hidden="true"
              ><i :class="vehicleIcons[vehicle.type]"
            /></span>
            <div class="min-w-0 flex-1">
              <p class="font-mono font-semibold tracking-wider">{{ vehicle.plate }}</p>
              <p class="truncate text-sm text-neutral-500 dark:text-neutral-300">
                {{
                  [VEHICLE_TYPE_LABELS[vehicle.type], vehicle.brand, vehicle.model, vehicle.color]
                    .filter(Boolean)
                    .join(' · ')
                }}
              </p>
              <p
                v-if="vehicle.ownerType === 'third_party'"
                class="truncate text-xs text-neutral-500 dark:text-neutral-300"
              >
                A nombre de {{ vehicle.ownerName
                }}<template v-if="vehicle.ownerRelationship">
                  ({{
                    VEHICLE_OWNER_RELATIONSHIP_LABELS[vehicle.ownerRelationship].toLowerCase()
                  }})</template
                >
              </p>
              <p
                v-if="vehicle.soatExpiresOn || vehicle.inspectionExpiresOn"
                class="flex flex-wrap gap-x-3 text-xs"
              >
                <span
                  v-if="vehicle.soatExpiresOn"
                  :class="
                    expired(vehicle.soatExpiresOn)
                      ? 'font-medium text-coral-700 dark:text-coral-300'
                      : 'text-neutral-500 dark:text-neutral-300'
                  "
                  >SOAT {{ expired(vehicle.soatExpiresOn) ? 'venció' : 'hasta' }}
                  {{ shortDate(vehicle.soatExpiresOn) }}</span
                >
                <span
                  v-if="vehicle.inspectionExpiresOn"
                  :class="
                    expired(vehicle.inspectionExpiresOn)
                      ? 'font-medium text-coral-700 dark:text-coral-300'
                      : 'text-neutral-500 dark:text-neutral-300'
                  "
                  >Tecnomecánica {{ expired(vehicle.inspectionExpiresOn) ? 'venció' : 'hasta' }}
                  {{ shortDate(vehicle.inspectionExpiresOn) }}</span
                >
              </p>
            </div>
            <UiDropdown placement="bottom-end" :aria-label="`Acciones de ${vehicle.plate}`">
              <template #trigger>
                <span
                  class="grid size-8 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-50 dark:hover:bg-white/10"
                  ><i class="mdi mdi-dots-vertical"
                /></span>
              </template>
              <UiDropdownItem
                icon="mdi mdi-pencil-outline"
                label="Editar"
                @click="editVehicle(vehicle)"
              />
              <UiDropdownItem
                icon="mdi mdi-trash-can-outline"
                label="Eliminar"
                danger
                @click="removeVehicle(vehicle)"
              />
            </UiDropdown>
          </li>
        </ul>
      </section>

      <!-- Parqueaderos -->
      <section v-if="section === 'vehiculos'" aria-labelledby="parking-title" class="mt-8">
        <div class="mb-3 flex items-center justify-between gap-3">
          <h2 id="parking-title" class="text-lg font-semibold">Parqueaderos</h2>
          <RouterLink
            :to="{ name: 'parking' }"
            class="text-sm font-medium text-brand-700 hover:underline dark:text-brand-200"
            >Sorteo de cupos</RouterLink
          >
        </div>
        <p v-if="!unit.parkingSpots.length" class="text-sm text-neutral-500 dark:text-neutral-300">
          La unidad no tiene parqueadero propio ni asignado.
        </p>
        <ul v-else class="grid gap-3 sm:grid-cols-2">
          <li
            v-for="spot in unit.parkingSpots"
            :key="spot.id"
            class="flex items-center gap-3 rounded-2xl border border-neutral-100 bg-white p-4 dark:border-white/10 dark:bg-neutral-900"
          >
            <span
              class="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 font-bold text-brand-700 dark:bg-brand-400/15 dark:text-brand-200"
              aria-hidden="true"
              ><i class="mdi mdi-parking text-xl"
            /></span>
            <div class="min-w-0 flex-1">
              <p class="font-mono font-semibold">{{ spot.code }}</p>
              <p class="truncate text-sm text-neutral-500 dark:text-neutral-300">
                {{
                  [
                    PARKING_OWNERSHIP_LABELS[spot.ownership],
                    VEHICLE_TYPE_LABELS[spot.vehicleType],
                    spot.location,
                    spot.isCovered ? 'Cubierto' : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')
                }}
              </p>
              <p
                v-if="spot.ownership === 'communal'"
                class="text-xs text-neutral-500 dark:text-neutral-300"
              >
                <template v-if="spot.endsOn"
                  >Asignado hasta el {{ shortDate(spot.endsOn) }}</template
                ><template v-else>Asignado</template
                ><template v-if="spot.vehiclePlate"> · {{ spot.vehiclePlate }}</template
                ><template v-if="spot.monthlyRate">
                  · {{ money(String(spot.monthlyRate)) }} al mes</template
                >
              </p>
            </div>
          </li>
        </ul>
      </section>

      <!-- Mascotas -->
      <section v-if="section === 'mascotas'" aria-labelledby="pets-title">
        <div class="mb-3 flex items-center justify-between gap-3">
          <h2 id="pets-title" class="text-lg font-semibold">Mascotas</h2>
          <UiButton size="sm" variant="outline" @click="editPet(null)">
            <span class="mr-1" aria-hidden="true"><i class="mdi mdi-plus" /></span>Registrar
          </UiButton>
        </div>
        <p
          v-if="unit.pets.length === 0"
          class="rounded-2xl border border-dashed border-neutral-200 p-4 text-sm text-neutral-500 dark:border-white/10 dark:text-neutral-300"
        >
          No hay mascotas registradas.
        </p>
        <ul v-else class="grid gap-3 sm:grid-cols-2">
          <li
            v-for="pet in unit.pets"
            :key="pet.id"
            class="flex items-center gap-3 rounded-2xl border border-neutral-100 bg-white p-4 dark:border-white/10 dark:bg-neutral-900"
          >
            <span class="text-2xl text-mint-700 dark:text-mint-300" aria-hidden="true"
              ><i :class="petIcons[pet.species]"
            /></span>
            <div class="min-w-0 flex-1">
              <p class="font-medium">{{ pet.name }}</p>
              <p class="truncate text-sm text-neutral-500 dark:text-neutral-300">
                {{ [PET_SPECIES_LABELS[pet.species], pet.breed].filter(Boolean).join(' · ') }}
              </p>
              <UiBadge
                v-if="pet.isPotentiallyDangerous"
                class="mt-1"
                label="Potencialmente peligrosa"
                size="xs"
                color="warning"
                variant="soft"
              />
            </div>
            <UiDropdown placement="bottom-end" :aria-label="`Acciones de ${pet.name}`">
              <template #trigger>
                <span
                  class="grid size-8 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-50 dark:hover:bg-white/10"
                  ><i class="mdi mdi-dots-vertical"
                /></span>
              </template>
              <UiDropdownItem icon="mdi mdi-pencil-outline" label="Editar" @click="editPet(pet)" />
              <UiDropdownItem
                icon="mdi mdi-trash-can-outline"
                label="Eliminar"
                danger
                @click="removePet(pet)"
              />
            </UiDropdown>
          </li>
        </ul>
      </section>

      <!-- Visitas -->
      <section v-if="section === 'visitas'" aria-labelledby="visits-title">
        <div class="mb-3 flex items-center justify-between gap-3">
          <h2 id="visits-title" class="text-lg font-semibold">Visitas</h2>
          <UiButton size="sm" variant="outline" @click="visitModal = true">
            <span class="mr-1" aria-hidden="true"><i class="mdi mdi-plus" /></span>Autorizar
          </UiButton>
        </div>
        <div v-if="!visits" class="space-y-2">
          <UiSkeleton height="4rem" variant="rounded" />
          <UiSkeleton height="4rem" variant="rounded" />
        </div>
        <EmptyState
          v-else-if="visits.length === 0"
          art="sin-resultados"
          title="Sin visitas"
          description="Autoriza una visita y portería la verá con su código de acceso."
        />
        <template v-else>
          <ul
            v-if="upcomingVisits.length"
            class="divide-y divide-neutral-100 rounded-2xl border border-neutral-100 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-neutral-900"
          >
            <li v-for="visit in upcomingVisits" :key="visit.id" class="flex items-center gap-3 p-4">
              <div class="min-w-0 flex-1">
                <p class="truncate font-medium">{{ visit.visitorName }}</p>
                <p class="text-sm text-neutral-500 dark:text-neutral-300">
                  {{
                    [
                      VISIT_TYPE_LABELS[visit.type],
                      visit.checkedInAt
                        ? `Entró ${formatDateTime(visit.checkedInAt)}`
                        : visit.expectedAt
                          ? formatDateTime(visit.expectedAt)
                          : null,
                      visit.vehiclePlate,
                    ]
                      .filter(Boolean)
                      .join(' · ')
                  }}
                </p>
              </div>
              <span
                v-if="visit.accessCode"
                class="rounded-lg bg-neutral-100 px-2 py-1 font-mono text-sm font-semibold tracking-wider dark:bg-white/10"
                >{{ visit.accessCode }}</span
              >
              <UiBadge
                :label="VISIT_STATUS[visit.status].label"
                :color="VISIT_STATUS[visit.status].color"
                variant="soft"
                size="sm"
              />
            </li>
          </ul>
          <p v-else class="text-sm text-neutral-500 dark:text-neutral-300">
            No hay visitas autorizadas en este momento.
          </p>
          <template v-if="pastVisits.length">
            <h3 class="mt-6 mb-2 text-sm font-semibold text-neutral-500 dark:text-neutral-300">
              Recientes
            </h3>
            <ul
              class="divide-y divide-neutral-100 rounded-2xl border border-neutral-100 bg-white text-sm dark:divide-white/10 dark:border-white/10 dark:bg-neutral-900"
            >
              <li
                v-for="visit in pastVisits"
                :key="visit.id"
                class="flex items-center justify-between gap-3 px-4 py-3"
              >
                <span class="truncate">{{ visit.visitorName }}</span>
                <span class="shrink-0 text-neutral-500 dark:text-neutral-300">{{
                  visit.checkedInAt
                    ? formatDateTime(visit.checkedInAt)
                    : VISIT_STATUS[visit.status].label
                }}</span>
              </li>
            </ul>
          </template>
        </template>
        <RouterLink
          :to="{ name: 'visits' }"
          class="mt-4 inline-block text-sm font-medium text-mint-700 hover:underline dark:text-mint-300"
          >Ver portería y paquetes</RouterLink
        >
      </section>

      <!-- Datos -->
      <section v-if="section === 'datos'" aria-labelledby="data-title">
        <h2 id="data-title" class="mb-3 text-lg font-semibold">Datos de la unidad</h2>
        <UiCard>
          <dl class="grid grid-cols-2 gap-4 text-sm lg:grid-cols-4">
            <div>
              <dt class="text-neutral-500 dark:text-neutral-300">Estado</dt>
              <dd class="mt-1 font-medium">{{ UNIT_STATUS_LABELS[unit.status] }}</dd>
            </div>
            <div>
              <dt class="text-neutral-500 dark:text-neutral-300">Piso</dt>
              <dd class="mt-1 font-medium">{{ unit.floor ?? '—' }}</dd>
            </div>
            <div>
              <dt class="text-neutral-500 dark:text-neutral-300">Área privada</dt>
              <dd class="mt-1 font-medium tabular-nums">{{ formatArea(unit.privateArea) }}</dd>
            </div>
            <div>
              <dt class="text-neutral-500 dark:text-neutral-300">Coeficiente de copropiedad</dt>
              <dd class="mt-1 font-medium tabular-nums">
                {{ formatCoefficient(unit.ownershipCoefficient) }}
              </dd>
            </div>
          </dl>
        </UiCard>
        <p class="mt-4 text-sm text-neutral-500 dark:text-neutral-300">
          ¿Los datos de la unidad, el propietario o el estado de cuenta no son correctos?
          <RouterLink
            :to="{ name: 'tickets', query: { nueva: '1', unidad: unit.id } }"
            class="font-medium text-mint-700 underline dark:text-mint-300"
            >Radica una PQRS</RouterLink
          >
          y la administración los revisará.
        </p>
      </section>
    </div>

    <VehicleFormModal
      v-model="vehicleModal"
      :unit-id="unit.id"
      :vehicle="editingVehicle"
      :allow-third-party="unit.allowThirdPartyVehicles"
      @saved="load"
    />
    <VisitFormModal v-model="visitModal" :unit-id="unit.id" @saved="loadVisits" />
    <PetFormModal v-model="petModal" :unit-id="unit.id" :pet="editingPet" @saved="load" />
    <HouseholdMemberModal
      v-model="memberModal"
      :unit-id="unit.id"
      :member="editingMember"
      @saved="load"
    />
    <ConfirmDialog
      v-model="removalOpen"
      :title="removal?.title ?? ''"
      :message="removal?.message ?? ''"
      :confirm-label="removal?.confirmLabel"
      :loading="removing"
      @confirm="confirmRemove"
    />
  </template>

  <div v-else class="flex flex-col gap-4" aria-busy="true">
    <UiSkeleton width="14rem" height="2rem" />
    <UiSkeleton height="5rem" variant="rounded" />
    <UiSkeleton height="12rem" variant="rounded" />
  </div>
</template>
