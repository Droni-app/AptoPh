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
import { errorMessage } from '@/lib/errors'
import { useTenantStore } from '@/stores/tenant'

/** Bulk emails of the month and request of additional packs (docs/email-quota.md) */
const tenant = useTenantStore()
const toast = useToast()
const quota = ref<EmailQuota | null>(null)
const error = ref<string | null>(null)
const packs = ref('1')
const packCount = computed(() => Number(packs.value))
const sending = ref(false)

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

onMounted(async () => {
  try {
    quota.value = (await emailQuotaApi.show()).data
  } catch (e) {
    error.value = errorMessage(e)
  }
})

async function request() {
  if (!validPacks.value) return
  sending.value = true
  try {
    quota.value = (await emailQuotaApi.requestPacks(packCount.value)).data
    toast.success('Solicitud enviada. Te escribiremos con los datos de pago.')
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    sending.value = false
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

        <DuiAlert v-if="quota.requestedPacks" color="primary" variant="soft">
          Pediste {{ quota.requestedPacks }}
          {{ quota.requestedPacks === 1 ? 'paquete' : 'paquetes' }} ({{
            number(quota.requestedPacks * EMAIL_PACK_SIZE)
          }}
          correos). Quedan activos apenas confirmemos el pago.
        </DuiAlert>

        <form
          v-if="tenant.canManage"
          class="flex flex-wrap items-end gap-3 rounded-xl bg-neutral-50 p-4 dark:bg-white/5"
          @submit.prevent="request"
        >
          <div class="min-w-48 flex-1">
            <p class="text-sm font-medium">¿Necesitas más este mes?</p>
            <p class="text-xs text-neutral-500">
              Paquetes de {{ number(EMAIL_PACK_SIZE) }} correos por
              {{ formatCop(EMAIL_PACK_PRICE) }}
              + IVA. Valen solo para el mes en que se activan.
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
            />
          </label>
          <DuiButton type="submit" color="primary" :loading="sending" :disabled="!validPacks">
            Solicitar · {{ formatCop(emailPacksPrice(validPacks ? packCount : 0)) }}
          </DuiButton>
        </form>
        <p v-else class="text-xs text-neutral-500">
          Solo la administración puede pedir correos adicionales.
        </p>
      </template>
    </div>
  </DuiCard>
</template>
