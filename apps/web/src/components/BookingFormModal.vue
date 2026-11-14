<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { DuiAlert, DuiButton, DuiForm, DuiInput, DuiLabel, DuiModal, DuiSelect } from '@dronico/droni-kit'
import type { ResidentAmenity, ResidentBooking } from '@apartadock/shared'
import UnitPicker from '@/components/UnitPicker.vue'
import { residentApi } from '@/api/resident'
import { useSubmit } from '@/composables/useSubmit'
import { describeRules } from '@/lib/amenities'
import { formatMoney, todayInput, toIsoInstant } from '@/lib/format'
import { useTenantStore } from '@/stores/tenant'
import { useUnitsStore } from '@/stores/units'

const props = defineProps<{ amenities: ResidentAmenity[]; amenityId?: string | null }>()
const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ saved: [booking: ResidentBooking] }>()

const units = useUnitsStore()
const tenant = useTenantStore()
const { saving, errors, error, run, reset } = useSubmit()

const empty = () => ({
  amenityId: props.amenityId ?? props.amenities[0]?.id ?? '',
  unitId: units.home?.units[0]?.id ?? '',
  date: todayInput(1),
  start: '10:00',
  end: '12:00',
  guests: '',
})
const form = ref(empty())
const amenity = computed(() => props.amenities.find((a) => a.id === form.value.amenityId) ?? null)
const amenityOptions = computed(() => props.amenities.map((a) => ({ value: a.id, label: a.name })))

watch(open, async (isOpen) => {
  if (!isOpen) return
  await units.load()
  form.value = empty()
  reset()
})

async function submit() {
  const f = form.value
  let created: ResidentBooking | null = null
  const ok = await run(async () => {
    const { data } = await residentApi.bookings.create({
      amenityId: f.amenityId,
      unitId: f.unitId,
      startsAt: toIsoInstant(f.date, f.start),
      endsAt: toIsoInstant(f.date, f.end),
      guestsCount: f.guests ? Number(f.guests) : null,
    })
    created = data
  })
  if (ok && created) {
    emit('saved', created)
    open.value = false
  }
}
</script>

<template>
  <DuiModal v-model="open" title="Reservar zona común" :persistent="saving">
    <DuiForm :loading="saving" @submit="submit">
      <DuiAlert v-if="error" color="danger" variant="soft">{{ error }}</DuiAlert>
      <div class="grid gap-4 sm:grid-cols-2">
        <DuiLabel title="Zona común" required :error="errors.amenityId" class="sm:col-span-2">
          <DuiSelect v-model="form.amenityId" :options="amenityOptions" />
        </DuiLabel>
        <div
          v-if="amenity"
          class="rounded-xl bg-navy-50 p-3 text-sm text-navy-600 sm:col-span-2 dark:bg-white/5 dark:text-navy-200"
        >
          <p v-if="amenity.description">{{ amenity.description }}</p>
          <p class="mt-1 text-xs">
            {{ [describeRules(amenity.rules), amenity.capacity ? `aforo ${amenity.capacity}` : ''].filter(Boolean).join(' · ') }}
          </p>
          <p class="mt-1 text-xs font-medium">
            {{ amenity.bookingFee ? `Tarifa ${formatMoney(amenity.bookingFee, tenant.current?.currency)}` : 'Sin costo' }}
            · {{ amenity.requiresApproval ? 'la administración debe aprobarla' : 'se confirma al instante' }}
          </p>
        </div>
        <div class="sm:col-span-2 empty:hidden"><UnitPicker v-model="form.unitId" :error="errors.unitId" /></div>
        <DuiLabel title="Fecha" required :error="errors.startsAt" class="sm:col-span-2">
          <DuiInput v-model="form.date" type="date" required :min="todayInput()" :max="todayInput(90)" />
        </DuiLabel>
        <DuiLabel title="Desde" required>
          <DuiInput v-model="form.start" type="time" required />
        </DuiLabel>
        <DuiLabel title="Hasta" required :error="errors.endsAt">
          <DuiInput v-model="form.end" type="time" required />
        </DuiLabel>
        <DuiLabel title="Número de personas" :error="errors.guestsCount" class="sm:col-span-2">
          <DuiInput v-model="form.guests" type="number" min="1" :max="amenity?.capacity ?? 500" />
        </DuiLabel>
      </div>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <DuiButton variant="ghost" :disabled="saving" @click="open = false">Cancelar</DuiButton>
          <DuiButton type="submit" color="primary" :loading="saving">
            {{ amenity?.requiresApproval ? 'Solicitar reserva' : 'Reservar' }}
          </DuiButton>
        </div>
      </template>
    </DuiForm>
  </DuiModal>
</template>
