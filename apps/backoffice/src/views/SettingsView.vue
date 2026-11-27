<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  UiAlert,
  UiButton,
  UiCard,
  UiForm,
  UiInput,
  UiLabel,
  UiSelect,
  UiSkeleton,
  useToast,
} from '@aptoph/ui'
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

  <UiAlert v-if="error" color="danger" variant="soft">{{ error }}</UiAlert>

  <div v-else-if="!settings" class="max-w-2xl" aria-busy="true">
    <UiSkeleton height="22rem" variant="rounded" />
  </div>

  <UiCard v-else class="max-w-2xl">
    <UiAlert v-if="!tenant.canManage" color="primary" variant="soft" class="mb-4">
      Solo la administración puede cambiar estos datos.
    </UiAlert>
    <UiForm :loading="saving" @submit="submit">
      <UiLabel title="Nombre del conjunto" required :error="errors.name">
        <UiInput v-model="form.name" required :disabled="!tenant.canManage" block />
      </UiLabel>
      <UiLabel
        title="Razón social"
        :error="errors.legalName"
        :help-text="errors.legalName ? undefined : 'Como aparece en el certificado de existencia.'"
      >
        <UiInput
          v-model="form.legalName"
          placeholder="Conjunto Residencial Los Álamos P.H."
          :disabled="!tenant.canManage"
          block
        />
      </UiLabel>
      <div class="grid gap-4 sm:grid-cols-2">
        <UiLabel title="NIT" :error="errors.taxId">
          <UiInput
            v-model="form.taxId"
            placeholder="900.123.456-7"
            :disabled="!tenant.canManage"
            block
          />
        </UiLabel>
        <UiLabel title="Tipo de copropiedad" :error="errors.propertyType">
          <UiSelect
            v-model="form.propertyType"
            :options="propertyOptions"
            :disabled="!tenant.canManage"
            block
          />
        </UiLabel>
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        <UiLabel title="Dirección" :error="errors.address">
          <UiInput v-model="form.address" :disabled="!tenant.canManage" block />
        </UiLabel>
        <UiLabel title="Ciudad" required :error="errors.city">
          <UiInput v-model="form.city" required :disabled="!tenant.canManage" block />
        </UiLabel>
      </div>
      <div v-if="tenant.canManage">
        <UiButton type="submit" color="primary" :loading="saving">Guardar cambios</UiButton>
      </div>
    </UiForm>
  </UiCard>
</template>
