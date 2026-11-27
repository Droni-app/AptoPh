<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  UiAlert,
  UiButton,
  UiCheckbox,
  UiForm,
  UiInput,
  UiLabel,
  UiModal,
  UiSelect,
  useToast,
} from '@aptoph/ui'
import {
  DOCUMENT_TYPES,
  OCCUPANT_RELATIONSHIPS,
  OCCUPANT_RELATIONSHIP_LABELS,
  type OccupantRelationship,
  type UnitOccupant,
} from '@aptoph/shared'
import { occupantsApi } from '@/api/backoffice'
import { errorMessage, fieldErrors } from '@/lib/errors'

const props = defineProps<{ unitId: string; occupant?: UnitOccupant | null }>()
const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ saved: [occupant: UnitOccupant] }>()

const toast = useToast()
const emptyForm = () => ({
  fullName: '',
  documentType: '',
  documentNumber: '',
  phone: '',
  email: '',
  relationship: 'owner' as OccupantRelationship,
  isPrimaryContact: false,
  isBillingResponsible: false,
  startsOn: '',
  endsOn: '',
})
const form = ref(emptyForm())
const errors = ref<Record<string, string>>({})
const error = ref<string | null>(null)
const saving = ref(false)

const relationshipOptions = OCCUPANT_RELATIONSHIPS.map((value) => ({
  value,
  label: OCCUPANT_RELATIONSHIP_LABELS[value],
}))
const documentOptions = [{ value: '', label: '—' }, ...DOCUMENT_TYPES.map((value) => ({ value, label: value }))]

watch(open, (isOpen) => {
  if (!isOpen) return
  const occupant = props.occupant
  form.value = occupant
    ? {
        fullName: occupant.fullName,
        documentType: occupant.documentType ?? '',
        documentNumber: occupant.documentNumber ?? '',
        phone: occupant.phone ?? '',
        email: occupant.email ?? '',
        relationship: occupant.relationship,
        isPrimaryContact: occupant.isPrimaryContact,
        isBillingResponsible: occupant.isBillingResponsible,
        startsOn: occupant.startsOn ?? '',
        endsOn: occupant.endsOn ?? '',
      }
    : emptyForm()
  errors.value = {}
  error.value = null
})

async function submit() {
  saving.value = true
  errors.value = {}
  error.value = null
  const value = form.value
  const input = {
    fullName: value.fullName,
    documentType: (value.documentType || null) as UnitOccupant['documentType'],
    documentNumber: value.documentNumber || null,
    phone: value.phone || null,
    email: value.email || null,
    relationship: value.relationship,
    isPrimaryContact: value.isPrimaryContact,
    isBillingResponsible: value.isBillingResponsible,
    startsOn: value.startsOn || null,
    endsOn: value.endsOn || null,
  }
  try {
    const { data } = props.occupant
      ? await occupantsApi.update(props.unitId, props.occupant.id, input)
      : await occupantsApi.create(props.unitId, input)
    toast.success(props.occupant ? 'Ocupante actualizado' : 'Ocupante agregado')
    emit('saved', data)
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
  <UiModal v-model="open" :title="occupant ? 'Editar ocupante' : 'Agregar ocupante'" size="lg" :persistent="saving">
    <UiForm :loading="saving" @submit="submit">
      <UiAlert v-if="error" color="danger" variant="soft">{{ error }}</UiAlert>
      <div class="grid gap-4 sm:grid-cols-2">
        <UiLabel title="Nombre completo" required :error="errors.fullName" class="sm:col-span-2">
          <UiInput v-model="form.fullName" required minlength="2" maxlength="150" />
        </UiLabel>
        <UiLabel title="Vínculo con la unidad" required :error="errors.relationship">
          <UiSelect v-model="form.relationship" :options="relationshipOptions" />
        </UiLabel>
        <div class="grid grid-cols-[6rem_1fr] gap-2">
          <UiLabel title="Tipo doc." :error="errors.documentType">
            <UiSelect v-model="form.documentType" :options="documentOptions" />
          </UiLabel>
          <UiLabel title="Número" :error="errors.documentNumber">
            <UiInput v-model="form.documentNumber" maxlength="30" />
          </UiLabel>
        </div>
        <UiLabel title="Teléfono" :error="errors.phone">
          <UiInput v-model="form.phone" type="tel" maxlength="30" />
        </UiLabel>
        <UiLabel title="Correo" :error="errors.email">
          <UiInput v-model="form.email" type="email" maxlength="254" />
        </UiLabel>
        <UiLabel title="Desde" :error="errors.startsOn">
          <UiInput v-model="form.startsOn" type="date" />
        </UiLabel>
        <UiLabel title="Hasta" :error="errors.endsOn">
          <UiInput v-model="form.endsOn" type="date" />
        </UiLabel>
      </div>
      <div class="flex flex-wrap gap-6">
        <UiCheckbox v-model="form.isPrimaryContact" label="Contacto principal" />
        <UiCheckbox v-model="form.isBillingResponsible" label="Responsable de pagos" />
      </div>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UiButton variant="ghost" :disabled="saving" @click="open = false">Cancelar</UiButton>
          <UiButton type="submit" color="primary" :loading="saving">Guardar</UiButton>
        </div>
      </template>
    </UiForm>
  </UiModal>
</template>
