<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  DuiAlert,
  DuiButton,
  DuiCheckbox,
  DuiForm,
  DuiInput,
  DuiLabel,
  DuiModal,
  DuiSelect,
  useToast,
} from '@dronico/droni-kit'
import {
  CHARGE_CONCEPT_TYPES,
  CHARGE_CONCEPT_TYPE_LABELS,
  type ChargeConcept,
  type ChargeConceptType,
} from '@aptoph/shared'
import AccountSelect from '@/components/finance/AccountSelect.vue'
import { financeApi } from '@/api/finance'
import { useFinanceCatalog } from '@/composables/useFinanceCatalog'
import { errorMessage, fieldErrors } from '@/lib/errors'
import { parseAmount } from '@/lib/format'

const props = defineProps<{ concept: ChargeConcept | null }>()
const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ saved: [] }>()
const toast = useToast()
const catalog = useFinanceCatalog()

const form = ref({
  name: '',
  type: 'other' as ChargeConceptType,
  defaultAmount: '',
  accruesInterest: false,
  allowsEarlyDiscount: false,
  receivableAccountId: '',
  incomeAccountId: '',
  isActive: true,
})
const errors = ref<Record<string, string>>({})
const error = ref<string | null>(null)
const saving = ref(false)

watch(open, (isOpen) => {
  if (!isOpen) return
  const c = props.concept
  form.value = {
    name: c?.name ?? '',
    type: c?.type ?? 'other',
    defaultAmount: c?.defaultAmount ? String(Number(c.defaultAmount)) : '',
    accruesInterest: c?.accruesInterest ?? false,
    allowsEarlyDiscount: c?.allowsEarlyDiscount ?? false,
    receivableAccountId: c?.receivableAccount?.id ?? '',
    incomeAccountId: c?.incomeAccount?.id ?? '',
    isActive: c?.isActive ?? true,
  }
  errors.value = {}
  error.value = null
})

const typeOptions = CHARGE_CONCEPT_TYPES.filter((type) => type !== 'interest').map((value) => ({
  value,
  label: CHARGE_CONCEPT_TYPE_LABELS[value],
}))
const system = computed(() => props.concept?.isSystem ?? false)

async function submit() {
  saving.value = true
  errors.value = {}
  error.value = null
  const input = {
    name: form.value.name,
    type: form.value.type,
    defaultAmount: form.value.defaultAmount ? parseAmount(form.value.defaultAmount) : null,
    accruesInterest: form.value.accruesInterest,
    allowsEarlyDiscount: form.value.allowsEarlyDiscount,
    receivableAccountId: form.value.receivableAccountId || undefined,
    incomeAccountId: form.value.incomeAccountId || undefined,
    isActive: form.value.isActive,
  }
  try {
    if (props.concept) await financeApi.updateConcept(props.concept.id, input)
    else await financeApi.createConcept(input)
    toast.success('Concepto guardado')
    await catalog.refresh()
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
    :title="concept ? 'Editar concepto' : 'Nuevo concepto'"
    size="md"
    :persistent="saving"
  >
    <DuiForm :loading="saving" @submit="submit">
      <DuiAlert v-if="error" color="danger" variant="soft">{{ error }}</DuiAlert>
      <DuiLabel title="Nombre" required :error="errors.name">
        <DuiInput
          v-model="form.name"
          maxlength="120"
          required
          placeholder="Alquiler de bicicletero"
        />
      </DuiLabel>
      <div class="grid gap-4 sm:grid-cols-2">
        <DuiLabel title="Tipo" required :error="errors.type">
          <DuiSelect v-model="form.type" :options="typeOptions" :disabled="system" block />
        </DuiLabel>
        <DuiLabel title="Valor sugerido" :error="errors.defaultAmount">
          <DuiInput v-model="form.defaultAmount" inputmode="decimal" placeholder="Opcional" />
        </DuiLabel>
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        <DuiLabel
          title="Cuenta por cobrar"
          help-text="Vacío: la del tipo"
          :error="errors.receivableAccountId"
        >
          <AccountSelect
            v-model="form.receivableAccountId"
            :prefixes="['13']"
            placeholder="Automática"
          />
        </DuiLabel>
        <DuiLabel
          title="Cuenta de ingreso"
          help-text="Vacío: la del tipo"
          :error="errors.incomeAccountId"
        >
          <AccountSelect
            v-model="form.incomeAccountId"
            :classes="['income', 'liability']"
            placeholder="Automática"
          />
        </DuiLabel>
      </div>
      <div class="flex flex-col gap-2">
        <DuiCheckbox
          v-model="form.accruesInterest"
          label="Genera intereses de mora si se paga tarde"
        />
        <DuiCheckbox v-model="form.allowsEarlyDiscount" label="Tiene descuento por pronto pago" />
        <DuiCheckbox v-if="concept" v-model="form.isActive" label="Activo" />
      </div>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <DuiButton variant="ghost" :disabled="saving" @click="open = false">Cancelar</DuiButton>
          <DuiButton type="submit" color="primary" :loading="saving">Guardar</DuiButton>
        </div>
      </template>
    </DuiForm>
  </DuiModal>
</template>
