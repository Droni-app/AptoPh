<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  UiAlert,
  UiButton,
  UiForm,
  UiInput,
  UiLabel,
  UiModal,
  UiRadio,
  UiSelect,
  UiTextarea,
  useToast,
} from '@aptoph/ui'
import {
  PARKING_MANUAL_END_REASONS,
  PARKING_END_REASON_LABELS,
  type ParkingAssignment,
  type ParkingEndReason,
} from '@aptoph/shared'
import { parkingApi } from '@/api/parking'
import { errorMessage, fieldErrors } from '@/lib/errors'
import { formatDate, formatMoney, formatPeriod } from '@/lib/format'

const props = defineProps<{ assignment: ParkingAssignment | null }>()
const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ saved: [] }>()
const toast = useToast()

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
const form = ref({
  status: 'cancelled' as 'cancelled' | 'rejected',
  reason: 'unused' as ParkingEndReason,
  note: '',
  endedOn: today(),
})
const errors = ref<Record<string, string>>({})
const error = ref<string | null>(null)
const saving = ref(false)

watch(open, (isOpen) => {
  if (!isOpen || !props.assignment) return
  const notStarted = props.assignment.startsOn > today()
  form.value = {
    status: notStarted ? 'rejected' : 'cancelled',
    reason: 'unused',
    note: '',
    endedOn: notStarted ? props.assignment.startsOn : today(),
  }
  errors.value = {}
  error.value = null
})

const statusOptions = [
  {
    value: 'cancelled',
    label: 'Cancelar',
    description: 'Se quita durante el periodo: se cobra hasta el último día de uso.',
  },
  {
    value: 'rejected',
    label: 'Rechazar',
    description: 'Nunca se usó (la unidad no lo aceptó o no cumplía): no se cobra nada.',
  },
]
const reasonOptions = PARKING_MANUAL_END_REASONS.map((value) => ({
  value,
  label: PARKING_END_REASON_LABELS[value],
}))
const unitLabel = computed(() => {
  const unit = props.assignment?.unit
  return unit ? [unit.building?.name, unit.code].filter(Boolean).join(' · ') : ''
})

async function submit() {
  if (!props.assignment) return
  saving.value = true
  errors.value = {}
  error.value = null
  try {
    const result = await parkingApi.endAssignment(props.assignment.id, {
      status: form.value.status,
      reason: form.value.reason,
      note: form.value.note,
      endedOn: form.value.status === 'cancelled' ? form.value.endedOn : undefined,
    })
    const credited = result.credited / 100
    toast.success(
      `Asignación ${form.value.status === 'cancelled' ? 'cancelada' : 'rechazada'}${credited ? `. Se descontaron ${formatMoney(credited)} de lo ya facturado` : ''}`,
    )
    if (result.offeredTo) {
      toast.info('El cupo se ofreció al siguiente de la lista de espera del sorteo.')
    }
    if (result.paidPeriods.length) {
      toast.warning(
        `La unidad ya pagó ${result.paidPeriods.map(formatPeriod).join(', ')}: registra el saldo a favor en Cartera si corresponde.`,
      )
    }
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
  <UiModal
    v-model="open"
    :title="assignment ? `Terminar ${assignment.spot.code}` : 'Terminar asignación'"
    :persistent="saving"
  >
    <UiForm v-if="assignment" :loading="saving" @submit="submit">
      <p class="text-sm text-neutral-500">
        Asignado a
        <span class="font-medium text-neutral-700 dark:text-neutral-200">{{ unitLabel }}</span>
        desde el {{ formatDate(assignment.startsOn) }}.
      </p>
      <UiAlert v-if="error" color="danger" variant="soft">{{ error }}</UiAlert>
      <UiRadio v-model="form.status" :options="statusOptions" name="endStatus" />
      <div class="grid gap-4 sm:grid-cols-2">
        <UiLabel title="Motivo" required :error="errors.reason">
          <UiSelect v-model="form.reason" :options="reasonOptions" block />
        </UiLabel>
        <UiLabel
          v-if="form.status === 'cancelled'"
          title="Último día de uso"
          required
          :error="errors.endedOn"
        >
          <UiInput
            v-model="form.endedOn"
            type="date"
            required
            :min="assignment.startsOn"
            :max="assignment.endsOn ?? undefined"
          />
        </UiLabel>
      </div>
      <UiLabel title="Detalle" required :error="errors.note">
        <UiTextarea
          v-model="form.note"
          rows="3"
          maxlength="500"
          required
          block
          placeholder="Queda en el historial de la asignación"
        />
      </UiLabel>
      <p class="text-xs text-neutral-500">
        El cupo queda libre. Si ya se facturó el mes, se descuentan los días que no lo usará.
      </p>

      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UiButton variant="ghost" :disabled="saving" @click="open = false">Volver</UiButton>
          <UiButton type="submit" color="danger" :loading="saving">
            {{ form.status === 'cancelled' ? 'Cancelar asignación' : 'Rechazar asignación' }}
          </UiButton>
        </div>
      </template>
    </UiForm>
  </UiModal>
</template>
