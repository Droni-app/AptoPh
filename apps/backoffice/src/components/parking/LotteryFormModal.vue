<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  UiAlert,
  UiButton,
  UiForm,
  UiInput,
  UiLabel,
  UiModal,
  UiSwitch,
  UiTextarea,
  useToast,
} from '@aptoph/ui'
import type { ParkingLottery } from '@aptoph/shared'
import { parkingApi } from '@/api/parking'
import { errorMessage, fieldErrors } from '@/lib/errors'
import { addMonthsInput, formatDate, todayInput } from '@/lib/format'

const props = defineProps<{ lottery?: ParkingLottery | null; lotteryMonths: number }>()
const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ saved: [lottery: ParkingLottery] }>()
const toast = useToast()

const nextMonth = () => `${addMonthsInput(todayInput().slice(0, 7), 1)}-01`
/** datetime-local value (Bogotá) of an ISO instant */
const localInput = (iso: string) =>
  new Date(iso)
    .toLocaleString('sv-SE', { timeZone: 'America/Bogota' })
    .slice(0, 16)
    .replace(' ', 'T')

const empty = () => ({
  title: '',
  closesAt: `${todayInput(14)}T18:00`,
  periodStartsOn: nextMonth(),
  periodEndsOn: '',
  notes: '',
  notify: true,
})
const form = ref(empty())
const errors = ref<Record<string, string>>({})
const error = ref<string | null>(null)
const saving = ref(false)

watch(open, (isOpen) => {
  if (!isOpen) return
  const lottery = props.lottery
  form.value = lottery
    ? {
        title: lottery.title,
        closesAt: localInput(lottery.closesAt),
        periodStartsOn: lottery.periodStartsOn,
        periodEndsOn: lottery.periodEndsOn,
        notes: lottery.notes ?? '',
        notify: false,
      }
    : empty()
  errors.value = {}
  error.value = null
})

/** Default end: the lottery period of the settings */
const defaultEnd = computed(() => {
  const start = form.value.periodStartsOn
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return null
  const date = new Date(`${start}T12:00:00`)
  date.setMonth(date.getMonth() + props.lotteryMonths)
  date.setDate(date.getDate() - 1)
  return date.toISOString().slice(0, 10)
})

async function submit() {
  saving.value = true
  errors.value = {}
  error.value = null
  const f = form.value
  const body = {
    title: f.title,
    // Bogotá has no daylight saving time
    closesAt: `${f.closesAt}:00-05:00`,
    periodStartsOn: f.periodStartsOn,
    periodEndsOn: f.periodEndsOn || null,
    notes: f.notes || null,
  }
  try {
    if (props.lottery) {
      const { data } = await parkingApi.updateLottery(props.lottery.id, body)
      toast.success('Sorteo actualizado')
      emit('saved', data)
    } else {
      const { data, warning } = await parkingApi.createLottery({ ...body, notify: f.notify })
      toast.success(
        data.notifiedCount
          ? `Postulaciones abiertas. Se avisó a ${data.notifiedCount} residentes`
          : 'Postulaciones abiertas',
      )
      if (warning) toast.warning(warning)
      emit('saved', data)
    }
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
    :title="lottery ? `Sorteo #${lottery.number}` : 'Abrir sorteo de parqueaderos'"
    :persistent="saving"
  >
    <UiForm :loading="saving" @submit="submit">
      <UiAlert v-if="error" color="danger" variant="soft">{{ error }}</UiAlert>
      <UiLabel title="Nombre" required :error="errors.title">
        <UiInput
          v-model="form.title"
          required
          maxlength="120"
          placeholder="Sorteo primer semestre 2027"
          autofocus
        />
      </UiLabel>
      <UiLabel
        title="Cierre de postulaciones"
        required
        help-text="Hasta esta hora los residentes se postulan en el portal. Después haces el sorteo."
        :error="errors.closesAt"
      >
        <UiInput v-model="form.closesAt" type="datetime-local" required />
      </UiLabel>
      <div class="grid gap-4 sm:grid-cols-2">
        <UiLabel title="Inicio del periodo" required :error="errors.periodStartsOn">
          <UiInput v-model="form.periodStartsOn" type="date" required />
        </UiLabel>
        <UiLabel
          title="Fin del periodo"
          :help-text="
            defaultEnd
              ? `Vacío: ${formatDate(defaultEnd)} (${lotteryMonths} meses)`
              : `Vacío: ${lotteryMonths} meses`
          "
          :error="errors.periodEndsOn"
        >
          <UiInput v-model="form.periodEndsOn" type="date" />
        </UiLabel>
      </div>
      <UiLabel
        title="Notas para los residentes"
        help-text="Reglas, horarios o lo que deban saber. Se muestra en el portal y en el aviso."
        :error="errors.notes"
      >
        <UiTextarea v-model="form.notes" rows="3" maxlength="2000" block />
      </UiLabel>
      <UiSwitch
        v-if="!lottery"
        v-model="form.notify"
        label="Avisar a los residentes por correo"
        description="Un correo a cada residente con cuenta. Usa el cupo mensual de correos."
      />
      <p class="text-sm text-neutral-500">
        Al sortear, los cupos comunales vigentes terminan el día antes del inicio del periodo y se
        reparten de nuevo.
      </p>

      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UiButton variant="ghost" :disabled="saving" @click="open = false">Cancelar</UiButton>
          <UiButton type="submit" color="primary" :loading="saving">
            {{ lottery ? 'Guardar' : 'Abrir postulaciones' }}
          </UiButton>
        </div>
      </template>
    </UiForm>
  </UiModal>
</template>
