<script setup lang="ts">
import { ref, watch } from 'vue'
import { DuiAlert, DuiButton, DuiForm, DuiInput, DuiLabel, DuiModal, DuiSelect } from '@dronico/droni-kit'
import { VISIT_TYPES, VISIT_TYPE_LABELS, type ResidentVisit, type VisitType } from '@aptoph/shared'
import UnitPicker from '@/components/UnitPicker.vue'
import { residentApi } from '@/api/resident'
import { useSubmit } from '@/composables/useSubmit'
import { todayInput, toIsoInstant } from '@/lib/format'
import { useUnitsStore } from '@/stores/units'

const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ saved: [visit: ResidentVisit] }>()

const units = useUnitsStore()
const { saving, errors, error, run, reset } = useSubmit()
const typeOptions = VISIT_TYPES.map((value) => ({ value, label: VISIT_TYPE_LABELS[value] }))

/** Next full hour, as the default arrival time */
function nextHour() {
  const date = new Date()
  date.setHours(date.getHours() + 1, 0, 0, 0)
  return {
    date: todayInput(date.getDate() === new Date().getDate() ? 0 : 1),
    time: `${String(date.getHours()).padStart(2, '0')}:00`,
  }
}

const empty = () => ({
  unitId: units.home?.units[0]?.id ?? '',
  visitorName: '',
  visitorDocument: '',
  vehiclePlate: '',
  type: 'guest' as VisitType,
  ...nextHour(),
})
const form = ref(empty())

watch(open, async (isOpen) => {
  if (!isOpen) return
  await units.load()
  form.value = empty()
  reset()
})

async function submit() {
  const f = form.value
  let created: ResidentVisit | null = null
  const ok = await run(async () => {
    const { data } = await residentApi.visits.create({
      unitId: f.unitId,
      visitorName: f.visitorName,
      visitorDocument: f.visitorDocument || null,
      vehiclePlate: f.vehiclePlate || null,
      type: f.type,
      expectedAt: toIsoInstant(f.date, f.time),
    })
    created = data
  }, 'Visita autorizada')
  if (ok && created) {
    emit('saved', created)
    open.value = false
  }
}
</script>

<template>
  <DuiModal
    v-model="open"
    title="Autorizar visita"
    description="Portería recibirá el nombre del visitante y un código de acceso."
    :persistent="saving"
  >
    <DuiForm :loading="saving" @submit="submit">
      <DuiAlert v-if="error" color="danger" variant="soft">{{ error }}</DuiAlert>
      <div class="grid gap-4 sm:grid-cols-2">
        <div class="sm:col-span-2 empty:hidden"><UnitPicker v-model="form.unitId" :error="errors.unitId" /></div>
        <DuiLabel title="Nombre del visitante" required :error="errors.visitorName" class="sm:col-span-2">
          <DuiInput v-model="form.visitorName" required minlength="2" maxlength="150" />
        </DuiLabel>
        <DuiLabel title="Tipo de visita" required :error="errors.type">
          <DuiSelect v-model="form.type" :options="typeOptions" />
        </DuiLabel>
        <DuiLabel title="Documento" :error="errors.visitorDocument">
          <DuiInput v-model="form.visitorDocument" maxlength="30" />
        </DuiLabel>
        <DuiLabel title="Fecha" required :error="errors.expectedAt">
          <DuiInput v-model="form.date" type="date" required :min="todayInput()" :max="todayInput(60)" />
        </DuiLabel>
        <DuiLabel title="Hora aproximada" required>
          <DuiInput v-model="form.time" type="time" required />
        </DuiLabel>
        <DuiLabel title="Placa del vehículo" :error="errors.vehiclePlate" class="sm:col-span-2">
          <DuiInput v-model="form.vehiclePlate" maxlength="12" class="uppercase" placeholder="Si llega en carro o moto" />
        </DuiLabel>
      </div>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <DuiButton variant="ghost" :disabled="saving" @click="open = false">Cancelar</DuiButton>
          <DuiButton type="submit" color="primary" :loading="saving">Autorizar</DuiButton>
        </div>
      </template>
    </DuiForm>
  </DuiModal>
</template>
