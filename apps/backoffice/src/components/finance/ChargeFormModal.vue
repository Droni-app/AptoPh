<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  UiAlert,
  UiButton,
  UiForm,
  UiInput,
  UiLabel,
  UiModal,
  UiSelect,
  useToast,
} from '@aptoph/ui'
import { UNIT_TYPES, UNIT_TYPE_LABELS, type UnitType } from '@aptoph/shared'
import UnitPicker, { type PickedUnit } from '@/components/finance/UnitPicker.vue'
import { financeApi } from '@/api/finance'
import { unitsApi } from '@/api/backoffice'
import { useFinanceCatalog } from '@/composables/useFinanceCatalog'
import { errorMessage, fieldErrors } from '@/lib/errors'
import { formatMoney, parseAmount, thisMonthInput, todayInput } from '@/lib/format'

const props = defineProps<{ fixedUnit?: PickedUnit | null }>()
const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ saved: [] }>()
const toast = useToast()
const catalog = useFinanceCatalog()

const target = ref<'some' | 'type'>('some')
const units = ref<PickedUnit[]>([])
const unitType = ref<UnitType>('apartment')
const form = ref({
  conceptId: '',
  amount: '',
  period: thisMonthInput(),
  dueOn: todayInput(15),
  description: '',
})
const errors = ref<Record<string, string>>({})
const error = ref<string | null>(null)
const saving = ref(false)

const conceptOptions = computed(() => [
  { value: '', label: 'Selecciona un concepto' },
  ...catalog.activeConcepts.value
    .filter((concept) => concept.type !== 'interest')
    .map((concept) => ({ value: concept.id, label: concept.name })),
])
const typeOptions = UNIT_TYPES.map((value) => ({
  value,
  label: `Todas: ${UNIT_TYPE_LABELS[value].toLowerCase()}`,
}))

watch(open, async (isOpen) => {
  if (!isOpen) return
  await catalog.load()
  units.value = props.fixedUnit ? [props.fixedUnit] : []
  target.value = 'some'
  form.value = {
    conceptId: '',
    amount: '',
    period: thisMonthInput(),
    dueOn: todayInput(15),
    description: '',
  }
  errors.value = {}
  error.value = null
})

watch(
  () => form.value.conceptId,
  (id) => {
    const concept = catalog.concepts.value.find((row) => row.id === id)
    if (concept?.defaultAmount && !form.value.amount)
      form.value.amount = String(Number(concept.defaultAmount))
  },
)

const amount = computed(() => parseAmount(form.value.amount))

/** Every unit of a type (paged: the API returns 100 per page) */
async function unitsOfType(type: UnitType) {
  const ids: string[] = []
  for (let page = 1; page < 100; page++) {
    const result = await unitsApi.list({ type, page, perPage: 100 })
    ids.push(...result.data.map((unit) => unit.id))
    if (page >= result.metadata.lastPage) break
  }
  return ids
}

async function submit() {
  saving.value = true
  errors.value = {}
  error.value = null
  try {
    const unitIds =
      target.value === 'type'
        ? await unitsOfType(unitType.value)
        : units.value.map((unit) => unit.id)
    if (unitIds.length === 0) {
      errors.value = { unitIds: 'Elige al menos una unidad' }
      return
    }
    const { data } = await financeApi.createCharges({
      unitIds,
      conceptId: form.value.conceptId,
      amount: amount.value,
      period: form.value.period,
      dueOn: form.value.dueOn,
      description: form.value.description || null,
    })
    toast.success(`Se crearon ${data.created} cobros por ${formatMoney(data.total)}`)
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
    title="Nuevo cobro"
    description="Multas, cuotas extraordinarias, servicios y otros cobros puntuales"
    size="md"
    :persistent="saving"
  >
    <UiForm :loading="saving" @submit="submit">
      <UiAlert v-if="error" color="danger" variant="soft">{{ error }}</UiAlert>
      <UiLabel title="Concepto" required :error="errors.conceptId">
        <UiSelect v-model="form.conceptId" :options="conceptOptions" block />
      </UiLabel>

      <UiLabel title="A quién" required :error="errors.unitIds">
        <div class="flex flex-col gap-2">
          <div class="flex gap-4 text-sm">
            <label class="flex items-center gap-1.5"
              ><input v-model="target" type="radio" value="some" /> Unidades específicas</label
            >
            <label class="flex items-center gap-1.5"
              ><input v-model="target" type="radio" value="type" /> Todas las de un tipo</label
            >
          </div>
          <template v-if="target === 'some'">
            <UnitPicker :exclude="units.map((unit) => unit.id)" @pick="units.push($event)" />
            <ul v-if="units.length" class="flex flex-wrap gap-1.5">
              <li
                v-for="(unit, i) in units"
                :key="unit.id"
                class="flex items-center gap-1 rounded-full bg-mint-50 py-0.5 pr-1 pl-2.5 text-xs font-medium text-mint-800 dark:bg-mint-400/15 dark:text-mint-200"
              >
                {{ unit.label }}
                <button
                  type="button"
                  class="grid size-5 place-items-center rounded-full hover:bg-mint-100 dark:hover:bg-white/10"
                  :aria-label="`Quitar ${unit.label}`"
                  @click="units.splice(i, 1)"
                >
                  <i class="mdi mdi-close" aria-hidden="true" />
                </button>
              </li>
            </ul>
          </template>
          <UiSelect v-else v-model="unitType" :options="typeOptions" block />
        </div>
      </UiLabel>

      <div class="grid gap-4 sm:grid-cols-2">
        <UiLabel title="Valor por unidad" required :error="errors.amount">
          <UiInput v-model="form.amount" inputmode="decimal" required placeholder="150.000" />
        </UiLabel>
        <UiLabel title="Mes del cobro" :error="errors.period">
          <UiInput v-model="form.period" type="month" required />
        </UiLabel>
        <UiLabel title="Vence" required :error="errors.dueOn">
          <UiInput v-model="form.dueOn" type="date" required />
        </UiLabel>
      </div>
      <UiLabel
        title="Detalle"
        help-text="Aparece en el estado de cuenta del residente"
        :error="errors.description"
      >
        <UiInput
          v-model="form.description"
          maxlength="255"
          placeholder="Cuota 1 de 4 · pintura de fachada"
        />
      </UiLabel>
      <template #footer>
        <div class="flex w-full items-center justify-between gap-2">
          <span class="text-sm text-neutral-500">
            <template v-if="target === 'some' && units.length > 1 && amount > 0">
              Total {{ formatMoney(amount * units.length) }}
            </template>
          </span>
          <div class="flex gap-2">
            <UiButton variant="ghost" :disabled="saving" @click="open = false">Cancelar</UiButton>
            <UiButton type="submit" color="primary" :loading="saving">Crear cobro</UiButton>
          </div>
        </div>
      </template>
    </UiForm>
  </UiModal>
</template>
