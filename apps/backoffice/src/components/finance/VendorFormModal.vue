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
  UiTextarea,
  useToast,
} from '@aptoph/ui'
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
  <UiModal
    v-model="open"
    :title="vendor ? 'Editar proveedor' : 'Nuevo proveedor'"
    size="lg"
    :persistent="saving"
    scrollable
  >
    <UiForm :loading="saving" @submit="submit">
      <UiAlert v-if="error" color="danger" variant="soft">{{ error }}</UiAlert>
      <UiLabel title="Nombre o razón social" required :error="errors.name">
        <UiInput v-model="form.name" maxlength="120" required />
      </UiLabel>
      <div class="grid gap-4 sm:grid-cols-2">
        <UiLabel title="Tipo de documento" :error="errors.documentType">
          <UiSelect v-model="form.documentType" :options="documentOptions" block />
        </UiLabel>
        <UiLabel title="Número" :error="errors.documentNumber">
          <UiInput v-model="form.documentNumber" maxlength="30" placeholder="900123456-7" />
        </UiLabel>
        <UiLabel title="Contacto" :error="errors.contactName">
          <UiInput v-model="form.contactName" maxlength="120" />
        </UiLabel>
        <UiLabel title="Teléfono" :error="errors.phone">
          <UiInput v-model="form.phone" maxlength="30" type="tel" />
        </UiLabel>
        <UiLabel title="Correo" :error="errors.email">
          <UiInput v-model="form.email" type="email" maxlength="254" />
        </UiLabel>
        <UiLabel title="Dirección" :error="errors.address">
          <UiInput v-model="form.address" maxlength="200" />
        </UiLabel>
      </div>
      <fieldset class="grid gap-4 sm:grid-cols-3">
        <legend class="mb-2 text-sm font-semibold">Cuenta para pagarle</legend>
        <UiLabel title="Banco" :error="errors.bankName">
          <UiInput v-model="form.bankName" maxlength="80" />
        </UiLabel>
        <UiLabel title="Tipo" :error="errors.bankAccountKind">
          <UiSelect v-model="form.bankAccountKind" :options="kindOptions" block />
        </UiLabel>
        <UiLabel title="Número" :error="errors.bankAccountNumber">
          <UiInput v-model="form.bankAccountNumber" maxlength="40" />
        </UiLabel>
      </fieldset>
      <UiLabel
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
      </UiLabel>
      <UiLabel title="Notas" :error="errors.notes">
        <UiTextarea v-model="form.notes" rows="2" maxlength="1000" />
      </UiLabel>
      <UiCheckbox v-if="vendor" v-model="form.isActive" label="Activo" />
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UiButton variant="ghost" :disabled="saving" @click="open = false">Cancelar</UiButton>
          <UiButton type="submit" color="primary" :loading="saving">Guardar</UiButton>
        </div>
      </template>
    </UiForm>
  </UiModal>
</template>
