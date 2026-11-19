<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  DuiAlert,
  DuiButton,
  DuiForm,
  DuiInput,
  DuiLabel,
  DuiModal,
  DuiSelect,
  useToast,
} from '@dronico/droni-kit'
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

const form = ref({ fromId: '', toId: '', amount: '', date: todayInput(), description: '' })
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
  const accounts = catalog.activeCashAccounts.value
  form.value = {
    fromId: accounts.find((a) => a.type === 'bank')?.id ?? '',
    toId: accounts.find((a) => a.type === 'cash')?.id ?? '',
    amount: '',
    date: todayInput(),
    description: '',
  }
  errors.value = {}
  error.value = null
})

const options = computed(() =>
  catalog.activeCashAccounts.value.map((a) => ({
    value: a.id,
    label: `${a.name} · ${formatMoney(a.balance)}`,
  })),
)

async function submit() {
  saving.value = true
  errors.value = {}
  error.value = null
  try {
    const { data } = await financeApi.transfer({
      ...form.value,
      amount: parseAmount(form.value.amount),
      description: form.value.description || null,
    })
    const failed = await uploadAttachments('journal_entry', data.entryId, files.value)
    toast.success('Traslado registrado')
    warnFailedUploads(toast, failed)
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
    title="Trasladar dinero"
    description="Retiro para caja menor, consignación de efectivo o traslado entre cuentas"
    size="md"
    :persistent="saving"
  >
    <DuiForm :loading="saving" @submit="submit">
      <DuiAlert v-if="error" color="danger" variant="soft">{{ error }}</DuiAlert>
      <div class="grid gap-4 sm:grid-cols-2">
        <DuiLabel title="Sale de" required :error="errors.fromId">
          <DuiSelect v-model="form.fromId" :options="options" block />
        </DuiLabel>
        <DuiLabel title="Entra a" required :error="errors.toId">
          <DuiSelect v-model="form.toId" :options="options" block />
        </DuiLabel>
        <DuiLabel title="Valor" required :error="errors.amount">
          <DuiInput v-model="form.amount" inputmode="decimal" required />
        </DuiLabel>
        <DuiLabel title="Fecha" required :error="errors.date">
          <DuiInput v-model="form.date" type="date" required />
        </DuiLabel>
      </div>
      <DuiLabel title="Detalle" :error="errors.description">
        <DuiInput
          v-model="form.description"
          maxlength="255"
          placeholder="Reembolso de caja menor"
        />
      </DuiLabel>
      <AttachmentPicker v-model="files" :disabled="saving" />
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <DuiButton variant="ghost" :disabled="saving" @click="open = false">Cancelar</DuiButton>
          <DuiButton type="submit" color="primary" :loading="saving">Trasladar</DuiButton>
        </div>
      </template>
    </DuiForm>
  </DuiModal>
</template>
