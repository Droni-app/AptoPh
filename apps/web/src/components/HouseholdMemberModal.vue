<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  UiAlert,
  UiButton,
  UiForm,
  UiInput,
  UiLabel,
  UiModal,
  UiSelect,
} from '@aptoph/ui'
import {
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
  OCCUPANT_RELATIONSHIP_LABELS,
  type DocumentType,
  type HouseholdMember,
  type HouseholdRelationship,
} from '@aptoph/shared'
import { residentApi } from '@/api/resident'
import { useSubmit } from '@/composables/useSubmit'

const props = defineProps<{ unitId: string; member?: HouseholdMember | null }>()
const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ saved: [] }>()

const RELATIONSHIPS: HouseholdRelationship[] = ['family_member', 'domestic_worker', 'other']
const relationshipOptions = RELATIONSHIPS.map((value) => ({
  value,
  label: OCCUPANT_RELATIONSHIP_LABELS[value],
}))
const documentOptions = [
  { value: '', label: 'Sin documento' },
  ...DOCUMENT_TYPES.map((value) => ({ value, label: DOCUMENT_TYPE_LABELS[value] })),
]

const { saving, errors, error, run, reset } = useSubmit()
const empty = () => ({
  fullName: '',
  relationship: 'family_member' as HouseholdRelationship,
  documentType: '' as DocumentType | '',
  documentNumber: '',
  phone: '',
})
const form = ref(empty())

watch(open, (isOpen) => {
  if (!isOpen) return
  const m = props.member
  form.value = m
    ? {
        fullName: m.fullName,
        relationship: m.relationship as HouseholdRelationship,
        documentType: m.documentType ?? '',
        documentNumber: m.documentNumber ?? '',
        phone: m.phone ?? '',
      }
    : empty()
  reset()
})

async function submit() {
  const f = form.value
  const input = {
    fullName: f.fullName,
    relationship: f.relationship,
    documentType: f.documentType || null,
    documentNumber: f.documentNumber || null,
    phone: f.phone || null,
  }
  const ok = await run(
    () =>
      props.member
        ? residentApi.household.update(props.member.id, input)
        : residentApi.household.create(props.unitId, input),
    props.member ? 'Datos actualizados' : 'Persona agregada al hogar',
  )
  if (ok) {
    emit('saved')
    open.value = false
  }
}
</script>

<template>
  <UiModal
    v-model="open"
    :title="member ? 'Editar persona' : 'Agregar persona al hogar'"
    description="Familiares, empleadas de servicio u otras personas que viven o trabajan en la unidad."
    :persistent="saving"
  >
    <UiForm :loading="saving" @submit="submit">
      <UiAlert v-if="error" color="danger" variant="soft">{{ error }}</UiAlert>
      <div class="grid gap-4 sm:grid-cols-2">
        <UiLabel title="Nombre completo" required :error="errors.fullName" class="sm:col-span-2">
          <UiInput v-model="form.fullName" required minlength="2" maxlength="150" />
        </UiLabel>
        <UiLabel title="Vínculo" required :error="errors.relationship">
          <UiSelect v-model="form.relationship" :options="relationshipOptions" />
        </UiLabel>
        <UiLabel title="Teléfono" :error="errors.phone">
          <UiInput v-model="form.phone" type="tel" maxlength="30" />
        </UiLabel>
        <UiLabel title="Tipo de documento" :error="errors.documentType">
          <UiSelect v-model="form.documentType" :options="documentOptions" />
        </UiLabel>
        <UiLabel title="Número de documento" :error="errors.documentNumber">
          <UiInput v-model="form.documentNumber" maxlength="30" :disabled="!form.documentType" />
        </UiLabel>
      </div>
      <p class="text-xs text-neutral-500 dark:text-neutral-300">
        Los propietarios, arrendatarios y responsables de pago los registra la administración.
      </p>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UiButton variant="ghost" :disabled="saving" @click="open = false">Cancelar</UiButton>
          <UiButton type="submit" color="primary" :loading="saving">Guardar</UiButton>
        </div>
      </template>
    </UiForm>
  </UiModal>
</template>
