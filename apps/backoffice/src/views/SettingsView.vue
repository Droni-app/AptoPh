<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  DuiAlert,
  DuiButton,
  DuiCard,
  DuiForm,
  DuiInput,
  DuiLabel,
  DuiSelect,
  DuiSkeleton,
  useToast,
} from '@dronico/droni-kit'
import {
  PROPERTY_TYPES,
  PROPERTY_TYPE_LABELS,
  type PropertyType,
  type TenantSettings,
} from '@aptoph/shared'
import PageHeader from '@/components/PageHeader.vue'
import { settingsApi } from '@/api/backoffice'
import { useTenantStore } from '@/stores/tenant'
import { errorMessage, fieldErrors } from '@/lib/errors'

const tenant = useTenantStore()
const toast = useToast()

const settings = ref<TenantSettings | null>(null)
const form = ref({
  name: '',
  legalName: '',
  taxId: '',
  propertyType: 'residential' as PropertyType,
  address: '',
  city: '',
})
const errors = ref<Record<string, string>>({})
const error = ref<string | null>(null)
const saving = ref(false)

const propertyOptions = PROPERTY_TYPES.map((value) => ({
  value,
  label: PROPERTY_TYPE_LABELS[value],
}))

function fill(data: TenantSettings) {
  settings.value = data
  form.value = {
    name: data.name,
    legalName: data.legalName ?? '',
    taxId: data.taxId ?? '',
    propertyType: data.propertyType,
    address: data.address ?? '',
    city: data.city ?? '',
  }
}

onMounted(async () => {
  try {
    fill((await settingsApi.tenant()).data)
  } catch (e) {
    error.value = errorMessage(e)
  }
})

async function submit() {
  saving.value = true
  errors.value = {}
  try {
    const { data } = await settingsApi.updateTenant({
      name: form.value.name,
      legalName: form.value.legalName || null,
      taxId: form.value.taxId || null,
      propertyType: form.value.propertyType,
      address: form.value.address || null,
      city: form.value.city,
    })
    fill(data)
    // The name shows in the menu and the conjunto selector
    await tenant.load()
    toast.success('Guardamos los datos del conjunto')
  } catch (e) {
    errors.value = fieldErrors(e)
    if (!Object.keys(errors.value).length) toast.error(errorMessage(e))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <PageHeader
    title="Configuración del conjunto"
    subtitle="Datos legales y de contacto de la copropiedad"
  />

  <DuiAlert v-if="error" color="danger" variant="soft">{{ error }}</DuiAlert>

  <div v-else-if="!settings" class="max-w-2xl" aria-busy="true">
    <DuiSkeleton height="22rem" variant="rounded" />
  </div>

  <DuiCard v-else class="max-w-2xl">
    <DuiAlert v-if="!tenant.canManage" color="primary" variant="soft" class="mb-4">
      Solo la administración puede cambiar estos datos.
    </DuiAlert>
    <DuiForm :loading="saving" @submit="submit">
      <DuiLabel title="Nombre del conjunto" required :error="errors.name">
        <DuiInput v-model="form.name" required :disabled="!tenant.canManage" block />
      </DuiLabel>
      <DuiLabel
        title="Razón social"
        :error="errors.legalName"
        :help-text="errors.legalName ? undefined : 'Como aparece en el certificado de existencia.'"
      >
        <DuiInput
          v-model="form.legalName"
          placeholder="Conjunto Residencial Los Álamos P.H."
          :disabled="!tenant.canManage"
          block
        />
      </DuiLabel>
      <div class="grid gap-4 sm:grid-cols-2">
        <DuiLabel title="NIT" :error="errors.taxId">
          <DuiInput
            v-model="form.taxId"
            placeholder="900.123.456-7"
            :disabled="!tenant.canManage"
            block
          />
        </DuiLabel>
        <DuiLabel title="Tipo de copropiedad" :error="errors.propertyType">
          <DuiSelect
            v-model="form.propertyType"
            :options="propertyOptions"
            :disabled="!tenant.canManage"
            block
          />
        </DuiLabel>
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        <DuiLabel title="Dirección" :error="errors.address">
          <DuiInput v-model="form.address" :disabled="!tenant.canManage" block />
        </DuiLabel>
        <DuiLabel title="Ciudad" required :error="errors.city">
          <DuiInput v-model="form.city" required :disabled="!tenant.canManage" block />
        </DuiLabel>
      </div>
      <div v-if="tenant.canManage">
        <DuiButton type="submit" color="primary" :loading="saving">Guardar cambios</DuiButton>
      </div>
    </DuiForm>
  </DuiCard>
</template>
