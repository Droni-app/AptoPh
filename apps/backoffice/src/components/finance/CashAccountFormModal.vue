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
  <DuiModal
    v-model="open"
    :title="account ? 'Editar cuenta' : 'Nueva cuenta de banco o caja'"
    size="md"
    :persistent="saving"
  >
    <DuiForm :loading="saving" @submit="submit">
      <DuiAlert v-if="error" color="danger" variant="soft">{{ error }}</DuiAlert>
      <div v-if="!account" class="flex gap-4 text-sm">
        <label class="flex items-center gap-1.5"
          ><input v-model="form.type" type="radio" value="bank" /> Cuenta bancaria</label
        >
        <label class="flex items-center gap-1.5"
          ><input v-model="form.type" type="radio" value="cash" /> Caja (efectivo)</label
        >
      </div>
      <DuiLabel title="Nombre" required :error="errors.name">
        <DuiInput
          v-model="form.name"
          maxlength="80"
          required
          :placeholder="form.type === 'bank' ? 'Bancolombia ahorros' : 'Caja menor'"
        />
      </DuiLabel>
      <div v-if="form.type === 'bank'" class="grid gap-4 sm:grid-cols-3">
        <DuiLabel title="Banco" :error="errors.bankName">
          <DuiInput v-model="form.bankName" maxlength="80" />
        </DuiLabel>
        <DuiLabel title="Tipo">
          <DuiSelect
            v-model="form.accountKind"
            :options="kindOptions"
            :disabled="!!account"
            block
          />
        </DuiLabel>
        <DuiLabel title="Número" :error="errors.accountNumber">
          <DuiInput v-model="form.accountNumber" maxlength="40" />
        </DuiLabel>
      </div>
      <div v-if="!account" class="grid gap-4 sm:grid-cols-2">
        <DuiLabel
          title="Saldo inicial"
          help-text="Lo que hay hoy en la cuenta"
          :error="errors.openingBalance"
        >
          <DuiInput v-model="form.openingBalance" inputmode="decimal" placeholder="0" />
        </DuiLabel>
        <DuiLabel title="A la fecha" :error="errors.openingDate">
          <DuiInput v-model="form.openingDate" type="date" />
        </DuiLabel>
      </div>
      <DuiCheckbox v-if="account" v-model="form.isActive" label="Activa" />
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <DuiButton variant="ghost" :disabled="saving" @click="open = false">Cancelar</DuiButton>
          <DuiButton type="submit" color="primary" :loading="saving">Guardar</DuiButton>
        </div>
      </template>
    </DuiForm>
  </DuiModal>
</template>
