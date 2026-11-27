<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { UiBadge, UiButton, UiTable, useToast, type TableColumn } from '@aptoph/ui'
import {
  PARKING_LOTTERY_STATUS_LABELS,
  VEHICLE_TYPE_LABELS,
  type ParkingLottery,
  type ParkingLotteryStatus,
} from '@aptoph/shared'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import LotteryFormModal from '@/components/parking/LotteryFormModal.vue'
import { parkingApi } from '@/api/parking'
import { errorMessage } from '@/lib/errors'
import { formatDate, formatDateTime } from '@/lib/format'
import { useTenantStore } from '@/stores/tenant'

const tenant = useTenantStore()
const toast = useToast()
const router = useRouter()
const manage = computed(() => tenant.canManageParking)

const lotteries = ref<ParkingLottery[]>([])
const lotteryMonths = ref(6)
const loading = ref(false)
const formOpen = ref(false)

const hasOpen = computed(() => lotteries.value.some((lottery) => lottery.status === 'open'))
const columns: TableColumn[] = [
  { name: 'title', label: 'Sorteo' },
  { name: 'period', label: 'Periodo' },
  { name: 'spots', label: 'Cupos' },
  { name: 'applications', label: 'Postulaciones', classes: 'text-right' },
  { name: 'status', label: 'Estado' },
]

const statusColor = (status: ParkingLotteryStatus) =>
  status === 'open'
    ? 'primary'
    : status === 'drawn'
      ? 'success'
      : status === 'finished'
        ? 'neutral'
        : 'danger'
const spotsLabel = (lottery: ParkingLottery) =>
  lottery.spots.map((s) => `${s.count} ${VEHICLE_TYPE_LABELS[s.type].toLowerCase()}`).join(' · ') ||
  '—'
const applied = (lottery: ParkingLottery) =>
  Object.entries(lottery.counts)
    .filter(([status]) => status !== 'withdrawn')
    .reduce((sum, [, count]) => sum + count, 0)

async function load() {
  loading.value = true
  try {
    lotteries.value = (await parkingApi.lotteries()).data
    if (manage.value) lotteryMonths.value = (await parkingApi.settings()).data.lotteryMonths
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    loading.value = false
  }
}

function created(lottery: ParkingLottery) {
  void router.push({ name: 'parking-lottery', params: { id: lottery.id } })
}

onMounted(load)
</script>

<template>
  <PageHeader
    title="Sorteos de parqueaderos"
    subtitle="Los residentes se postulan en el portal; el sistema sortea los cupos comunales y deja una lista de espera"
  >
    <template #actions>
      <UiButton variant="outline" :to="{ name: 'parking' }">
        <i class="mdi mdi-arrow-left mr-1" aria-hidden="true" />Parqueaderos
      </UiButton>
      <UiButton
        v-if="manage"
        color="primary"
        :disabled="hasOpen"
        :title="hasOpen ? 'Ya hay un sorteo con postulaciones abiertas' : undefined"
        @click="formOpen = true"
      >
        <i class="mdi mdi-plus mr-1" aria-hidden="true" />Abrir sorteo
      </UiButton>
    </template>
  </PageHeader>

  <UiTable :columns="columns" :rows="lotteries" :loading="loading" row-key="id">
    <template #title="row">
      <RouterLink
        :to="{ name: 'parking-lottery', params: { id: row.id } }"
        class="font-medium text-brand-600 hover:underline dark:text-brand-200"
        >#{{ row.number }} · {{ row.title }}</RouterLink
      >
      <span v-if="row.status === 'open'" class="block text-xs text-neutral-500">
        Postulaciones hasta el {{ formatDateTime(row.closesAt) }}
      </span>
      <span v-else-if="row.drawnAt" class="block text-xs text-neutral-500">
        Sorteado el {{ formatDateTime(row.drawnAt) }}
      </span>
    </template>
    <template #period="row">
      {{ formatDate(row.periodStartsOn) }} al {{ formatDate(row.periodEndsOn) }}
    </template>
    <template #spots="row">
      {{ spotsLabel(row) }}
    </template>
    <template #applications="row">
      <span class="tabular-nums">{{ applied(row) }}</span>
    </template>
    <template #status="row">
      <UiBadge
        :label="PARKING_LOTTERY_STATUS_LABELS[row.status as ParkingLotteryStatus]"
        :color="statusColor(row.status)"
        variant="soft"
        size="sm"
      />
    </template>
    <template #empty>
      <EmptyState
        art="sin-resultados"
        title="Todavía no hay sorteos"
        :description="
          manage
            ? 'Abre las postulaciones: los residentes se postulan en el portal y al cierre haces el sorteo.'
            : undefined
        "
      />
    </template>
  </UiTable>

  <LotteryFormModal v-model="formOpen" :lottery-months="lotteryMonths" @saved="created" />
</template>
