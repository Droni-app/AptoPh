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
  DuiTextarea,
  useToast,
} from '@dronico/droni-kit'
import {
  BANK_ACCOUNT_KINDS,
  BANK_ACCOUNT_KIND_LABELS,
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
  type Vendor,
  type VendorInput,
} from '@aptoph/shared'
import AccountSelect from '@/components/finance/AccountSelect.vue'
import { financeApi } from '@/api/finance'
import { errorMessage, fieldErrors } from '@/lib/errors'

const props = defineProps<{ vendor: Vendor | null }>()
const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ saved: [Vendor] }>()
const toast = useToast()

const empty = () => ({
  name: '',
  documentType: 'NIT',
  documentNumber: '',
  contactName: '',
  email: '',
  phone: '',
  address: '',
  bankName: '',
  bankAccountKind: '',
  bankAccountNumber: '',
  defaultAccountId: '',
  notes: '',
  isActive: true,
})
const form = ref(empty())
const errors = ref<Record<string, string>>({})
const error = ref<string | null>(null)
const saving = ref(false)

watch(open, (isOpen) => {
  if (!isOpen) return
  const v = props.vendor
  form.value = v
    ? {
        name: v.name,
        documentType: v.documentType ?? '',
        documentNumber: v.documentNumber ?? '',
        contactName: v.contactName ?? '',
        email: v.email ?? '',
        phone: v.phone ?? '',
        address: v.address ?? '',
        bankName: v.bankName ?? '',
        bankAccountKind: v.bankAccountKind ?? '',
        bankAccountNumber: v.bankAccountNumber ?? '',
        defaultAccountId: v.defaultAccount?.id ?? '',
        notes: v.notes ?? '',
        isActive: v.isActive,
      }
    : empty()
  errors.value = {}
  error.value = null
})

const documentOptions = [
  { value: '', label: '—' },
  ...DOCUMENT_TYPES.map((value) => ({ value, label: DOCUMENT_TYPE_LABELS[value] })),
]
const kindOptions = [
  { value: '', label: '—' },
  ...BANK_ACCOUNT_KINDS.map((value) => ({ value, label: BANK_ACCOUNT_KIND_LABELS[value] })),
]

async function submit() {
  saving.value = true
  errors.value = {}
  error.value = null
  const nullable = (value: string) => value.trim() || null
  const f = form.value
  const input: VendorInput = {
    name: f.name,
    documentType: (f.documentType || null) as VendorInput['documentType'],
    documentNumber: nullable(f.documentNumber),
    contactName: nullable(f.contactName),
    email: nullable(f.email),
    phone: nullable(f.phone),
    address: nullable(f.address),
    bankName: nullable(f.bankName),
    bankAccountKind: (f.bankAccountKind || null) as VendorInput['bankAccountKind'],
    bankAccountNumber: nullable(f.bankAccountNumber),
    defaultAccountId: f.defaultAccountId || null,
    notes: nullable(f.notes),
    isActive: f.isActive,
  }
  try {
    const { data } = props.vendor
      ? await financeApi.updateVendor(props.vendor.id, input)
      : await financeApi.createVendor(input)
    toast.success('Proveedor guardado')
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
  <DuiModal
    v-model="open"
    :title="vendor ? 'Editar proveedor' : 'Nuevo proveedor'"
    size="lg"
    :persistent="saving"
    scrollable
  >
    <DuiForm :loading="saving" @submit="submit">
      <DuiAlert v-if="error" color="danger" variant="soft">{{ error }}</DuiAlert>
      <DuiLabel title="Nombre o razón social" required :error="errors.name">
        <DuiInput v-model="form.name" maxlength="120" required />
      </DuiLabel>
      <div class="grid gap-4 sm:grid-cols-2">
        <DuiLabel title="Tipo de documento" :error="errors.documentType">
          <DuiSelect v-model="form.documentType" :options="documentOptions" block />
        </DuiLabel>
        <DuiLabel title="Número" :error="errors.documentNumber">
          <DuiInput v-model="form.documentNumber" maxlength="30" placeholder="900123456-7" />
        </DuiLabel>
        <DuiLabel title="Contacto" :error="errors.contactName">
          <DuiInput v-model="form.contactName" maxlength="120" />
        </DuiLabel>
        <DuiLabel title="Teléfono" :error="errors.phone">
          <DuiInput v-model="form.phone" maxlength="30" type="tel" />
        </DuiLabel>
        <DuiLabel title="Correo" :error="errors.email">
          <DuiInput v-model="form.email" type="email" maxlength="254" />
        </DuiLabel>
        <DuiLabel title="Dirección" :error="errors.address">
          <DuiInput v-model="form.address" maxlength="200" />
        </DuiLabel>
      </div>
      <fieldset class="grid gap-4 sm:grid-cols-3">
        <legend class="mb-2 text-sm font-semibold">Cuenta para pagarle</legend>
        <DuiLabel title="Banco" :error="errors.bankName">
          <DuiInput v-model="form.bankName" maxlength="80" />
        </DuiLabel>
        <DuiLabel title="Tipo" :error="errors.bankAccountKind">
          <DuiSelect v-model="form.bankAccountKind" :options="kindOptions" block />
        </DuiLabel>
        <DuiLabel title="Número" :error="errors.bankAccountNumber">
          <DuiInput v-model="form.bankAccountNumber" maxlength="40" />
        </DuiLabel>
      </fieldset>
      <DuiLabel
        title="Cuenta de gasto habitual"
        help-text="Se propone al registrar sus facturas"
        :error="errors.defaultAccountId"
      >
        <AccountSelect
          v-model="form.defaultAccountId"
          :prefixes="['5', '15', '16', '17']"
          :exclude-prefixes="['1592']"
          placeholder="Ninguna"
        />
      </DuiLabel>
      <DuiLabel title="Notas" :error="errors.notes">
        <DuiTextarea v-model="form.notes" rows="2" maxlength="1000" />
      </DuiLabel>
      <DuiCheckbox v-if="vendor" v-model="form.isActive" label="Activo" />
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <DuiButton variant="ghost" :disabled="saving" @click="open = false">Cancelar</DuiButton>
          <DuiButton type="submit" color="primary" :loading="saving">Guardar</DuiButton>
        </div>
      </template>
    </DuiForm>
  </DuiModal>
</template>
