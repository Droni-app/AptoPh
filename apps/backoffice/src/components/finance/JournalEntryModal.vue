<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { UiAlert, UiButton, UiModal, UiSkeleton, useToast } from '@aptoph/ui'
import { JOURNAL_ENTRY_TYPE_LABELS, type JournalEntry } from '@aptoph/shared'
import ReasonDialog from '@/components/finance/ReasonDialog.vue'
import { financeApi } from '@/api/finance'
import AttachmentList from '@/components/attachments/AttachmentList.vue'
import { errorMessage } from '@/lib/errors'
import { formatAmount, formatDate, formatDateTime, formatMoney } from '@/lib/format'
import { useTenantStore } from '@/stores/tenant'

const props = defineProps<{ entryId: string | null }>()
const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ changed: []; show: [string] }>()
const tenant = useTenantStore()
const toast = useToast()

const entry = ref<JournalEntry | null>(null)
const error = ref<string | null>(null)
const reverseOpen = ref(false)
const busy = ref(false)

async function load() {
  if (!props.entryId) return
  entry.value = null
  error.value = null
  try {
    entry.value = (await financeApi.entry(props.entryId)).data
  } catch (e) {
    error.value = errorMessage(e)
  }
}
watch(open, (isOpen) => isOpen && load())
watch(
  () => props.entryId,
  () => open.value && load(),
)

const reversible = computed(
  () =>
    entry.value &&
    ['manual', 'transfer', 'opening'].includes(entry.value.type) &&
    !entry.value.reversedByEntryId &&
    !entry.value.reversesEntryId,
)
const totals = computed(() => ({
  debit: (entry.value?.lines ?? []).reduce((sum, line) => sum + Number(line.debit), 0),
  credit: (entry.value?.lines ?? []).reduce((sum, line) => sum + Number(line.credit), 0),
}))

async function reverse(reason: string) {
  busy.value = true
  try {
    const { data } = await financeApi.reverseEntry(props.entryId!, reason)
    toast.success(`Comprobante ${data.number} de reversión creado`)
    reverseOpen.value = false
    emit('changed')
    await load()
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <UiModal
    v-model="open"
    :title="entry ? `${JOURNAL_ENTRY_TYPE_LABELS[entry.type]} ${entry.number}` : 'Comprobante'"
    size="xl"
    scrollable
  >
    <UiAlert v-if="error" color="danger" variant="soft">{{ error }}</UiAlert>
    <UiSkeleton v-else-if="!entry" class="h-48 rounded-xl" />
    <div v-else class="flex flex-col gap-4 text-sm">
      <div class="flex flex-wrap justify-between gap-2">
        <div>
          <p class="text-base font-semibold">{{ entry.description }}</p>
          <p class="text-neutral-500">
            {{ formatDate(entry.date) }} · registrado {{ formatDateTime(entry.createdAt)
            }}{{ entry.createdBy ? ` por ${entry.createdBy}` : '' }}
          </p>
        </div>
        <p class="text-lg font-bold tabular-nums">{{ formatMoney(entry.total) }}</p>
      </div>
      <UiAlert v-if="entry.reversedByEntryId" color="warning" variant="soft">
        Este comprobante fue reversado.
        <button
          type="button"
          class="font-semibold underline"
          @click="emit('show', entry.reversedByEntryId!)"
        >
          Ver la reversión
        </button>
      </UiAlert>
      <UiAlert v-if="entry.reversesEntryId" color="primary" variant="soft">
        Reversa otro comprobante.
        <button
          type="button"
          class="font-semibold underline"
          @click="emit('show', entry.reversesEntryId!)"
        >
          Ver el original
        </button>
      </UiAlert>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[36rem]">
          <thead class="text-left text-xs text-neutral-500 uppercase">
            <tr>
              <th class="py-2 font-medium">Cuenta</th>
              <th class="py-2 font-medium">Tercero</th>
              <th class="py-2 text-right font-medium">Débito</th>
              <th class="py-2 text-right font-medium">Crédito</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-100 dark:divide-white/10">
            <tr v-for="line in entry.lines" :key="line.id">
              <td class="py-1.5">
                <span class="tabular-nums">{{ line.account?.code }}</span> {{ line.account?.name }}
                <span v-if="line.description" class="block text-xs text-neutral-500">{{
                  line.description
                }}</span>
              </td>
              <td class="py-1.5">{{ line.thirdParty?.name ?? '' }}</td>
              <td class="py-1.5 text-right tabular-nums">{{ formatAmount(line.debit) }}</td>
              <td class="py-1.5 text-right tabular-nums">{{ formatAmount(line.credit) }}</td>
            </tr>
          </tbody>
          <tfoot class="font-semibold">
            <tr>
              <td class="pt-2" colspan="2">Sumas iguales</td>
              <td class="pt-2 text-right tabular-nums">{{ formatMoney(totals.debit) }}</td>
              <td class="pt-2 text-right tabular-nums">{{ formatMoney(totals.credit) }}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p
        v-if="entry && !reversible && !entry.reversedByEntryId && entry.type !== 'reversal'"
        class="text-xs text-neutral-500"
      >
        Los comprobantes generados por cobros, pagos y facturas se corrigen desde su origen (anular
        el cobro, reversar el pago…).
      </p>
      <AttachmentList
        v-if="['manual', 'transfer', 'opening'].includes(entry.type)"
        owner-type="journal_entry"
        :owner-id="entry.id"
        :editable="tenant.canManageFinance"
      />
    </div>
    <template v-if="reversible && tenant.canManageFinance" #footer>
      <div class="flex justify-end">
        <UiButton variant="ghost" color="danger" @click="reverseOpen = true"
          >Reversar comprobante</UiButton
        >
      </div>
    </template>
  </UiModal>
  <ReasonDialog
    v-model="reverseOpen"
    title="Reversar comprobante"
    message="Se crea un comprobante con los valores contrarios. El original no se borra."
    confirm-label="Reversar"
    :loading="busy"
    @confirm="reverse"
  />
</template>
