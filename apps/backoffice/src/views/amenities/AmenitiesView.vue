<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { UiBadge, UiButton, UiCard, UiSkeleton, useToast } from '@aptoph/ui'
import { AMENITY_PAYMENT_MODE_LABELS, type Amenity } from '@aptoph/shared'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import AmenityFormModal from '@/components/amenities/AmenityFormModal.vue'
import { amenitiesApi } from '@/api/amenities'
import { errorMessage } from '@/lib/errors'
import { formatMoney } from '@/lib/format'
import { feeLabel, scheduleLabel } from '@/lib/amenities'

const toast = useToast()
const amenities = ref<Amenity[] | null>(null)
const editing = ref<Amenity | null>(null)
const formOpen = ref(false)
const removing = ref<Amenity | null>(null)
const busy = ref(false)

async function load() {
  try {
    amenities.value = (await amenitiesApi.list()).data
  } catch (e) {
    amenities.value = []
    toast.error(errorMessage(e))
  }
}
onMounted(load)

function edit(amenity: Amenity | null) {
  editing.value = amenity
  formOpen.value = true
}

async function remove() {
  const amenity = removing.value
  if (!amenity) return
  busy.value = true
  try {
    const result = await amenitiesApi.remove(amenity.id)
    toast.success(
      result?.data
        ? `${amenity.name} quedó inactiva (tiene reservas)`
        : `${amenity.name} eliminada`,
    )
    removing.value = null
    await load()
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    busy.value = false
  }
}

/** The rules that matter at a glance */
function chips(amenity: Amenity) {
  const r = amenity.rules
  return [
    amenity.requiresApproval ? 'Requiere aprobación' : 'Confirmación inmediata',
    !amenity.allowDelinquent && 'Sin mora',
    amenity.allowGuests && 'Invitados',
    amenity.allowExternal && 'Terceros',
    amenity.capacity && `Aforo ${amenity.capacity}`,
    r.bufferMinutes && `Aseo ${r.bufferMinutes} min`,
    r.maxActivePerUnit && `${r.maxActivePerUnit} activa(s) por unidad`,
    r.maxPerMonthPerUnit && `${r.maxPerMonthPerUnit} al mes por unidad`,
    r.minNoticeHours && `Anticipación ${r.minNoticeHours} h`,
    amenity.terms && 'Reglamento',
  ].filter(Boolean) as string[]
}
</script>

<template>
  <PageHeader
    title="Configuración de zonas comunes"
    subtitle="Cómo se agenda cada zona, sus tarifas y sus reglas"
  >
    <template #before>
      <RouterLink
        :to="{ name: 'amenities' }"
        class="mb-1 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
      >
        <i class="mdi mdi-arrow-left" aria-hidden="true" /> Calendario de reservas
      </RouterLink>
    </template>
    <template #actions>
      <UiButton color="primary" icon="mdi-plus" @click="edit(null)">Nueva zona</UiButton>
    </template>
  </PageHeader>

  <div v-if="!amenities" class="grid gap-4 md:grid-cols-2">
    <UiSkeleton v-for="n in 4" :key="n" class="h-44" />
  </div>
  <EmptyState
    v-else-if="!amenities.length"
    art="bienvenida"
    title="Todavía no hay zonas comunes"
    description="Crea el salón social, la zona BBQ, el gimnasio… y define cómo se reservan."
  >
    <UiButton color="primary" icon="mdi-plus" @click="edit(null)">Crear la primera zona</UiButton>
  </EmptyState>
  <div v-else class="grid gap-4 md:grid-cols-2">
    <UiCard
      v-for="amenity in amenities"
      :key="amenity.id"
      :class="!amenity.isActive && 'opacity-60'"
    >
      <div class="flex items-start gap-3">
        <span
          class="mt-1.5 size-3 shrink-0 rounded-full"
          :style="{ background: amenity.color ?? '#64748b' }"
          aria-hidden="true"
        />
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="text-lg font-semibold">{{ amenity.name }}</h2>
            <UiBadge v-if="!amenity.isActive" label="Inactiva" size="xs" />
          </div>
          <p class="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
            {{ scheduleLabel(amenity) }}
          </p>
          <dl class="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <dt class="text-neutral-500">Tarifa</dt>
            <dd class="font-medium">{{ feeLabel(amenity) }}</dd>
            <template v-if="amenity.bookingFee && Number(amenity.bookingFee) > 0">
              <dt class="text-neutral-500">Pago</dt>
              <dd>{{ AMENITY_PAYMENT_MODE_LABELS[amenity.paymentMode] }}</dd>
            </template>
            <template v-if="amenity.depositAmount">
              <dt class="text-neutral-500">Depósito</dt>
              <dd>{{ formatMoney(amenity.depositAmount) }}</dd>
            </template>
            <template v-if="amenity.allowExternal">
              <dt class="text-neutral-500">Terceros</dt>
              <dd>
                {{
                  feeLabel({
                    bookingFee: amenity.externalFee ?? amenity.bookingFee,
                    bookingMode: amenity.bookingMode,
                  })
                }}
              </dd>
            </template>
          </dl>
          <ul class="mt-3 flex flex-wrap gap-1.5">
            <li v-for="chip in chips(amenity)" :key="chip">
              <UiBadge :label="chip" size="xs" />
            </li>
          </ul>
        </div>
      </div>
      <div class="mt-4 flex justify-end gap-2 border-t border-neutral-100 pt-3 dark:border-white/8">
        <UiButton
          v-if="amenity.isActive"
          variant="ghost"
          size="sm"
          color="danger"
          @click="removing = amenity"
        >
          Retirar
        </UiButton>
        <UiButton variant="outline" size="sm" icon="mdi-pencil-outline" @click="edit(amenity)">
          Editar
        </UiButton>
      </div>
    </UiCard>
  </div>

  <AmenityFormModal v-model="formOpen" :amenity="editing" @saved="load" />
  <ConfirmDialog
    :model-value="!!removing"
    :title="`¿Retirar ${removing?.name}?`"
    message="Si tiene reservas queda inactiva (el historial se conserva); si no, se elimina. Las reservas futuras no se cancelan solas."
    confirm-label="Retirar"
    :loading="busy"
    @update:model-value="(value) => !value && (removing = null)"
    @confirm="remove"
  />
</template>
