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
  BANK_ACCOUNT_KINDS,
  BANK_ACCOUNT_KIND_LABELS,
  type BankAccountKind,
  type CashAccount,
  type CashAccountType,
} from '@aptoph/shared'
import { financeApi } from '@/api/finance'
import { useFinanceCatalog } from '@/composables/useFinanceCatalog'
import { errorMessage, fieldErrors } from '@/lib/errors'
import { parseAmount, todayInput } from '@/lib/format'

const props = defineProps<{ account: CashAccount | null }>()
const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ saved: [] }>()
const toast = useToast()
const catalog = useFinanceCatalog()

const form = ref({
  name: '',
  type: 'bank' as CashAccountType,
  bankName: '',
  accountKind: 'savings' as BankAccountKind,
  accountNumber: '',
  openingBalance: '',
  openingDate: todayInput(),
  isActive: true,
})
const errors = ref<Record<string, string>>({})
const error = ref<string | null>(null)
const saving = ref(false)

watch(open, (isOpen) => {
  if (!isOpen) return
  const a = props.account
  form.value = {
    name: a?.name ?? '',
    type: a?.type ?? 'bank',
    bankName: a?.bankName ?? '',
    accountKind: a?.accountKind ?? 'savings',
    accountNumber: a?.accountNumber ?? '',
    openingBalance: '',
    openingDate: todayInput(),
    isActive: a?.isActive ?? true,
  }
  errors.value = {}
  error.value = null
})

const kindOptions = BANK_ACCOUNT_KINDS.map((value) => ({
  value,
  label: BANK_ACCOUNT_KIND_LABELS[value],
}))

async function submit() {
  saving.value = true
  errors.value = {}
  error.value = null
  const f = form.value
  const bank = f.type === 'bank'
  try {
    if (props.account) {
      await financeApi.updateCashAccount(props.account.id, {
        name: f.name,
        bankName: bank ? f.bankName || null : null,
        accountNumber: bank ? f.accountNumber || null : null,
        isActive: f.isActive,
      })
    } else {
      await financeApi.createCashAccount({
        name: f.name,
        type: f.type,
        bankName: bank ? f.bankName || null : null,
        accountKind: bank ? f.accountKind : null,
        accountNumber: bank ? f.accountNumber || null : null,
        openingBalance: parseAmount(f.openingBalance) || 0,
        openingDate: f.openingDate,
      })
    }
    toast.success('Cuenta guardada')
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
  <UiModal
    v-model="open"
    :title="account ? 'Editar cuenta' : 'Nueva cuenta de banco o caja'"
    size="md"
    :persistent="saving"
  >
    <UiForm :loading="saving" @submit="submit">
      <UiAlert v-if="error" color="danger" variant="soft">{{ error }}</UiAlert>
      <div v-if="!account" class="flex gap-4 text-sm">
        <label class="flex items-center gap-1.5"
          ><input v-model="form.type" type="radio" value="bank" /> Cuenta bancaria</label
        >
        <label class="flex items-center gap-1.5"
          ><input v-model="form.type" type="radio" value="cash" /> Caja (efectivo)</label
        >
      </div>
      <UiLabel title="Nombre" required :error="errors.name">
        <UiInput
          v-model="form.name"
          maxlength="80"
          required
          :placeholder="form.type === 'bank' ? 'Bancolombia ahorros' : 'Caja menor'"
        />
      </UiLabel>
      <div v-if="form.type === 'bank'" class="grid gap-4 sm:grid-cols-3">
        <UiLabel title="Banco" :error="errors.bankName">
          <UiInput v-model="form.bankName" maxlength="80" />
        </UiLabel>
        <UiLabel title="Tipo">
          <UiSelect
            v-model="form.accountKind"
            :options="kindOptions"
            :disabled="!!account"
            block
          />
        </UiLabel>
        <UiLabel title="Número" :error="errors.accountNumber">
          <UiInput v-model="form.accountNumber" maxlength="40" />
        </UiLabel>
      </div>
      <div v-if="!account" class="grid gap-4 sm:grid-cols-2">
        <UiLabel
          title="Saldo inicial"
          help-text="Lo que hay hoy en la cuenta"
          :error="errors.openingBalance"
        >
          <UiInput v-model="form.openingBalance" inputmode="decimal" placeholder="0" />
        </UiLabel>
        <UiLabel title="A la fecha" :error="errors.openingDate">
          <UiInput v-model="form.openingDate" type="date" />
        </UiLabel>
      </div>
      <UiCheckbox v-if="account" v-model="form.isActive" label="Activa" />
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UiButton variant="ghost" :disabled="saving" @click="open = false">Cancelar</UiButton>
          <UiButton type="submit" color="primary" :loading="saving">Guardar</UiButton>
        </div>
      </template>
    </UiForm>
  </UiModal>
</template>
