<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  DuiAlert,
  DuiButton,
  DuiCheckbox,
  DuiForm,
  DuiInput,
  DuiLabel,
  DuiModal,
  useToast,
} from '@dronico/droni-kit'
import type { LedgerAccount } from '@aptoph/shared'
import { financeApi } from '@/api/finance'
import { useFinanceCatalog } from '@/composables/useFinanceCatalog'
import { errorMessage, fieldErrors } from '@/lib/errors'

/** `parent` creates a subaccount under it; `account` edits one */
const props = defineProps<{ parent: LedgerAccount | null; account: LedgerAccount | null }>()
const open = defineModel<boolean>({ required: true })
const toast = useToast()
const catalog = useFinanceCatalog()

const code = ref('')
const name = ref('')
const isActive = ref(true)
const errors = ref<Record<string, string>>({})
const error = ref<string | null>(null)
const saving = ref(false)

/** Next free code under the parent: 4 digits → 05, 10, 15… (PUC); 6 or more → 01, 02… */
const suggested = computed(() => {
  if (!props.parent) return ''
  const prefix = props.parent.code
  const step = prefix.length === 4 ? 5 : 1
  const used = catalog.accounts.value
    .filter((a) => a.code.startsWith(prefix) && a.code.length === prefix.length + 2)
    .map((a) => Number(a.code.slice(prefix.length)))
  const next = Math.max(0, ...used) + step
  return next > 99 ? '' : `${prefix}${String(next).padStart(2, '0')}`
})

watch(open, (isOpen) => {
  if (!isOpen) return
  code.value = props.account?.code ?? suggested.value
  name.value = props.account?.name ?? ''
  isActive.value = props.account?.isActive ?? true
  errors.value = {}
  error.value = null
})

async function submit() {
  saving.value = true
  errors.value = {}
  error.value = null
  try {
    if (props.account)
      await financeApi.updateAccount(props.account.id, {
        name: name.value,
        isActive: isActive.value,
      })
    else await financeApi.createAccount({ code: code.value, name: name.value })
    toast.success('Cuenta guardada')
    await catalog.refresh()
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
    :title="account ? `Cuenta ${account.code}` : `Subcuenta de ${parent?.code} · ${parent?.name}`"
    size="sm"
    :persistent="saving"
  >
    <DuiForm :loading="saving" @submit="submit">
      <DuiAlert v-if="error" color="danger" variant="soft">{{ error }}</DuiAlert>
      <DuiLabel
        v-if="!account"
        title="Código"
        required
        help-text="6 a 10 dígitos, empezando por el de la cuenta padre"
        :error="errors.code"
      >
        <DuiInput v-model="code" inputmode="numeric" maxlength="10" required />
      </DuiLabel>
      <DuiLabel title="Nombre" required :error="errors.name">
        <DuiInput v-model="name" maxlength="120" required />
      </DuiLabel>
      <DuiCheckbox v-if="account && !account.systemKey" v-model="isActive" label="Activa" />
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <DuiButton variant="ghost" :disabled="saving" @click="open = false">Cancelar</DuiButton>
          <DuiButton type="submit" color="primary" :loading="saving">Guardar</DuiButton>
        </div>
      </template>
    </DuiForm>
  </DuiModal>
</template>
