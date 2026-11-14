<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { DuiAlert, DuiBadge, DuiButton, DuiCard, DuiSkeleton } from '@dronico/droni-kit'
import {
  CHARGE_STATUS_LABELS,
  OCCUPANT_RELATIONSHIP_LABELS,
  PET_SPECIES_LABELS,
  UNIT_STATUS_LABELS,
  UNIT_TYPE_LABELS,
  VEHICLE_TYPE_LABELS,
  type ApiItem,
  type ResidentUnitDetail,
} from '@apartadock/shared'
import BalanceBadge from '@/components/BalanceBadge.vue'
import PageHeader from '@/components/PageHeader.vue'
import { ApiError, api } from '@/lib/http'
import { errorMessage } from '@/lib/errors'
import {
  formatArea,
  formatCoefficient,
  formatDate,
  formatMoney,
  formatPeriod,
  isZero,
} from '@/lib/format'
import { useTenantStore } from '@/stores/tenant'

const route = useRoute()
const tenant = useTenantStore()
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
const petIcons: Record<string, string> = { dog: 'mdi mdi-dog', cat: 'mdi mdi-cat', other: 'mdi mdi-paw' }

async function load() {
  error.value = null
  notFound.value = false
  try {
    const { data } = await api<ApiItem<ResidentUnitDetail>>(
      `/api/v1/resident/units/${encodeURIComponent(String(route.params.id))}`,
    )
    unit.value = data
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound.value = true
    else error.value = errorMessage(e, 'No pudimos cargar la unidad')
  }
}

onMounted(load)
</script>

<template>
  <RouterLink
    to="/"
    class="mb-2 inline-flex items-center gap-1 text-sm text-navy-500 hover:text-teal-700 hover:underline dark:text-navy-300 dark:hover:text-teal-300"
  >
    <span aria-hidden="true"><i class="mdi mdi-arrow-left" /></span> Inicio
  </RouterLink>

  <DuiCard v-if="notFound">
    <div class="flex flex-col items-center gap-2 py-6 text-center">
      <span class="text-4xl text-navy-300" aria-hidden="true"><i class="mdi mdi-door-closed-lock" /></span>
      <p class="font-medium">Esta unidad no está asociada a tu cuenta</p>
      <DuiButton class="mt-2" color="primary" to="/">Ver mis unidades</DuiButton>
    </div>
  </DuiCard>

  <div v-else-if="error" class="flex flex-col items-start gap-4">
    <DuiAlert color="danger" variant="soft" class="w-full">{{ error }}</DuiAlert>
    <DuiButton variant="outline" @click="load">Reintentar</DuiButton>
  </div>

  <template v-else-if="unit">
    <PageHeader
      :title="`${UNIT_TYPE_LABELS[unit.type]} ${unit.code}`"
      :subtitle="[unit.building?.name, OCCUPANT_RELATIONSHIP_LABELS[unit.relationship]].filter(Boolean).join(' · ')"
    >
      <template #actions>
        <BalanceBadge :balance="unit.balance" />
      </template>
    </PageHeader>

    <DuiCard class="mb-8">
      <dl class="grid grid-cols-2 gap-4 text-sm lg:grid-cols-4">
        <div>
          <dt class="text-navy-500 dark:text-navy-300">Estado</dt>
          <dd class="mt-1 font-medium">{{ UNIT_STATUS_LABELS[unit.status] }}</dd>
        </div>
        <div>
          <dt class="text-navy-500 dark:text-navy-300">Piso</dt>
          <dd class="mt-1 font-medium">{{ unit.floor ?? '—' }}</dd>
        </div>
        <div>
          <dt class="text-navy-500 dark:text-navy-300">Área privada</dt>
          <dd class="mt-1 font-medium tabular-nums">{{ formatArea(unit.privateArea) }}</dd>
        </div>
        <div>
          <dt class="text-navy-500 dark:text-navy-300">Coeficiente de copropiedad</dt>
          <dd class="mt-1 font-medium tabular-nums">{{ formatCoefficient(unit.ownershipCoefficient) }}</dd>
        </div>
      </dl>
    </DuiCard>

    <!-- Estado de cuenta -->
    <section aria-labelledby="account-title" class="mb-8">
      <h2 id="account-title" class="mb-3 text-lg font-semibold">Estado de cuenta</h2>
      <div class="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <div class="col-span-2 rounded-2xl bg-navy-900 p-4 text-white sm:col-span-1 sm:p-5">
          <p class="text-xs tracking-wide text-navy-200 uppercase">Saldo pendiente</p>
          <p class="font-display text-2xl font-semibold tabular-nums">{{ money(unit.balance.pending) }}</p>
        </div>
        <div
          class="rounded-2xl border p-4 sm:p-5"
          :class="
            isZero(unit.balance.overdue)
              ? 'border-navy-100 bg-white dark:border-white/10 dark:bg-navy-900'
              : 'border-red-200 bg-red-50 dark:border-red-400/30 dark:bg-red-500/10'
          "
        >
          <p class="text-xs tracking-wide text-navy-500 uppercase dark:text-navy-300">Vencido</p>
          <p
            class="font-display text-2xl font-semibold tabular-nums"
            :class="{ 'text-red-700 dark:text-red-300': !isZero(unit.balance.overdue) }"
          >
            {{ money(unit.balance.overdue) }}
          </p>
        </div>
        <div class="rounded-2xl border border-navy-100 bg-white p-4 sm:p-5 dark:border-white/10 dark:bg-navy-900">
          <p class="text-xs tracking-wide text-navy-500 uppercase dark:text-navy-300">Cobros abiertos</p>
          <p class="font-display text-2xl font-semibold tabular-nums">{{ unit.balance.openCharges }}</p>
        </div>
      </div>

      <DuiCard v-if="unit.openCharges.length === 0">
        <p class="flex items-center gap-2 text-sm">
          <span class="text-xl text-teal-600" aria-hidden="true"><i class="mdi mdi-check-circle-outline" /></span>
          Estás al día. No tienes cobros pendientes en esta unidad.
        </p>
      </DuiCard>

      <ul
        v-else
        class="divide-y divide-navy-100 overflow-hidden rounded-2xl border border-navy-100 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-navy-900"
      >
        <li v-for="charge in unit.openCharges" :key="charge.id" class="flex flex-wrap items-center justify-between gap-3 p-4">
          <div class="min-w-0">
            <p class="font-medium">{{ charge.concept }} · {{ formatPeriod(charge.period) }}</p>
            <p v-if="charge.description" class="text-sm text-navy-500 dark:text-navy-300">{{ charge.description }}</p>
            <p class="mt-1 text-xs" :class="charge.isOverdue ? 'font-medium text-red-700 dark:text-red-300' : 'text-navy-500 dark:text-navy-300'">
              {{ charge.isOverdue ? 'Venció el' : 'Vence el' }} {{ formatDate(charge.dueOn) }}
            </p>
          </div>
          <div class="text-right">
            <p class="font-semibold tabular-nums">{{ money(charge.balance) }}</p>
            <p v-if="charge.balance !== charge.amount" class="text-xs text-navy-500 tabular-nums dark:text-navy-300">
              de {{ money(charge.amount) }}
            </p>
            <DuiBadge
              class="mt-1"
              :label="charge.isOverdue ? 'Vencido' : CHARGE_STATUS_LABELS[charge.status]"
              :color="charge.isOverdue ? 'danger' : charge.status === 'partially_paid' ? 'primary' : 'warning'"
              variant="soft"
              size="xs"
            />
          </div>
        </li>
      </ul>
    </section>

    <div class="grid gap-8 lg:grid-cols-2">
      <!-- Hogar -->
      <section aria-labelledby="household-title" class="lg:row-span-2">
        <h2 id="household-title" class="mb-3 text-lg font-semibold">Quiénes viven aquí</h2>
        <ul class="divide-y divide-navy-100 overflow-hidden rounded-2xl border border-navy-100 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-navy-900">
          <li v-for="person in unit.household" :key="person.id" class="flex items-start gap-3 p-4">
            <span class="grid size-9 shrink-0 place-items-center rounded-full bg-navy-100 text-sm font-semibold text-navy-700 dark:bg-white/10 dark:text-navy-100">
              {{ person.fullName.charAt(0).toUpperCase() }}
            </span>
            <div class="min-w-0">
              <p class="font-medium">
                {{ person.fullName }}
                <span v-if="person.isMe" class="text-sm font-normal text-navy-500 dark:text-navy-300">(tú)</span>
              </p>
              <p class="text-sm text-navy-500 dark:text-navy-300">{{ OCCUPANT_RELATIONSHIP_LABELS[person.relationship] }}</p>
              <span v-if="person.isPrimaryContact || person.isBillingResponsible" class="mt-1 flex flex-wrap gap-1">
                <DuiBadge v-if="person.isPrimaryContact" label="Contacto principal" size="xs" color="primary" variant="soft" />
                <DuiBadge v-if="person.isBillingResponsible" label="Responsable de pagos" size="xs" color="secondary" variant="soft" />
              </span>
            </div>
          </li>
        </ul>
      </section>

      <!-- Vehículos -->
      <section aria-labelledby="vehicles-title">
        <h2 id="vehicles-title" class="mb-3 text-lg font-semibold">Vehículos</h2>
        <p v-if="unit.vehicles.length === 0" class="rounded-2xl border border-dashed border-navy-200 p-4 text-sm text-navy-500 dark:border-white/10 dark:text-navy-300">
          No hay vehículos registrados.
        </p>
        <ul v-else class="grid gap-3 sm:grid-cols-2">
          <li
            v-for="vehicle in unit.vehicles"
            :key="vehicle.id"
            class="flex items-center gap-3 rounded-2xl border border-navy-100 bg-white p-4 dark:border-white/10 dark:bg-navy-900"
          >
            <span class="text-2xl text-teal-700 dark:text-teal-300" aria-hidden="true"><i :class="vehicleIcons[vehicle.type]" /></span>
            <div class="min-w-0">
              <p class="font-mono font-semibold tracking-wider">{{ vehicle.plate }}</p>
              <p class="truncate text-sm text-navy-500 dark:text-navy-300">
                {{ [VEHICLE_TYPE_LABELS[vehicle.type], vehicle.brand, vehicle.model, vehicle.color].filter(Boolean).join(' · ') }}
              </p>
            </div>
          </li>
        </ul>
      </section>

      <!-- Mascotas -->
      <section aria-labelledby="pets-title">
        <h2 id="pets-title" class="mb-3 text-lg font-semibold">Mascotas</h2>
        <p v-if="unit.pets.length === 0" class="rounded-2xl border border-dashed border-navy-200 p-4 text-sm text-navy-500 dark:border-white/10 dark:text-navy-300">
          No hay mascotas registradas.
        </p>
        <ul v-else class="grid gap-3 sm:grid-cols-2">
          <li
            v-for="pet in unit.pets"
            :key="pet.id"
            class="flex items-center gap-3 rounded-2xl border border-navy-100 bg-white p-4 dark:border-white/10 dark:bg-navy-900"
          >
            <span class="text-2xl text-teal-700 dark:text-teal-300" aria-hidden="true"><i :class="petIcons[pet.species]" /></span>
            <div class="min-w-0">
              <p class="font-medium">{{ pet.name }}</p>
              <p class="truncate text-sm text-navy-500 dark:text-navy-300">
                {{ [PET_SPECIES_LABELS[pet.species], pet.breed].filter(Boolean).join(' · ') }}
              </p>
            </div>
          </li>
        </ul>
      </section>
    </div>

    <p class="mt-8 text-xs text-navy-500 dark:text-navy-300">
      ¿Algún dato no está correcto? Comunícate con la administración de tu conjunto para actualizarlo.
    </p>
  </template>

  <div v-else class="flex flex-col gap-4" aria-busy="true">
    <DuiSkeleton width="14rem" height="2rem" />
    <DuiSkeleton height="5rem" variant="rounded" />
    <DuiSkeleton height="12rem" variant="rounded" />
  </div>
</template>
