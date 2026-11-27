<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  UiAlert,
  UiBadge,
  UiButton,
  UiInput,
  UiLabel,
  UiModal,
  UiSelect,
  UiTable,
  useToast,
  type TableColumn,
} from '@aptoph/ui'
import {
  PARKING_APPLICATION_STATUSES,
  PARKING_APPLICATION_STATUS_LABELS,
  PARKING_DRAW_METHOD,
  PARKING_LOTTERY_STATUS_LABELS,
  VEHICLE_TYPE_LABELS,
  type ParkingApplication,
  type ParkingApplicationStatus,
  type ParkingLottery,
  type ParkingSpot,
  type VehicleType,
} from '@aptoph/shared'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import LotteryFormModal from '@/components/parking/LotteryFormModal.vue'
import UnitPicker, { type PickedUnit } from '@/components/finance/UnitPicker.vue'
import { parkingApi } from '@/api/parking'
import { errorMessage, fieldErrors } from '@/lib/errors'
import { formatDate, formatDateTime } from '@/lib/format'
import { useTenantStore } from '@/stores/tenant'

const route = useRoute()
const tenant = useTenantStore()
const toast = useToast()
const manage = computed(() => tenant.canManageParking)
const id = computed(() => String(route.params.id))

const lottery = ref<ParkingLottery | null>(null)
const applications = ref<ParkingApplication[]>([])
const lotteryMonths = ref(6)
const loading = ref(false)
const busy = ref(false)

const status = ref<ParkingApplicationStatus | ''>('')
const vehicleType = ref<VehicleType | ''>('')
const search = ref('')

const editOpen = ref(false)
const drawOpen = ref(false)
const cancelOpen = ref(false)

const isOpen = computed(() => lottery.value?.status === 'open')
const isDrawn = computed(() => lottery.value?.status === 'drawn')
const closed = computed(
  () => !!lottery.value && new Date(lottery.value.closesAt).getTime() <= Date.now(),
)
const pendingCount = computed(() => lottery.value?.counts.pending ?? 0)
const totalSpots = computed(() => lottery.value?.spots.reduce((sum, s) => sum + s.count, 0) ?? 0)

const statusOptions = PARKING_APPLICATION_STATUSES.map((value) => ({
  value,
  label: PARKING_APPLICATION_STATUS_LABELS[value],
}))
const typeOptions = computed(
  () =>
    lottery.value?.spots.map((s) => ({ value: s.type, label: VEHICLE_TYPE_LABELS[s.type] })) ?? [],
)
const columns = computed<TableColumn[]>(() => [
  { name: 'position', label: '#', classes: 'w-12 text-right' },
  { name: 'unit', label: 'Unidad' },
  { name: 'type', label: 'Para' },
  { name: 'status', label: 'Estado' },
  { name: 'spot', label: 'Parqueadero' },
  ...(isOpen.value ? [] : [{ name: 'hash', label: 'Código del sorteo' }]),
  ...(manage.value ? [{ name: 'actions', label: '', classes: 'text-right' }] : []),
])

const unitLabel = (unit: ParkingApplication['unit']) =>
  [unit.building?.name, unit.code].filter(Boolean).join(' · ')
const lotteryColor = (value: ParkingLottery['status']) =>
  value === 'open'
    ? 'primary'
    : value === 'drawn'
      ? 'success'
      : value === 'finished'
        ? 'neutral'
        : 'danger'
const applicationColor = (value: ParkingApplicationStatus) =>
  value === 'won' || value === 'accepted'
    ? 'success'
    : value === 'offered' || value === 'pending'
      ? 'primary'
      : value === 'waiting'
        ? 'warning'
        : value === 'ineligible'
          ? 'danger'
          : 'neutral'

async function loadApplications() {
  applications.value = (
    await parkingApi.applications(id.value, {
      status: status.value,
      vehicleType: vehicleType.value,
      search: search.value || undefined,
    })
  ).data
}

async function load() {
  loading.value = true
  try {
    lottery.value = (await parkingApi.lottery(id.value)).data
    await loadApplications()
    if (manage.value) lotteryMonths.value = (await parkingApi.settings()).data.lotteryMonths
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    loading.value = false
  }
}

let timer: ReturnType<typeof setTimeout> | undefined
watch([status, vehicleType, search], () => {
  clearTimeout(timer)
  timer = setTimeout(() => void loadApplications().catch((e) => toast.error(errorMessage(e))), 250)
})

async function act(run: () => Promise<unknown>, done: string) {
  busy.value = true
  try {
    await run()
    toast.success(done)
    await load()
    return true
  } catch (e) {
    toast.error(errorMessage(e))
    return false
  } finally {
    busy.value = false
  }
}

async function draw() {
  const ok = await act(() => parkingApi.drawLottery(id.value), 'Sorteo realizado')
  if (ok) drawOpen.value = false
}

async function cancel() {
  const ok = await act(() => parkingApi.cancelLottery(id.value), 'Sorteo anulado')
  if (ok) cancelOpen.value = false
}

async function offerFree() {
  busy.value = true
  try {
    const { offered } = await parkingApi.offerFree(id.value)
    if (offered) toast.success(`Se ofrecieron ${offered} cupos a la lista de espera`)
    else toast.info('No hay cupos libres o nadie más en la lista de espera')
    await load()
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    busy.value = false
  }
}

function withdraw(application: ParkingApplication) {
  void act(
    () => parkingApi.withdrawApplication(application.id),
    application.status === 'offered'
      ? 'Oferta rechazada: el cupo pasa al siguiente'
      : 'Postulación retirada',
  )
}

async function copySeed() {
  if (!lottery.value?.seed) return
  await navigator.clipboard.writeText(lottery.value.seed)
  toast.success('Semilla copiada')
}

// Apply on behalf of a unit

const applyOpen = ref(false)
const applyUnit = ref<PickedUnit | null>(null)
const applyType = ref<VehicleType>('car')
const applyErrors = ref<Record<string, string>>({})
const applyError = ref<string | null>(null)

function openApply() {
  applyUnit.value = null
  applyType.value = lottery.value?.spots[0]?.type ?? 'car'
  applyErrors.value = {}
  applyError.value = null
  applyOpen.value = true
}

async function submitApply() {
  if (!applyUnit.value) return
  busy.value = true
  applyErrors.value = {}
  applyError.value = null
  try {
    const { data } = await parkingApi.applyFor(id.value, {
      unitId: applyUnit.value.id,
      vehicleType: applyType.value,
    })
    toast.success(
      data.status === 'offered'
        ? `Postulada y se le ofreció ${data.spot?.code}`
        : data.late
          ? 'Postulada al final de la lista de espera'
          : 'Postulación registrada',
    )
    applyOpen.value = false
    await load()
  } catch (e) {
    applyErrors.value = fieldErrors(e)
    applyError.value = Object.keys(applyErrors.value).length ? null : errorMessage(e)
  } finally {
    busy.value = false
  }
}

// Assign a free spot straight to an application

const assignOpen = ref(false)
const assigning = ref<ParkingApplication | null>(null)
const freeSpots = ref<ParkingSpot[]>([])
const spotId = ref('')

async function openAssign(application: ParkingApplication) {
  assigning.value = application
  spotId.value = ''
  try {
    freeSpots.value = (
      await parkingApi.spots({
        state: 'free',
        vehicleType: application.vehicleType,
        perPage: 100,
      })
    ).data
    spotId.value = freeSpots.value[0]?.id ?? ''
    assignOpen.value = true
  } catch (e) {
    toast.error(errorMessage(e))
  }
}

async function submitAssign() {
  if (!assigning.value || !spotId.value) return
  const ok = await act(
    () => parkingApi.assignApplication(assigning.value!.id, spotId.value),
    'Parqueadero asignado',
  )
  if (ok) assignOpen.value = false
}

onMounted(load)
</script>

<template>
  <PageHeader
    :title="lottery ? `#${lottery.number} · ${lottery.title}` : 'Sorteo de parqueaderos'"
    :subtitle="
      lottery
        ? `Periodo del ${formatDate(lottery.periodStartsOn)} al ${formatDate(lottery.periodEndsOn)}`
        : undefined
    "
  >
    <template #actions>
      <UiButton variant="outline" :to="{ name: 'parking-lotteries' }">
        <i class="mdi mdi-arrow-left mr-1" aria-hidden="true" />Sorteos
      </UiButton>
      <template v-if="manage && lottery">
        <template v-if="isOpen">
          <UiButton variant="outline" @click="editOpen = true">
            <i class="mdi mdi-pencil-outline mr-1" aria-hidden="true" />Editar
          </UiButton>
          <UiButton variant="outline" color="danger" @click="cancelOpen = true">Anular</UiButton>
          <UiButton variant="outline" @click="openApply">Postular unidad</UiButton>
          <UiButton color="primary" @click="drawOpen = true">
            <i class="mdi mdi-dice-multiple-outline mr-1" aria-hidden="true" />Sortear
          </UiButton>
        </template>
        <template v-else-if="isDrawn">
          <UiButton variant="outline" @click="openApply">Postular unidad</UiButton>
          <UiButton variant="outline" :loading="busy" @click="offerFree">
            Ofrecer cupos libres
          </UiButton>
        </template>
      </template>
    </template>
  </PageHeader>

  <template v-if="lottery">
    <div class="mb-4 grid gap-3 sm:grid-cols-3">
      <div class="rounded-xl border border-neutral-200 p-4 dark:border-white/10">
        <p class="text-xs text-neutral-500">Estado</p>
        <UiBadge
          :label="PARKING_LOTTERY_STATUS_LABELS[lottery.status]"
          :color="lotteryColor(lottery.status)"
          variant="soft"
          class="mt-1"
        />
        <p class="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
          <template v-if="isOpen">
            {{ closed ? 'Cerró' : 'Cierra' }} el {{ formatDateTime(lottery.closesAt) }}
          </template>
          <template v-else-if="lottery.drawnAt">
            Sorteado el {{ formatDateTime(lottery.drawnAt) }}
            <template v-if="lottery.drawnBy">por {{ lottery.drawnBy.fullName }}</template>
          </template>
        </p>
        <p v-if="lottery.notifiedCount" class="mt-1 text-xs text-neutral-500">
          Aviso enviado a {{ lottery.notifiedCount }} residentes
        </p>
      </div>
      <div class="rounded-xl border border-neutral-200 p-4 dark:border-white/10">
        <p class="text-xs text-neutral-500">Cupos comunales</p>
        <p class="mt-1 text-2xl font-bold tabular-nums">{{ totalSpots }}</p>
        <p class="text-sm text-neutral-600 dark:text-neutral-300">
          {{
            lottery.spots
              .map((s) => `${s.count} ${VEHICLE_TYPE_LABELS[s.type].toLowerCase()}`)
              .join(' · ')
          }}
        </p>
      </div>
      <div class="rounded-xl border border-neutral-200 p-4 dark:border-white/10">
        <p class="text-xs text-neutral-500">Postulaciones</p>
        <dl class="mt-1 grid grid-cols-2 gap-x-3 text-sm">
          <template v-for="key in PARKING_APPLICATION_STATUSES" :key="key">
            <template v-if="lottery.counts[key]">
              <dt class="text-neutral-500">{{ PARKING_APPLICATION_STATUS_LABELS[key] }}</dt>
              <dd class="text-right font-semibold tabular-nums">{{ lottery.counts[key] }}</dd>
            </template>
          </template>
        </dl>
      </div>
    </div>

    <p v-if="lottery.notes" class="mb-4 whitespace-pre-line text-sm text-neutral-600">
      {{ lottery.notes }}
    </p>

    <div
      v-if="lottery.seed"
      class="mb-4 rounded-xl bg-neutral-50 px-4 py-3 text-sm dark:bg-white/5"
    >
      <p class="font-medium">Cómo verificar el sorteo</p>
      <p class="mt-1 text-neutral-600 dark:text-neutral-300">
        {{ PARKING_DRAW_METHOD }}. Los que no cumplían los requisitos al sortear no participan.
      </p>
      <p class="mt-2 flex flex-wrap items-center gap-2">
        <span class="text-neutral-500">Semilla:</span>
        <code class="break-all font-mono text-xs">{{ lottery.seed }}</code>
        <UiButton size="sm" variant="ghost" @click="copySeed">Copiar</UiButton>
      </p>
    </div>

    <div class="mb-3 flex flex-wrap items-center gap-2">
      <UiSelect
        v-model="status"
        :options="statusOptions"
        placeholder="Todos los estados"
        size="sm"
        aria-label="Estado"
      />
      <UiSelect
        v-if="typeOptions.length > 1"
        v-model="vehicleType"
        :options="typeOptions"
        placeholder="Todos los vehículos"
        size="sm"
        aria-label="Tipo de vehículo"
      />
      <UiInput
        v-model="search"
        type="search"
        placeholder="Unidad o placa"
        aria-label="Buscar"
        class="w-full sm:ml-auto sm:w-60"
      />
    </div>

    <UiTable :columns="columns" :rows="applications" :loading="loading" row-key="id">
      <template #position="row">
        <span class="tabular-nums text-neutral-500">{{ row.drawPosition ?? '—' }}</span>
      </template>
      <template #unit="row">
        <span class="font-medium">{{ unitLabel(row.unit) }}</span>
        <span v-if="row.priorityGroup > 0" class="block text-xs text-neutral-500">
          Tiene parqueadero propio
        </span>
        <span v-if="row.late" class="block text-xs text-neutral-500">Después del sorteo</span>
      </template>
      <template #type="row">
        {{ VEHICLE_TYPE_LABELS[row.vehicleType as VehicleType] }}
        <span v-if="row.vehicle" class="block font-mono text-xs text-neutral-500">{{
          row.vehicle.plate
        }}</span>
      </template>
      <template #status="row">
        <UiBadge
          :label="PARKING_APPLICATION_STATUS_LABELS[row.status as ParkingApplicationStatus]"
          :color="applicationColor(row.status)"
          variant="soft"
          size="sm"
        />
        <span v-if="row.queuePosition" class="block text-xs text-neutral-500">
          Puesto {{ row.queuePosition }} en la lista
        </span>
        <span
          v-if="row.status === 'offered' && row.offerExpiresAt"
          class="block text-xs text-neutral-500"
        >
          Responde hasta el {{ formatDateTime(row.offerExpiresAt) }}
        </span>
        <span
          v-if="row.ineligibleReason"
          class="block max-w-xs text-xs text-red-600 dark:text-red-300"
        >
          {{ row.ineligibleReason }}
        </span>
      </template>
      <template #spot="row">
        <span class="font-mono">{{ row.spot?.code ?? '—' }}</span>
      </template>
      <template #hash="row">
        <code v-if="row.drawHash" class="font-mono text-xs text-neutral-500" :title="row.drawHash"
          >{{ row.drawHash.slice(0, 10) }}…</code
        >
      </template>
      <template #actions="row">
        <div class="flex justify-end gap-1">
          <UiButton
            v-if="isDrawn && row.status === 'waiting'"
            size="sm"
            variant="ghost"
            @click="openAssign(row)"
            >Asignar</UiButton
          >
          <UiButton
            v-if="['pending', 'waiting', 'offered'].includes(row.status)"
            size="sm"
            variant="ghost"
            color="danger"
            :disabled="busy"
            @click="withdraw(row)"
            >{{ row.status === 'offered' ? 'Rechazar oferta' : 'Retirar' }}</UiButton
          >
        </div>
      </template>
      <template #empty>
        <EmptyState
          art="sin-resultados"
          :title="
            search || status ? 'Ninguna postulación coincide' : 'Todavía no hay postulaciones'
          "
          :description="
            isOpen && !search && !status
              ? 'Los residentes se postulan desde el portal, en Parqueaderos.'
              : undefined
          "
        />
      </template>
    </UiTable>
  </template>

  <LotteryFormModal
    v-model="editOpen"
    :lottery="lottery"
    :lottery-months="lotteryMonths"
    @saved="load"
  />

  <UiModal v-model="drawOpen" title="Sortear los cupos" :persistent="busy">
    <div class="space-y-3 text-sm">
      <p>
        Se sortearán {{ totalSpots }} cupos entre {{ pendingCount }}
        {{ pendingCount === 1 ? 'postulación' : 'postulaciones' }}. No se puede deshacer.
      </p>
      <UiAlert v-if="!closed" color="warning" variant="soft">
        Las postulaciones cierran el {{ formatDateTime(lottery?.closesAt) }}: si sorteas ahora,
        nadie más podrá postularse antes del sorteo.
      </UiAlert>
      <ul class="list-disc space-y-1 pl-5 text-neutral-600 dark:text-neutral-300">
        <li>
          Los cupos comunales vigentes terminan el
          {{ lottery ? formatDate(lottery.periodStartsOn) : '' }} menos un día.
        </li>
        <li>Quienes no cumplan los requisitos en este momento quedan por fuera.</li>
        <li>Los demás quedan en lista de espera, en el orden del sorteo.</li>
        <li>Se avisa a cada unidad por correo.</li>
      </ul>
    </div>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UiButton variant="ghost" :disabled="busy" @click="drawOpen = false">Cancelar</UiButton>
        <UiButton color="primary" :loading="busy" @click="draw">Sortear</UiButton>
      </div>
    </template>
  </UiModal>

  <UiModal v-model="cancelOpen" title="Anular el sorteo" :persistent="busy">
    <p class="text-sm">
      Las postulaciones quedan sin efecto y podrás abrir un sorteo nuevo. No se avisa a los
      residentes.
    </p>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UiButton variant="ghost" :disabled="busy" @click="cancelOpen = false">Volver</UiButton>
        <UiButton color="danger" :loading="busy" @click="cancel">Anular sorteo</UiButton>
      </div>
    </template>
  </UiModal>

  <UiModal v-model="applyOpen" title="Postular una unidad" :persistent="busy">
    <div class="space-y-4">
      <p class="text-sm text-neutral-500">
        Para unidades sin cuenta en el portal. Se revisan los mismos requisitos.
        <template v-if="isDrawn"> Queda al final de la lista de espera.</template>
      </p>
      <UiAlert v-if="applyError" color="danger" variant="soft">{{ applyError }}</UiAlert>
      <UiLabel title="Unidad" required :error="applyErrors.unitId">
        <div
          v-if="applyUnit"
          class="flex items-center justify-between gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-sm dark:bg-white/5"
        >
          <span class="font-medium">{{ applyUnit.label }}</span>
          <UiButton size="sm" variant="ghost" @click="applyUnit = null">Cambiar</UiButton>
        </div>
        <UnitPicker v-else autofocus @pick="(picked) => (applyUnit = picked)" />
      </UiLabel>
      <UiLabel v-if="typeOptions.length > 1" title="Cupo para" :error="applyErrors.vehicleType">
        <UiSelect v-model="applyType" :options="typeOptions" block />
      </UiLabel>
    </div>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UiButton variant="ghost" :disabled="busy" @click="applyOpen = false">Cancelar</UiButton>
        <UiButton color="primary" :loading="busy" :disabled="!applyUnit" @click="submitApply">
          Postular
        </UiButton>
      </div>
    </template>
  </UiModal>

  <UiModal
    v-model="assignOpen"
    :title="assigning ? `Asignar a ${unitLabel(assigning.unit)}` : 'Asignar'"
    :persistent="busy"
  >
    <div class="space-y-4">
      <p class="text-sm text-neutral-500">
        Sin pasar por la oferta: queda asignado hasta el fin del periodo y se le avisa por correo.
      </p>
      <UiAlert v-if="!freeSpots.length" color="warning" variant="soft">
        No hay parqueaderos comunales libres de este tipo.
      </UiAlert>
      <UiLabel v-else title="Parqueadero" required>
        <UiSelect
          v-model="spotId"
          :options="
            freeSpots.map((s) => ({
              value: s.id,
              label: s.location ? `${s.code} · ${s.location}` : s.code,
            }))
          "
          block
        />
      </UiLabel>
    </div>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UiButton variant="ghost" :disabled="busy" @click="assignOpen = false">Cancelar</UiButton>
        <UiButton color="primary" :loading="busy" :disabled="!spotId" @click="submitAssign">
          Asignar
        </UiButton>
      </div>
    </template>
  </UiModal>
</template>
