<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { DuiAlert, DuiButton, DuiCard, DuiInput, DuiSkeleton, useToast } from '@dronico/droni-kit'
import {
  EMAIL_PACK_PRICE,
  EMAIL_PACK_SIZE,
  EMAIL_PACKS_MAX_PER_REQUEST,
  emailPacksPrice,
  formatCop,
  type EmailQuota,
} from '@aptoph/shared'
import { emailQuotaApi } from '@/api/announcements'
import { billingApi } from '@/api/backoffice'
import { errorMessage } from '@/lib/errors'
import { waitForCharge } from '@/lib/wompi'
import { useTenantStore } from '@/stores/tenant'

/**
 * Bulk emails of the month and purchase of additional packs with Wompi
 * (docs/email-quota.md, docs/billing.md)
 */
const props = defineProps<{
  /** Saved payment method ("VISA ·· 4242"): packs are charged to it right away */
  paymentMethod?: string | null
}>()
const emit = defineEmits<{ charged: [] }>()

const tenant = useTenantStore()
const toast = useToast()
const quota = ref<EmailQuota | null>(null)
const error = ref<string | null>(null)
const packs = ref('1')
const packCount = computed(() => Number(packs.value))
const sending = ref(false)
const confirming = ref(false)

const number = (n: number) => n.toLocaleString('es-CO')
const month = computed(() => {
  if (!quota.value) return ''
  const [year, m] = quota.value.period.split('-').map(Number)
  return new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(
    new Date(year!, m! - 1, 1),
  )
})
const percent = computed(() =>
  quota.value ? Math.min(100, (quota.value.used / quota.value.limit) * 100) : 0,
)
const validPacks = computed(
  () =>
    Number.isInteger(packCount.value) &&
    packCount.value >= 1 &&
    packCount.value <= EMAIL_PACKS_MAX_PER_REQUEST,
)
const total = computed(() => emailPacksPrice(validPacks.value ? packCount.value : 0))

async function load() {
  try {
    quota.value = (await emailQuotaApi.show()).data
  } catch (e) {
    error.value = errorMessage(e)
  }
}
onMounted(load)
defineExpose({ load })

async function buy() {
  if (!validPacks.value) return
  sending.value = true
  try {
    const { data } = await billingApi.buyEmailPacks(packCount.value)
    if (data.checkoutUrl) {
      // No saved method: pay in Wompi's checkout and come back to /plan?pago=<id>
      window.location.assign(data.checkoutUrl)
      return
    }
    const charge = await waitForCharge(data.charge.id)
    emit('charged')
    if (charge.status === 'approved') {
      toast.success('Pago aprobado. Los correos adicionales ya están disponibles.')
      packs.value = '1'
      await load()
    } else if (charge.status === 'pending') {
      toast.info('El pago sigue en proceso. Te avisaremos por correo cuando se confirme.')
    } else {
      toast.error(charge.statusMessage ?? 'El pago no fue aprobado.')
    }
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    sending.value = false
    confirming.value = false
  }
}
</script>

<template>
  <DuiCard>
    <div class="flex flex-col gap-4">
      <div>
        <h2 class="text-lg font-semibold">Correos masivos</h2>
        <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Comunicados enviados por correo. Cada mes incluye {{ number(quota?.included ?? 3000) }};
          las invitaciones, la recuperación de contraseña y los avisos de la cuenta no cuentan.
        </p>
      </div>

      <DuiAlert v-if="error" color="danger" variant="soft">{{ error }}</DuiAlert>
      <DuiSkeleton v-else-if="!quota" height="4rem" />
      <template v-else>
        <div>
          <div class="mb-1 flex flex-wrap items-baseline justify-between gap-2 text-sm">
            <span class="first-letter:uppercase">{{ month }}</span>
            <span class="tabular-nums">
              <strong>{{ number(quota.used) }}</strong> de {{ number(quota.limit) }} usados · quedan
              {{ number(quota.available) }}
            </span>
          </div>
          <div
            class="h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-white/10"
            role="progressbar"
            :aria-valuenow="quota.used"
            :aria-valuemax="quota.limit"
            aria-label="Correos usados este mes"
          >
            <div
              class="h-full rounded-full"
              :class="percent >= 90 ? 'bg-coral-500' : 'bg-mint-500'"
              :style="{ width: `${percent}%` }"
            />
          </div>
          <p v-if="quota.extraPacks" class="mt-1 text-xs text-neutral-500">
            Incluye {{ quota.extraPacks }}
            {{ quota.extraPacks === 1 ? 'paquete adicional' : 'paquetes adicionales' }} este mes.
          </p>
        </div>

        <form
          v-if="tenant.canManage"
          class="flex flex-col gap-3 rounded-xl bg-neutral-50 p-4 dark:bg-white/5"
          @submit.prevent="confirming ? buy() : (confirming = true)"
        >
          <div class="flex flex-wrap items-end gap-3">
            <div class="min-w-48 flex-1">
              <p class="text-sm font-medium">¿Necesitas más este mes?</p>
              <p class="text-xs text-neutral-500">
                Paquetes de {{ number(EMAIL_PACK_SIZE) }} correos por
                {{ formatCop(EMAIL_PACK_PRICE) }}. Valen solo para el mes en curso.
              </p>
            </div>
            <label class="flex flex-col gap-1 text-sm">
              <span>Paquetes</span>
              <DuiInput
                v-model="packs"
                type="number"
                min="1"
                :max="EMAIL_PACKS_MAX_PER_REQUEST"
                class="w-24"
                :disabled="sending"
                @update:model-value="confirming = false"
              />
            </label>
            <DuiButton v-if="!confirming" type="submit" color="primary" :disabled="!validPacks">
              Comprar · {{ formatCop(total) }}
            </DuiButton>
          </div>
          <div
            v-if="confirming"
            class="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-3 text-sm dark:border-white/10"
          >
            <p>
              <template v-if="props.paymentMethod">
                Se cobrarán <strong>{{ formatCop(total) }}</strong> a
                <strong>{{ props.paymentMethod }}</strong
                >.
              </template>
              <template v-else>
                Pagarás <strong>{{ formatCop(total) }}</strong> en Wompi con PSE (cualquier banco),
                tarjeta de crédito o débito o Nequi.
              </template>
            </p>
            <div class="flex gap-2">
              <DuiButton variant="ghost" :disabled="sending" @click="confirming = false"
                >Cancelar</DuiButton
              >
              <DuiButton type="submit" color="primary" :loading="sending">
                {{ props.paymentMethod ? 'Confirmar pago' : 'Ir a pagar' }}
              </DuiButton>
            </div>
          </div>
        </form>
        <p v-else class="text-xs text-neutral-500">
          Solo la administración puede comprar correos adicionales.
        </p>
      </template>
    </div>
  </DuiCard>
</template>
