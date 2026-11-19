<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  DuiAlert,
  DuiButton,
  DuiForm,
  DuiInput,
  DuiLabel,
  DuiModal,
  useToast,
} from '@dronico/droni-kit'
import AccountSelect from '@/components/finance/AccountSelect.vue'
import UnitPicker, { type PickedUnit } from '@/components/finance/UnitPicker.vue'
import { financeApi } from '@/api/finance'
import AttachmentPicker from '@/components/attachments/AttachmentPicker.vue'
import { uploadAttachments, warnFailedUploads } from '@/lib/attachments'
import { useFinanceCatalog } from '@/composables/useFinanceCatalog'
import { errorMessage, fieldErrors } from '@/lib/errors'
import { formatMoney, parseAmount, todayInput } from '@/lib/format'

const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ saved: [] }>()
const toast = useToast()
const catalog = useFinanceCatalog()

type Line = {
  accountId: string
  debit: string
  credit: string
  description: string
  unit: PickedUnit | null
}
const blank = (): Line => ({ accountId: '', debit: '', credit: '', description: '', unit: null })
const date = ref(todayInput())
const description = ref('')
const lines = ref<Line[]>([])
const errors = ref<Record<string, string>>({})
const error = ref<string | null>(null)
const saving = ref(false)
/** Supports picked before saving, uploaded once the record exists */
const files = ref<File[]>([])
watch(open, (isOpen) => {
  if (isOpen) files.value = []
})

watch(open, async (isOpen) => {
  if (!isOpen) return
  await catalog.load()
  date.value = todayInput()
  description.value = ''
  lines.value = [blank(), blank()]
  errors.value = {}
  error.value = null
})

const debit = computed(() =>
  lines.value.reduce((sum, line) => sum + (parseAmount(line.debit) || 0), 0),
)
const credit = computed(() =>
  lines.value.reduce((sum, line) => sum + (parseAmount(line.credit) || 0), 0),
)
const difference = computed(() => Math.round((debit.value - credit.value) * 100) / 100)
/** Receivable accounts (13…) and credit balances (2805…) need the unit as third party */
const needsUnit = (accountId: string) => {
  const code = catalog.accounts.value.find((a) => a.id === accountId)?.code ?? ''
  return code.startsWith('13') || code.startsWith('2805')
}

async function submit() {
  saving.value = true
  errors.value = {}
  error.value = null
  try {
    const { data } = await financeApi.createEntry({
      date: date.value,
      description: description.value,
      lines: lines.value
        .filter((line) => line.accountId)
        .map((line) => ({
          accountId: line.accountId,
          debit: parseAmount(line.debit) || 0,
          credit: parseAmount(line.credit) || 0,
          unitId: line.unit?.id ?? null,
          description: line.description || null,
        })),
    })
    const failed = await uploadAttachments('journal_entry', data.id, files.value)
    toast.success(`Nota de contabilidad ${data.number} registrada`)
    warnFailedUploads(toast, failed)
    emit('saved')
    open.value = false
  } catch (e) {
    errors.value = fieldErrors(e)
    error.value = errorMessage(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <DuiModal
    v-model="open"
    title="Nota de contabilidad"
    description="Ajustes, depreciaciones, provisiones, causación de intereses bancarios…"
    size="xl"
    :persistent="saving"
    scrollable
  >
    <DuiForm :loading="saving" @submit="submit">
      <DuiAlert v-if="error" color="danger" variant="soft">{{ error }}</DuiAlert>
      <div class="grid gap-4 sm:grid-cols-[10rem_minmax(0,1fr)]">
        <DuiLabel title="Fecha" required :error="errors.date">
          <DuiInput v-model="date" type="date" required />
        </DuiLabel>
        <DuiLabel title="Descripción" required :error="errors.description">
          <DuiInput
            v-model="description"
            maxlength="255"
            required
            placeholder="Gastos bancarios de noviembre"
          />
        </DuiLabel>
      </div>
      <div class="flex flex-col gap-3">
        <div
          v-for="(line, i) in lines"
          :key="i"
          class="grid gap-2 rounded-lg p-2 ring-1 ring-neutral-200 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_8rem_8rem_2rem] dark:ring-white/10"
        >
          <AccountSelect v-model="line.accountId" :aria-label="`Cuenta de la línea ${i + 1}`" />
          <DuiInput
            v-model="line.description"
            maxlength="255"
            placeholder="Detalle"
            :aria-label="`Detalle de la línea ${i + 1}`"
          />
          <DuiInput
            v-model="line.debit"
            inputmode="decimal"
            placeholder="Débito"
            :aria-label="`Débito de la línea ${i + 1}`"
            @input="line.credit = ''"
          />
          <DuiInput
            v-model="line.credit"
            inputmode="decimal"
            placeholder="Crédito"
            :aria-label="`Crédito de la línea ${i + 1}`"
            @input="line.debit = ''"
          />
          <button
            v-if="lines.length > 2"
            type="button"
            class="text-neutral-400 hover:text-coral-600"
            :aria-label="`Quitar línea ${i + 1}`"
            @click="lines.splice(i, 1)"
          >
            <i class="mdi mdi-close" aria-hidden="true" />
          </button>
          <div v-if="needsUnit(line.accountId)" class="sm:col-span-4">
            <div v-if="line.unit" class="flex items-center gap-2 text-sm">
              Tercero: <strong>{{ line.unit.label }}</strong>
              <button type="button" class="text-neutral-500 underline" @click="line.unit = null">
                Cambiar
              </button>
            </div>
            <UnitPicker v-else placeholder="Unidad (tercero)" @pick="line.unit = $event" />
          </div>
        </div>
        <button
          type="button"
          class="self-start text-sm font-semibold text-mint-700 dark:text-mint-300"
          @click="lines.push(blank())"
        >
          + Agregar línea
        </button>
        <p v-if="errors.lines" class="text-sm text-coral-700">{{ errors.lines }}</p>
      </div>
      <dl class="grid grid-cols-3 gap-3 rounded-xl bg-neutral-50 p-4 text-sm dark:bg-white/5">
        <div>
          <dt class="text-neutral-500">Débitos</dt>
          <dd class="font-semibold tabular-nums">{{ formatMoney(debit) }}</dd>
        </div>
        <div>
          <dt class="text-neutral-500">Créditos</dt>
          <dd class="font-semibold tabular-nums">{{ formatMoney(credit) }}</dd>
        </div>
        <div>
          <dt class="text-neutral-500">Diferencia</dt>
          <dd
            class="font-semibold tabular-nums"
            :class="
              difference === 0
                ? 'text-mint-700 dark:text-mint-300'
                : 'text-coral-700 dark:text-coral-300'
            "
          >
            {{ difference === 0 ? 'Cuadrado' : formatMoney(difference) }}
          </dd>
        </div>
      </dl>
      <AttachmentPicker v-model="files" :disabled="saving" />
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <DuiButton variant="ghost" :disabled="saving" @click="open = false">Cancelar</DuiButton>
          <DuiButton
            type="submit"
            color="primary"
            :loading="saving"
            :disabled="difference !== 0 || debit === 0"
            >Registrar</DuiButton
          >
        </div>
      </template>
    </DuiForm>
  </DuiModal>
</template>
