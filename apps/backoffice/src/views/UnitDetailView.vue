<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  UiAlert,
  UiBadge,
  UiButton,
  UiCard,
  UiSkeleton,
  UiTable,
  useToast,
  type TableColumn,
} from '@aptoph/ui'
import {
  OCCUPANT_RELATIONSHIP_LABELS,
  UNIT_STATUS_LABELS,
  UNIT_TYPE_LABELS,
  type Building,
  type Unit,
  type UnitOccupant,
} from '@aptoph/shared'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import UnitFormModal from '@/components/UnitFormModal.vue'
import OccupantFormModal from '@/components/OccupantFormModal.vue'
import MemberFormModal from '@/components/MemberFormModal.vue'
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
const inviteOpen = ref(false)
const invitingOccupant = ref<UnitOccupant | null>(null)
const busy = ref(false)

const occupantColumns: TableColumn[] = [
  { name: 'fullName', label: 'Nombre' },
  { name: 'relationship', label: 'Vínculo' },
  { name: 'contact', label: 'Contacto' },
  { name: 'period', label: 'Vigencia' },
  ...(tenant.canManage ? [{ name: 'actions', label: '', classes: 'w-36 text-right' }] : []),
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

/** Gives the occupant access to the residents portal, linked to this unit */
function inviteOccupant(occupant: UnitOccupant) {
  invitingOccupant.value = occupant
  inviteOpen.value = true
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
  <UiAlert v-if="error" color="danger" variant="soft">{{ error }}</UiAlert>

  <template v-else-if="unit">
    <PageHeader
      :title="`Unidad ${unit.code}`"
      :subtitle="[UNIT_TYPE_LABELS[unit.type], unit.building?.name].filter(Boolean).join(' · ')"
    >
      <template #before>
        <RouterLink
          :to="{ name: 'units' }"
          class="mb-1 inline-block text-sm text-neutral-500 hover:underline"
        >
          <span class="mdi mdi-arrow-left" aria-hidden="true" /> Unidades
        </RouterLink>
      </template>
      <template v-if="tenant.canManage || tenant.canReadFinance" #actions>
        <RouterLink
          v-if="tenant.canReadFinance"
          :to="{ name: 'finance-statement', params: { unitId: unit.id } }"
        >
          <UiButton variant="outline">
            <span class="mr-1"><i class="mdi mdi-account-cash-outline" aria-hidden="true" /></span
            >Estado de cuenta
          </UiButton>
        </RouterLink>
        <template v-if="tenant.canManage">
          <UiButton variant="outline" @click="unitFormOpen = true">
            <span class="mdi mdi-pencil-outline mr-1" aria-hidden="true" />Editar
          </UiButton>
          <UiButton variant="ghost" color="danger" @click="deleteUnitOpen = true"
            >Eliminar</UiButton
          >
        </template>
      </template>
    </PageHeader>

    <UiCard class="mb-6">
      <dl class="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <dt class="text-neutral-500 dark:text-neutral-400">Estado</dt>
          <dd class="mt-1">
            <UiBadge :label="UNIT_STATUS_LABELS[unit.status]" variant="soft" size="sm" />
          </dd>
        </div>
        <div>
          <dt class="text-neutral-500 dark:text-neutral-400">Piso</dt>
          <dd class="mt-1 font-medium">{{ unit.floor ?? '—' }}</dd>
        </div>
        <div>
          <dt class="text-neutral-500 dark:text-neutral-400">Área privada</dt>
          <dd class="mt-1 font-medium">
            {{ unit.privateArea ? `${Number(unit.privateArea).toLocaleString('es-CO')} m²` : '—' }}
          </dd>
        </div>
        <div>
          <dt class="text-neutral-500 dark:text-neutral-400">Coeficiente</dt>
          <dd class="mt-1 font-medium tabular-nums">
            {{
              (Number(unit.ownershipCoefficient) * 100).toLocaleString('es-CO', {
                maximumFractionDigits: 4,
              })
            }}
            %
          </dd>
        </div>
        <div>
          <dt class="text-neutral-500 dark:text-neutral-400">Ocupantes</dt>
          <dd class="mt-1 font-medium">{{ unit.occupants?.length ?? 0 }}</dd>
        </div>
      </dl>
      <p
        v-if="unit.notes"
        class="mt-4 border-t border-neutral-200 pt-4 text-sm whitespace-pre-line dark:border-white/10"
      >
        {{ unit.notes }}
      </p>
    </UiCard>

    <div class="mb-3 flex items-center justify-between gap-4">
      <h2 class="text-lg font-semibold">Ocupantes</h2>
      <UiButton v-if="tenant.canManage" size="sm" color="primary" @click="editOccupant(null)">
        <span class="mdi mdi-account-plus-outline mr-1" aria-hidden="true" />Agregar
      </UiButton>
    </div>

    <UiTable :columns="occupantColumns" :rows="unit.occupants ?? []">
      <template #fullName="{ fullName, isPrimaryContact, isBillingResponsible }">
        <span class="font-medium">{{ fullName }}</span>
        <span class="mt-1 flex flex-wrap gap-1">
          <UiBadge
            v-if="isPrimaryContact"
            label="Contacto principal"
            size="xs"
            color="primary"
            variant="soft"
          />
          <UiBadge
            v-if="isBillingResponsible"
            label="Responsable de pagos"
            size="xs"
            color="secondary"
            variant="soft"
          />
        </span>
      </template>
      <template #relationship="{ relationship }">
        {{ OCCUPANT_RELATIONSHIP_LABELS[relationship as UnitOccupant['relationship']] }}
      </template>
      <template #contact="{ email, phone, userId }">
        <span class="block">{{ email ?? '' }}</span>
        <span class="block text-neutral-500">{{ phone ?? '' }}</span>
        <UiBadge
          v-if="userId"
          label="Cuenta vinculada"
          size="xs"
          color="success"
          variant="soft"
          class="mt-1"
        />
      </template>
      <template #period="{ startsOn, endsOn }">
        {{ formatDate(startsOn) ?? '—' }} → {{ formatDate(endsOn) ?? 'actual' }}
      </template>
      <template #actions="row">
        <div class="flex justify-end gap-1">
          <UiButton
            v-if="!row.userId"
            variant="ghost"
            size="sm"
            :title="`Invitar a ${row.fullName} al portal de residentes`"
            :aria-label="`Invitar a ${row.fullName} al portal de residentes`"
            @click="inviteOccupant(row as UnitOccupant)"
          >
            <span class="mdi mdi-email-plus-outline" />
          </UiButton>
          <UiButton
            variant="ghost"
            size="sm"
            :aria-label="`Editar ${row.fullName}`"
            @click="editOccupant(row as UnitOccupant)"
          >
            <span class="mdi mdi-pencil-outline" />
          </UiButton>
          <UiButton
            variant="ghost"
            color="danger"
            size="sm"
            :aria-label="`Eliminar ${row.fullName}`"
            @click="askDeleteOccupant(row as UnitOccupant)"
          >
            <span class="mdi mdi-trash-can-outline" />
          </UiButton>
        </div>
      </template>
      <template #empty
        ><EmptyState
          art="sin-mensajes"
          title="Sin ocupantes registrados"
          description="Agrega al propietario, los arrendatarios y quienes viven en la unidad."
      /></template>
    </UiTable>

    <UnitFormModal v-model="unitFormOpen" :unit="unit" :buildings="buildings" @saved="load" />
    <OccupantFormModal
      v-model="occupantFormOpen"
      :unit-id="unitId"
      :occupant="editingOccupant"
      @saved="load"
    />
    <MemberFormModal
      v-model="inviteOpen"
      :preset="
        invitingOccupant
          ? {
              email: invitingOccupant.email ?? undefined,
              fullName: invitingOccupant.fullName,
              role: 'resident',
              occupantId: invitingOccupant.id,
            }
          : undefined
      "
      @saved="load"
    />
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
    <UiSkeleton width="12rem" height="2rem" />
    <UiSkeleton height="6rem" variant="rounded" />
    <UiSkeleton height="12rem" variant="rounded" />
  </div>
</template>
