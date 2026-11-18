<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  DuiAlert,
  DuiButton,
  DuiForm,
  DuiInput,
  DuiLabel,
  DuiModal,
  DuiSelect,
  useToast,
} from '@dronico/droni-kit'
import UnitPicker, { type PickedUnit } from '@/components/finance/UnitPicker.vue'
import { financeApi } from '@/api/finance'
import { useFinanceCatalog } from '@/composables/useFinanceCatalog'
import { errorMessage, fieldErrors } from '@/lib/errors'
import { addMonthsInput, parseAmount, thisMonthInput } from '@/lib/format'

const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ saved: [] }>()
const toast = useToast()
const catalog = useFinanceCatalog()

const unit = ref<PickedUnit | null>(null)
const form = ref({ conceptId: '', amount: '', description: '', startsOn: '', endsOn: '' })
const errors = ref<Record<string, string>>({})
const error = ref<string | null>(null)
const saving = ref(false)

watch(open, async (isOpen) => {
  if (!isOpen) return
  await catalog.load()
  unit.value = null
  form.value = {
    conceptId: '',
    amount: '',
    description: '',
    startsOn: addMonthsInput(thisMonthInput(), 1),
    endsOn: '',
  }
  errors.value = {}
  error.value = null
})

const conceptOptions = computed(() => [
  { value: '', label: 'Selecciona un concepto' },
  ...catalog.activeConcepts.value
    .filter((concept) => concept.type !== 'interest')
    .map((concept) => ({ value: concept.id, label: concept.name })),
])

async function submit() {
  if (!unit.value) {
    errors.value = { unitId: 'Elige la unidad' }
    return
  }
  saving.value = true
  errors.value = {}
  error.value = null
  try {
    await financeApi.createRecurring({
      unitId: unit.value.id,
      conceptId: form.value.conceptId,
      amount: parseAmount(form.value.amount),
      description: form.value.description || null,
      startsOn: form.value.startsOn,
      endsOn: form.value.endsOn || null,
    })
    toast.success('Tarifa guardada')
    emit('saved')
    open.value = false
  } catch (e) {
    errors.value = fieldErrors(e)
    error.value = Object.keys(errors.value).length ? null : errorMessage(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <DuiModal
    v-model="open"
    title="Tarifa de una unidad"
    description="Un cobro que se repite cada mes: parqueadero asignado, cuota pactada, cuota extraordinaria a plazos…"
    size="md"
    :persistent="saving"
  >
    <DuiForm :loading="saving" @submit="submit">
      <DuiAlert v-if="error" color="danger" variant="soft">{{ error }}</DuiAlert>
      <DuiLabel title="Unidad" required :error="errors.unitId">
        <div
          v-if="unit"
          class="flex items-center justify-between rounded-lg bg-mint-50 px-3 py-2 text-sm dark:bg-mint-400/10"
        >
          <span class="font-medium">{{ unit.label }}</span>
          <button type="button" class="text-neutral-500 underline" @click="unit = null">
            Cambiar
          </button>
        </div>
        <UnitPicker v-else @pick="unit = $event" />
      </DuiLabel>
      <DuiLabel title="Concepto" required :error="errors.conceptId">
        <DuiSelect v-model="form.conceptId" :options="conceptOptions" block />
      </DuiLabel>
      <div class="grid gap-4 sm:grid-cols-3">
        <DuiLabel title="Valor mensual" required :error="errors.amount">
          <DuiInput v-model="form.amount" inputmode="decimal" required />
        </DuiLabel>
        <DuiLabel title="Desde" required :error="errors.startsOn">
          <DuiInput v-model="form.startsOn" type="month" required />
        </DuiLabel>
        <DuiLabel title="Hasta" help-text="Vacío: indefinido" :error="errors.endsOn">
          <DuiInput v-model="form.endsOn" type="month" />
        </DuiLabel>
      </div>
      <DuiLabel title="Detalle" :error="errors.description">
        <DuiInput
          v-model="form.description"
          maxlength="255"
          placeholder="Parqueadero cubierto S-14"
        />
      </DuiLabel>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <DuiButton variant="ghost" :disabled="saving" @click="open = false">Cancelar</DuiButton>
          <DuiButton type="submit" color="primary" :loading="saving">Guardar</DuiButton>
        </div>
      </template>
    </DuiForm>
  </DuiModal>
</template>
