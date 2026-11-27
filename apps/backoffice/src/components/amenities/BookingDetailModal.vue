<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  UiAlert,
  UiBadge,
  UiButton,
  UiInput,
  UiLabel,
  UiModal,
  UiRadio,
  UiSelect,
  UiSkeleton,
  UiTextarea,
  useToast,
} from '@aptoph/ui'
import {
  AMENITY_PAYMENT_MODE_LABELS,
  BOOKING_STATUS_LABELS,
  BOOKING_TYPE_LABELS,
  DEPOSIT_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  type CashAccount,
  type PaymentMethod,
} from '@aptoph/shared'
import AttachmentList from '@/components/attachments/AttachmentList.vue'
import ReasonDialog from '@/components/finance/ReasonDialog.vue'
import { bookingsApi, type BookingDetail } from '@/api/amenities'
import { financeApi } from '@/api/finance'
import { errorMessage, fieldErrors } from '@/lib/errors'
import { formatDateTime, formatMoney } from '@/lib/format'
import { STATUS_COLORS, bookedFor, formatRange } from '@/lib/amenities'

/** One booking: who, when, how much, its receipt and what the administration can do */
const props = defineProps<{ bookingId: string | null; manage: boolean }>()
const emit = defineEmits<{ changed: [booking: BookingDetail]; close: [] }>()
const toast = useToast()

const open = computed({
  get: () => !!props.bookingId,
  set: (value) => !value && emit('close'),
})
const booking = ref<BookingDetail | null>(null)
const error = ref<string | null>(null)
const accounts = ref<CashAccount[]>([])
const busy = ref(false)
/** The panel open below the details */
const action = ref<'approve' | 'deposit' | null>(null)
const rejecting = ref(false)
const cancelling = ref(false)
const fieldError = ref<Record<string, string>>({})

const approve = ref({ cashAccountId: '', method: 'bank_transfer' as PaymentMethod, note: '' })
const deposit = ref({
  outcome: 'returned' as 'returned' | 'retained',
  retained: '',
  cashAccountId: '',
  note: '',
})

watch(
  () => props.bookingId,
  async (id) => {
    booking.value = null
    action.value = null
    error.value = null
    fieldError.value = {}
    if (!id) return
    try {
      booking.value = (await bookingsApi.get(id)).data
    } catch (e) {
      error.value = errorMessage(e)
    }
    if (props.manage && !accounts.value.length) {
      accounts.value = (await financeApi.cashAccounts().catch(() => ({ data: [] }))).data.filter(
        (a) => a.isActive,
      )
    }
    const fallback =
      accounts.value.find((a) => a.type === 'bank')?.id ?? accounts.value[0]?.id ?? ''
    approve.value = { cashAccountId: fallback, method: 'bank_transfer', note: '' }
    deposit.value = { outcome: 'returned', retained: '', cashAccountId: fallback, note: '' }
  },
  { immediate: true },
)

const b = computed(() => booking.value)
/** Money paid before the booking: the prepaid fee and the deposit */
const received = computed(() => {
  const x = b.value
  if (!x) return 0
  return (x.paymentMode === 'prepaid' ? Number(x.feeAmount) : 0) + Number(x.depositAmount)
})
const missingReceipt = computed(
  () => received.value > 0 && b.value?.bookingType !== 'external' && !b.value?.attachments.length,
)
const ended = computed(() => !!b.value && new Date(b.value.endsAt).getTime() < Date.now())
const canReview = computed(() => props.manage && b.value?.status === 'pending' && !ended.value)
const canCancel = computed(
  () =>
    props.manage &&
    (b.value?.status === 'pending' || b.value?.status === 'approved') &&
    !ended.value,
)
const canSettle = computed(() => props.manage && b.value?.depositStatus === 'held')

async function run(
  work: () => Promise<{ data: BookingDetail; warnings?: string[] }>,
  done: string,
) {
  busy.value = true
  fieldError.value = {}
  try {
    const result = await work()
    booking.value = result.data
    emit('changed', result.data)
    toast.success(done)
    for (const warning of result.warnings ?? []) toast.warning(warning)
    action.value = null
    rejecting.value = false
    cancelling.value = false
  } catch (e) {
    fieldError.value = fieldErrors(e)
    if (!Object.keys(fieldError.value).length) toast.error(errorMessage(e))
  } finally {
    busy.value = false
  }
}

function submitApprove() {
  const x = b.value!
  run(
    () =>
      bookingsApi.approve(x.id, {
        cashAccountId: received.value > 0 ? approve.value.cashAccountId : null,
        method: received.value > 0 ? approve.value.method : undefined,
        note: approve.value.note || null,
      }),
    `Reserva #${x.number} aprobada`,
  )
}
function submitDeposit() {
  const x = b.value!
  const d = deposit.value
  run(
    () =>
      bookingsApi.deposit(x.id, {
        outcome: d.outcome,
        retainedAmount: d.outcome === 'retained' ? Number(d.retained || 0) : undefined,
        cashAccountId: d.cashAccountId,
        note: d.note || null,
      }),
    d.outcome === 'returned' ? 'Depósito devuelto' : 'Depósito liquidado',
  )
}

const methodOptions = PAYMENT_METHODS.map((m) => ({ value: m, label: PAYMENT_METHOD_LABELS[m] }))
const refund = computed(() =>
  Math.max(0, Number(b.value?.depositAmount ?? 0) - Number(deposit.value.retained || 0)),
)
</script>

<template>
  <UiModal
    v-model="open"
    :title="b ? `Reserva #${b.number} · ${b.amenity.name}` : 'Reserva'"
    size="lg"
    scrollable
    :persistent="busy"
  >
    <UiAlert v-if="error" color="danger" variant="soft">{{ error }}</UiAlert>
    <div v-else-if="!b" class="space-y-3">
      <UiSkeleton class="h-6 w-1/2" />
      <UiSkeleton class="h-32" />
    </div>
    <div v-else class="space-y-5">
      <div class="flex flex-wrap items-center gap-2">
        <UiBadge
          :label="BOOKING_STATUS_LABELS[b.status]"
          :color="STATUS_COLORS[b.status]"
          variant="soft"
        />
        <UiBadge :label="BOOKING_TYPE_LABELS[b.bookingType]" variant="outline" />
        <UiBadge
          v-if="b.depositStatus"
          :label="`Depósito ${DEPOSIT_STATUS_LABELS[b.depositStatus].toLowerCase()}`"
          :color="b.depositStatus === 'held' ? 'warning' : 'neutral'"
          variant="soft"
        />
      </div>

      <dl class="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        <div>
          <dt class="text-neutral-500">Cuándo</dt>
          <dd class="font-medium">{{ formatRange(b) }}</dd>
        </div>
        <div>
          <dt class="text-neutral-500">{{ b.bookingType === 'block' ? 'Motivo' : 'Para' }}</dt>
          <dd class="font-medium">{{ bookedFor(b) }}</dd>
        </div>
        <div v-if="b.holder && (b.holder.document || b.holder.phone || b.holder.email)">
          <dt class="text-neutral-500">Contacto</dt>
          <dd>
            {{ [b.holder.document, b.holder.phone, b.holder.email].filter(Boolean).join(' · ') }}
          </dd>
        </div>
        <div v-if="b.requestedBy">
          <dt class="text-neutral-500">Solicitó</dt>
          <dd>{{ b.requestedBy.fullName }} · {{ formatDateTime(b.createdAt) }}</dd>
        </div>
        <div v-if="b.guestsCount">
          <dt class="text-neutral-500">Asistentes</dt>
          <dd>{{ b.guestsCount }}</dd>
        </div>
        <div v-if="b.notes && b.bookingType !== 'block'" class="sm:col-span-2">
          <dt class="text-neutral-500">Notas</dt>
          <dd class="whitespace-pre-line">{{ b.notes }}</dd>
        </div>
      </dl>

      <div
        v-if="b.bookingType !== 'block'"
        class="grid grid-cols-2 gap-3 rounded-xl bg-neutral-50 p-4 text-sm sm:grid-cols-4 dark:bg-white/5"
      >
        <div>
          <p class="text-neutral-500">Tarifa</p>
          <p class="font-semibold">{{ formatMoney(b.feeAmount) }}</p>
        </div>
        <div>
          <p class="text-neutral-500">Pago</p>
          <p class="font-semibold">
            {{
              b.paymentMode && Number(b.feeAmount) > 0
                ? AMENITY_PAYMENT_MODE_LABELS[b.paymentMode]
                : '—'
            }}
          </p>
        </div>
        <div>
          <p class="text-neutral-500">Depósito</p>
          <p class="font-semibold">{{ formatMoney(b.depositAmount) }}</p>
        </div>
        <div>
          <p class="text-neutral-500">Referencia</p>
          <p class="truncate font-semibold">{{ b.paymentReference ?? '—' }}</p>
        </div>
      </div>

      <UiAlert v-if="b.reviewNote && b.status === 'rejected'" color="danger" variant="soft">
        Rechazada: {{ b.reviewNote }}
      </UiAlert>
      <UiAlert v-if="b.status === 'cancelled'" color="neutral" variant="soft">
        Cancelada {{ formatDateTime(b.cancelledAt)
        }}{{ b.cancellationReason ? `: ${b.cancellationReason}` : '' }}
      </UiAlert>
      <UiAlert v-if="b.depositStatus === 'retained'" color="warning" variant="soft">
        Se descontaron {{ formatMoney(b.depositRetained) }} del depósito{{
          b.depositNote ? `: ${b.depositNote}` : ''
        }}
      </UiAlert>

      <AttachmentList
        v-if="b.bookingType !== 'block'"
        owner-type="amenity_booking"
        :owner-id="b.id"
        :initial="b.attachments"
        :editable="manage && b.status === 'pending'"
        title="Soporte de pago"
        @change="(files) => (b!.attachments = files)"
      />
      <UiAlert v-if="canReview && missingReceipt" color="warning" variant="soft">
        Esta reserva se paga antes ({{ formatMoney(received) }}) y todavía no tiene soporte. El
        residente lo adjunta desde el portal, o lo puedes subir tú.
      </UiAlert>

      <!-- Approve -->
      <div
        v-if="action === 'approve'"
        class="space-y-3 rounded-xl border border-neutral-200 p-4 dark:border-white/10"
      >
        <p class="font-medium">Aprobar la reserva</p>
        <template v-if="received > 0">
          <p class="text-sm text-neutral-500">
            Se registra el pago de {{ formatMoney(received) }}
            <template v-if="Number(b.depositAmount) > 0">
              (incluye el depósito de {{ formatMoney(b.depositAmount) }}, que queda por devolver) </template
            >.
          </p>
          <div class="grid gap-3 sm:grid-cols-2">
            <UiLabel title="Entró a" required :error="fieldError.cashAccountId">
              <UiSelect
                v-model="approve.cashAccountId"
                :options="accounts"
                item-label="name"
                item-value="id"
                block
              />
            </UiLabel>
            <UiLabel title="Medio de pago">
              <UiSelect v-model="approve.method" :options="methodOptions" block />
            </UiLabel>
          </div>
        </template>
        <p v-else-if="Number(b.feeAmount) > 0" class="text-sm text-neutral-500">
          La tarifa de {{ formatMoney(b.feeAmount) }} se carga al estado de cuenta de la unidad con
          la próxima cuota.
        </p>
        <UiLabel title="Nota para el residente">
          <UiTextarea v-model="approve.note" rows="2" maxlength="1000" block />
        </UiLabel>
        <div class="flex justify-end gap-2">
          <UiButton variant="ghost" :disabled="busy" @click="action = null">Volver</UiButton>
          <UiButton
            color="primary"
            :loading="busy"
            :disabled="missingReceipt"
            @click="submitApprove"
          >
            Aprobar
          </UiButton>
        </div>
      </div>

      <!-- Deposit -->
      <div
        v-if="action === 'deposit'"
        class="space-y-3 rounded-xl border border-neutral-200 p-4 dark:border-white/10"
      >
        <p class="font-medium">Depósito de {{ formatMoney(b.depositAmount) }}</p>
        <UiRadio
          v-model="deposit.outcome"
          name="depositOutcome"
          orientation="horizontal"
          :options="[
            { value: 'returned', label: 'Devolverlo completo' },
            { value: 'retained', label: 'Descontar daños' },
          ]"
        />
        <div class="grid gap-3 sm:grid-cols-2">
          <UiLabel
            v-if="deposit.outcome === 'retained'"
            title="Valor descontado"
            required
            :help-text="`Se devuelven ${formatMoney(refund)}`"
            :error="fieldError.retainedAmount"
          >
            <UiInput
              v-model="deposit.retained"
              type="number"
              min="1"
              :max="Number(b.depositAmount)"
              step="1000"
            />
          </UiLabel>
          <UiLabel title="Sale de" required :error="fieldError.cashAccountId">
            <UiSelect
              v-model="deposit.cashAccountId"
              :options="accounts"
              item-label="name"
              item-value="id"
              block
            />
          </UiLabel>
        </div>
        <UiLabel
          :title="deposit.outcome === 'retained' ? 'Qué se dañó' : 'Nota'"
          :required="deposit.outcome === 'retained'"
          :error="fieldError.note"
        >
          <UiTextarea v-model="deposit.note" rows="2" maxlength="1000" block />
        </UiLabel>
        <div class="flex justify-end gap-2">
          <UiButton variant="ghost" :disabled="busy" @click="action = null">Volver</UiButton>
          <UiButton color="primary" :loading="busy" @click="submitDeposit">Registrar</UiButton>
        </div>
      </div>
    </div>

    <template #footer>
      <div v-if="b && !action" class="flex w-full flex-wrap justify-end gap-2">
        <UiButton v-if="canCancel" variant="ghost" color="danger" @click="cancelling = true">
          Cancelar reserva
        </UiButton>
        <UiButton v-if="canReview" variant="outline" color="danger" @click="rejecting = true">
          Rechazar
        </UiButton>
        <UiButton
          v-if="canSettle"
          color="primary"
          icon="mdi-cash-refund"
          @click="action = 'deposit'"
        >
          Liquidar depósito
        </UiButton>
        <UiButton v-if="canReview" color="primary" icon="mdi-check" @click="action = 'approve'">
          Aprobar
        </UiButton>
      </div>
    </template>
  </UiModal>

  <ReasonDialog
    v-model="rejecting"
    title="Rechazar la reserva"
    message="El residente recibe el motivo. El horario queda libre."
    confirm-label="Rechazar"
    placeholder="Ya hay un evento del conjunto ese día"
    :loading="busy"
    @confirm="(reason) => run(() => bookingsApi.reject(b!.id, reason), 'Reserva rechazada')"
  />
  <ReasonDialog
    v-model="cancelling"
    title="Cancelar la reserva"
    message="Se avisa a la unidad. Si el cobro no se ha pagado, se anula; si ya se pagó, queda la devolución pendiente."
    confirm-label="Cancelar reserva"
    placeholder="Mantenimiento imprevisto"
    :loading="busy"
    @confirm="(reason) => run(() => bookingsApi.cancel(b!.id, reason), 'Reserva cancelada')"
  />
</template>
