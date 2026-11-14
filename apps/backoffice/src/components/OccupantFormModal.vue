<script setup lang="ts">
import { ref, watch } from 'vue'
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
  DOCUMENT_TYPES,
  OCCUPANT_RELATIONSHIPS,
  OCCUPANT_RELATIONSHIP_LABELS,
  type OccupantRelationship,
  type UnitOccupant,
} from '@apartadock/shared'
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
  <DuiModal v-model="open" :title="occupant ? 'Editar ocupante' : 'Agregar ocupante'" size="lg" :persistent="saving">
    <DuiForm :loading="saving" @submit="submit">
      <DuiAlert v-if="error" color="danger" variant="soft">{{ error }}</DuiAlert>
      <div class="grid gap-4 sm:grid-cols-2">
        <DuiLabel title="Nombre completo" required :error="errors.fullName" class="sm:col-span-2">
          <DuiInput v-model="form.fullName" required minlength="2" maxlength="150" />
        </DuiLabel>
        <DuiLabel title="Vínculo con la unidad" required :error="errors.relationship">
          <DuiSelect v-model="form.relationship" :options="relationshipOptions" />
        </DuiLabel>
        <div class="grid grid-cols-[6rem_1fr] gap-2">
          <DuiLabel title="Tipo doc." :error="errors.documentType">
            <DuiSelect v-model="form.documentType" :options="documentOptions" />
          </DuiLabel>
          <DuiLabel title="Número" :error="errors.documentNumber">
            <DuiInput v-model="form.documentNumber" maxlength="30" />
          </DuiLabel>
        </div>
        <DuiLabel title="Teléfono" :error="errors.phone">
          <DuiInput v-model="form.phone" type="tel" maxlength="30" />
        </DuiLabel>
        <DuiLabel title="Correo" :error="errors.email">
          <DuiInput v-model="form.email" type="email" maxlength="254" />
        </DuiLabel>
        <DuiLabel title="Desde" :error="errors.startsOn">
          <DuiInput v-model="form.startsOn" type="date" />
        </DuiLabel>
        <DuiLabel title="Hasta" :error="errors.endsOn">
          <DuiInput v-model="form.endsOn" type="date" />
        </DuiLabel>
      </div>
      <div class="flex flex-wrap gap-6">
        <DuiCheckbox v-model="form.isPrimaryContact" label="Contacto principal" />
        <DuiCheckbox v-model="form.isBillingResponsible" label="Responsable de pagos" />
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
