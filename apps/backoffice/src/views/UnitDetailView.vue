<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { DuiAlert, DuiBadge, DuiButton, DuiCard, DuiSkeleton, DuiTable, useToast, type TableColumn } from '@dronico/droni-kit'
import {
  OCCUPANT_RELATIONSHIP_LABELS,
  UNIT_STATUS_LABELS,
  UNIT_TYPE_LABELS,
  type Building,
  type Unit,
  type UnitOccupant,
} from '@apartadock/shared'
import PageHeader from '@/components/PageHeader.vue'
import UnitFormModal from '@/components/UnitFormModal.vue'
import OccupantFormModal from '@/components/OccupantFormModal.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { buildingsApi, occupantsApi, unitsApi } from '@/api/backoffice'
import { errorMessage } from '@/lib/errors'
import { useTenantStore } from '@/stores/tenant'

const route = useRoute()
const router = useRouter()
const tenant = useTenantStore()
const toast = useToast()
const unitId = String(route.params.id)

const unit = ref<Unit | null>(null)
const buildings = ref<Building[]>([])
const error = ref<string | null>(null)

const unitFormOpen = ref(false)
const deleteUnitOpen = ref(false)
const occupantFormOpen = ref(false)
const editingOccupant = ref<UnitOccupant | null>(null)
const deletingOccupant = ref<UnitOccupant | null>(null)
const deleteOccupantOpen = ref(false)
const busy = ref(false)

const occupantColumns: TableColumn[] = [
  { name: 'fullName', label: 'Nombre' },
  { name: 'relationship', label: 'Vínculo' },
  { name: 'contact', label: 'Contacto' },
  { name: 'period', label: 'Vigencia' },
  ...(tenant.canManage ? [{ name: 'actions', label: '', classes: 'w-28 text-right' }] : []),
]

async function load() {
  try {
    unit.value = (await unitsApi.show(unitId)).data
    error.value = null
  } catch (e) {
    error.value = errorMessage(e)
  }
}

function editOccupant(occupant: UnitOccupant | null) {
  editingOccupant.value = occupant
  occupantFormOpen.value = true
}

function askDeleteOccupant(occupant: UnitOccupant) {
  deletingOccupant.value = occupant
  deleteOccupantOpen.value = true
}

async function removeOccupant() {
  if (!deletingOccupant.value) return
  busy.value = true
  try {
    await occupantsApi.remove(unitId, deletingOccupant.value.id)
    toast.success('Ocupante eliminado')
    deleteOccupantOpen.value = false
    await load()
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    busy.value = false
  }
}

async function removeUnit() {
  busy.value = true
  try {
    await unitsApi.remove(unitId)
    toast.success('Unidad eliminada')
    await router.push({ name: 'units' })
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    busy.value = false
    deleteUnitOpen.value = false
  }
}

function formatDate(value: string | null) {
  return value ? new Date(`${value}T00:00:00`).toLocaleDateString('es-CO') : null
}

onMounted(() => {
  load()
  if (tenant.canManage) {
    buildingsApi
      .list()
      .then(({ data }) => (buildings.value = data))
      .catch(() => undefined)
  }
})
</script>

<template>
  <DuiAlert v-if="error" color="danger" variant="soft">{{ error }}</DuiAlert>

  <template v-else-if="unit">
    <PageHeader
      :title="`Unidad ${unit.code}`"
      :subtitle="[UNIT_TYPE_LABELS[unit.type], unit.building?.name].filter(Boolean).join(' · ')"
    >
      <template #before>
        <RouterLink :to="{ name: 'units' }" class="mb-1 inline-block text-sm text-neutral-500 hover:underline">
          <span class="mdi mdi-arrow-left" aria-hidden="true" /> Unidades
        </RouterLink>
      </template>
      <template v-if="tenant.canManage" #actions>
        <DuiButton variant="outline" @click="unitFormOpen = true">
          <span class="mdi mdi-pencil-outline mr-1" aria-hidden="true" />Editar
        </DuiButton>
        <DuiButton variant="ghost" color="danger" @click="deleteUnitOpen = true">Eliminar</DuiButton>
      </template>
    </PageHeader>

    <DuiCard class="mb-6">
      <dl class="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <dt class="text-neutral-500 dark:text-neutral-400">Estado</dt>
          <dd class="mt-1"><DuiBadge :label="UNIT_STATUS_LABELS[unit.status]" variant="soft" size="sm" /></dd>
        </div>
        <div>
          <dt class="text-neutral-500 dark:text-neutral-400">Piso</dt>
          <dd class="mt-1 font-medium">{{ unit.floor ?? '—' }}</dd>
        </div>
        <div>
          <dt class="text-neutral-500 dark:text-neutral-400">Área privada</dt>
          <dd class="mt-1 font-medium">{{ unit.privateArea ? `${Number(unit.privateArea).toLocaleString('es-CO')} m²` : '—' }}</dd>
        </div>
        <div>
          <dt class="text-neutral-500 dark:text-neutral-400">Coeficiente</dt>
          <dd class="mt-1 font-medium tabular-nums">
            {{ (Number(unit.ownershipCoefficient) * 100).toLocaleString('es-CO', { maximumFractionDigits: 4 }) }} %
          </dd>
        </div>
        <div>
          <dt class="text-neutral-500 dark:text-neutral-400">Ocupantes</dt>
          <dd class="mt-1 font-medium">{{ unit.occupants?.length ?? 0 }}</dd>
        </div>
      </dl>
      <p v-if="unit.notes" class="mt-4 border-t border-neutral-200 pt-4 text-sm whitespace-pre-line dark:border-white/10">
        {{ unit.notes }}
      </p>
    </DuiCard>

    <div class="mb-3 flex items-center justify-between gap-4">
      <h2 class="text-lg font-semibold">Ocupantes</h2>
      <DuiButton v-if="tenant.canManage" size="sm" color="primary" @click="editOccupant(null)">
        <span class="mdi mdi-account-plus-outline mr-1" aria-hidden="true" />Agregar
      </DuiButton>
    </div>

    <DuiTable :columns="occupantColumns" :rows="unit.occupants ?? []">
      <template #fullName="{ fullName, isPrimaryContact, isBillingResponsible }">
        <span class="font-medium">{{ fullName }}</span>
        <span class="mt-1 flex flex-wrap gap-1">
          <DuiBadge v-if="isPrimaryContact" label="Contacto principal" size="xs" color="primary" variant="soft" />
          <DuiBadge v-if="isBillingResponsible" label="Responsable de pagos" size="xs" color="secondary" variant="soft" />
        </span>
      </template>
      <template #relationship="{ relationship }">
        {{ OCCUPANT_RELATIONSHIP_LABELS[relationship as UnitOccupant['relationship']] }}
      </template>
      <template #contact="{ email, phone }">
        <span class="block">{{ email ?? '' }}</span>
        <span class="block text-neutral-500">{{ phone ?? '' }}</span>
      </template>
      <template #period="{ startsOn, endsOn }">
        {{ formatDate(startsOn) ?? '—' }} → {{ formatDate(endsOn) ?? 'actual' }}
      </template>
      <template #actions="row">
        <div class="flex justify-end gap-1">
          <DuiButton variant="ghost" size="sm" :aria-label="`Editar ${row.fullName}`" @click="editOccupant(row as UnitOccupant)">
            <span class="mdi mdi-pencil-outline" />
          </DuiButton>
          <DuiButton
            variant="ghost"
            color="danger"
            size="sm"
            :aria-label="`Eliminar ${row.fullName}`"
            @click="askDeleteOccupant(row as UnitOccupant)"
          >
            <span class="mdi mdi-trash-can-outline" />
          </DuiButton>
        </div>
      </template>
      <template #empty>No hay ocupantes registrados en esta unidad.</template>
    </DuiTable>

    <UnitFormModal v-model="unitFormOpen" :unit="unit" :buildings="buildings" @saved="load" />
    <OccupantFormModal v-model="occupantFormOpen" :unit-id="unitId" :occupant="editingOccupant" @saved="load" />
    <ConfirmDialog
      v-model="deleteOccupantOpen"
      title="Eliminar ocupante"
      :message="`¿Eliminar a ${deletingOccupant?.fullName} de la unidad ${unit.code}?`"
      :loading="busy"
      @confirm="removeOccupant"
    />
    <ConfirmDialog
      v-model="deleteUnitOpen"
      title="Eliminar unidad"
      :message="`¿Eliminar la unidad ${unit.code}? Su historial se conserva.`"
      :loading="busy"
      @confirm="removeUnit"
    />
  </template>

  <div v-else class="flex flex-col gap-4" aria-busy="true">
    <DuiSkeleton width="12rem" height="2rem" />
    <DuiSkeleton height="6rem" variant="rounded" />
    <DuiSkeleton height="12rem" variant="rounded" />
  </div>
</template>
