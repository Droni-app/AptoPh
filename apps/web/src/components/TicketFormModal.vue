<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  DuiAlert,
  DuiButton,
  DuiForm,
  DuiInput,
  DuiLabel,
  DuiModal,
  DuiSelect,
  DuiTextarea,
} from '@dronico/droni-kit'
import {
  TICKET_TYPES,
  TICKET_TYPE_LABELS,
  type ResidentTicketDetail,
  type TicketType,
} from '@aptoph/shared'
import UnitPicker from '@/components/UnitPicker.vue'
import { residentApi } from '@/api/resident'
import { useSubmit } from '@/composables/useSubmit'
import { useUnitsStore } from '@/stores/units'

const props = defineProps<{ unitId?: string | null }>()
const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ saved: [ticket: ResidentTicketDetail] }>()

const units = useUnitsStore()
const { saving, errors, error, run, reset } = useSubmit()
const HINTS: Record<TicketType, string> = {
  petition:
    'Solicita información, documentos (p. ej. paz y salvo) o una actuación de la administración.',
  complaint: 'Manifiesta tu inconformidad con una situación o con la atención recibida.',
  claim: 'Pide que se corrija algo, por ejemplo un cobro que no corresponde.',
  suggestion: 'Propón una mejora para el conjunto.',
  maintenance: 'Reporta un daño en tu unidad o en las zonas comunes.',
}
const typeOptions = TICKET_TYPES.map((value) => ({ value, label: TICKET_TYPE_LABELS[value] }))

const empty = () => ({
  unitId: props.unitId ?? units.home?.units[0]?.id ?? '',
  type: 'petition' as TicketType,
  subject: '',
  description: '',
})
const form = ref(empty())

watch(open, async (isOpen) => {
  if (!isOpen) return
  await units.load()
  form.value = empty()
  reset()
})

async function submit() {
  let created: ResidentTicketDetail | null = null
  const ok = await run(async () => {
    const { data } = await residentApi.tickets.create({
      ...form.value,
      unitId: form.value.unitId || null,
    })
    created = data
  }, 'Solicitud radicada')
  if (ok && created) {
    emit('saved', created)
    open.value = false
  }
}
</script>

<template>
  <DuiModal v-model="open" title="Radicar PQRS" size="lg" :persistent="saving">
    <DuiForm :loading="saving" @submit="submit">
      <DuiAlert v-if="error" color="danger" variant="soft">{{ error }}</DuiAlert>
      <div class="grid gap-4 sm:grid-cols-2">
        <DuiLabel title="Tipo de solicitud" required :error="errors.type">
          <DuiSelect v-model="form.type" :options="typeOptions" />
        </DuiLabel>
        <UnitPicker
          v-model="form.unitId"
          optional
          optional-label="Zonas comunes / general"
          :error="errors.unitId"
        />
        <p class="text-xs text-neutral-500 sm:col-span-2 dark:text-neutral-300">
          {{ HINTS[form.type] }}
        </p>
        <DuiLabel title="Asunto" required :error="errors.subject" class="sm:col-span-2">
          <DuiInput v-model="form.subject" required minlength="5" maxlength="200" />
        </DuiLabel>
        <DuiLabel title="Descripción" required :error="errors.description" class="sm:col-span-2">
          <DuiTextarea
            v-model="form.description"
            required
            minlength="10"
            maxlength="5000"
            rows="6"
            autoheight
          />
        </DuiLabel>
      </div>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <DuiButton variant="ghost" :disabled="saving" @click="open = false">Cancelar</DuiButton>
          <DuiButton type="submit" color="primary" :loading="saving">Radicar</DuiButton>
        </div>
      </template>
    </DuiForm>
  </DuiModal>
</template>
