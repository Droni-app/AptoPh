<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  UiAlert,
  UiBadge,
  UiButton,
  UiCard,
  UiSkeleton,
  UiSwitch,
  UiTable,
  useToast,
  type TableColumn,
} from '@aptoph/ui'
import {
  BILLING_CHARGE_STATUS_LABELS,
  MANUAL_REMINDER_DAYS,
  MINIMUM_COVERS_UNITS,
  MINIMUM_MONTHLY,
  PAY_AHEAD_DAYS,
  PAYMENT_METHOD_TYPE_LABELS,
  PLAN,
  PLAN_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
  formatCop,
  quote,
  type BillingCharge,
  type BillingChargeStatus,
  type BillingOverview,
} from '@aptoph/shared'
import EmailQuotaCard from '@/components/EmailQuotaCard.vue'
import PageHeader from '@/components/PageHeader.vue'
import PaymentMethodModal from '@/components/billing/PaymentMethodModal.vue'
import { billingApi } from '@/api/backoffice'
import { errorMessage } from '@/lib/errors'
import { takeBancolombia, waitForCharge, waitForToken } from '@/lib/wompi'
import { useSubscriptionStore } from '@/stores/subscription'
import { useTenantStore } from '@/stores/tenant'

/** Plan, payment method and payments to AptoPH with Wompi (docs/billing.md) */
const CONTACT_EMAIL = 'contacto@aptoph.com'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const tenant = useTenantStore()
const subscription = useSubscriptionStore()
const loading = ref(true)
const error = ref<string | null>(null)
const overview = ref<BillingOverview | null>(null)
const methodModal = ref(false)
const confirmingPay = ref(false)
const paying = ref(false)
const processing = ref<string | null>(null)
const togglingRenew = ref(false)
const removingMethod = ref(false)
const quotaCard = ref<InstanceType<typeof EmailQuotaCard> | null>(null)
const signal = { cancelled: false }
onBeforeUnmount(() => {
  signal.cancelled = true
})

const current = computed(() => subscription.current)
const units = computed(() => current.value?.billableUnits ?? 0)
const method = computed(() => overview.value?.paymentMethod ?? null)

const dateFormatter = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long' })
const dateTimeFormatter = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium',
  timeStyle: 'short',
})
const formatDate = (iso: string | null) => (iso ? dateFormatter.format(new Date(iso)) : '—')

async function loadOverview() {
  if (!tenant.canManage || !current.value) return
  overview.value = (await billingApi.show()).data
}

async function refresh() {
  await subscription.load(tenant.currentId!, true)
  await loadOverview()
}

onMounted(async () => {
  try {
    await subscription.load(tenant.currentId!, true)
    await loadOverview()
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
  await resumeReturn()
})

/** Back from Bancolombia (authorization) or from Wompi's checkout (?pago=<charge>) */
async function resumeReturn() {
  const { medio, pago } = route.query
  if (medio || pago) await router.replace({ query: {} })
  if (medio === 'bancolombia') {
    const pending = takeBancolombia()
    if (!pending) return
    processing.value = 'Confirmando la autorización de Bancolombia…'
    try {
      const token = await waitForToken('bancolombia_transfer', pending.tokenId, {
        timeoutMs: 60_000,
        signal,
      })
      if (token.status !== 'APPROVED') throw new Error('Bancolombia no aprobó la autorización.')
      overview.value = (
        await billingApi.savePaymentMethod({
          type: 'BANCOLOMBIA_TRANSFER',
          token: token.id,
          acceptanceToken: pending.acceptanceToken,
          personalAuthToken: pending.personalAuthToken,
        })
      ).data
      toast.success('Cuenta Bancolombia guardada como medio de pago.')
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      processing.value = null
    }
  } else if (typeof pago === 'string' && /^[0-9a-f-]{36}$/.test(pago)) {
    await follow(pago, 'Confirmando tu pago con Wompi…')
  }
}

/** Waits for Wompi's answer about a charge and shows it */
async function follow(chargeId: string, message: string) {
  processing.value = message
  try {
    const charge = await waitForCharge(chargeId, { signal })
    await refresh()
    await quotaCard.value?.load()
    announce(charge)
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    processing.value = null
  }
}

function announce(charge: BillingCharge) {
  if (charge.status === 'approved') {
    toast.success(
      charge.kind === 'subscription'
        ? '¡Pago aprobado! Tu plan está activo. Te enviamos el comprobante por correo.'
        : 'Pago aprobado. Los correos adicionales ya están disponibles.',
    )
  } else if (charge.status === 'pending') {
    toast.info('El pago sigue en proceso. Te avisaremos por correo apenas se confirme.')
  } else {
    toast.error(charge.statusMessage ?? 'El pago no fue aprobado.')
  }
}

const status = computed(() => {
  const value = current.value
  if (!value) return null
  if (value.status === 'trialing') {
    return value.locked
      ? {
          color: 'danger' as const,
          label: 'Prueba terminada',
          detail: `Terminó el ${formatDate(value.trialEndsAt)}. Tu información sigue disponible en modo consulta.`,
        }
      : {
          color: 'primary' as const,
          label: `Prueba gratis · ${value.trialDaysLeft} ${value.trialDaysLeft === 1 ? 'día' : 'días'}`,
          detail: `Tienes todas las funciones hasta el ${formatDate(value.trialEndsAt)}.`,
        }
  }
  if (value.status === 'active') {
    return {
      color: 'success' as const,
      label: SUBSCRIPTION_STATUS_LABELS.active,
      detail: value.autoRenew
        ? `Se renueva automáticamente el ${formatDate(value.currentPeriodEndsAt)}.`
        : `Pagado hasta el ${formatDate(value.currentPeriodEndsAt)}. Pago manual: te recordaremos por correo ${MANUAL_REMINDER_DAYS.join(' y ')} días antes.`,
    }
  }
  if (value.status === 'past_due' && !value.locked) {
    return {
      color: 'warning' as const,
      label: SUBSCRIPTION_STATUS_LABELS.past_due,
      detail: value.autoRenew
        ? `No pudimos cobrar la renovación. Puedes seguir usando AptoPH hasta el ${formatDate(value.graceEndsAt)}.`
        : `El plan venció sin pago. Puedes seguir usando AptoPH hasta el ${formatDate(value.graceEndsAt)}.`,
    }
  }
  return {
    color: 'danger' as const,
    label: SUBSCRIPTION_STATUS_LABELS[value.status],
    detail: 'Paga el plan para volver a editar la información.',
  }
})

const price = computed(() => quote(units.value))

/** Paid and far from the end: the renewal takes care of it */
const paidAhead = computed(() => {
  const value = current.value
  if (value?.status !== 'active' || !value.currentPeriodEndsAt) return false
  return new Date(value.currentPeriodEndsAt).getTime() - Date.now() > PAY_AHEAD_DAYS * 86_400_000
})
const pendingPlan = computed(() =>
  overview.value?.charges.find((c) => c.kind === 'subscription' && c.status === 'pending'),
)
/** Charged to a saved method: Wompi answers in seconds. A checkout left open does not block */
const hasPending = computed(() => !!pendingPlan.value && !pendingPlan.value.checkout)
const payLabel = computed(() => {
  const value = current.value
  if (value?.status === 'past_due' || value?.status === 'cancelled') return 'Pagar mi plan'
  if (value?.status === 'active') return 'Renovar ahora'
  return 'Activar mi plan'
})

function startPay() {
  confirmingPay.value = true
}

/** From the "manual payment with PSE" option: the confirmation in the plan card */
async function payManually() {
  confirmingPay.value = true
  await nextTick()
  document.getElementById('plan-payment')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

async function pay() {
  paying.value = true
  try {
    const { data } = await billingApi.paySubscription()
    if (data.checkoutUrl) {
      // Manual payment: PSE (any bank), card or wallet in Wompi; back to /plan?pago=<id>
      window.location.assign(data.checkoutUrl)
      return
    }
    confirmingPay.value = false
    await follow(data.charge.id, 'Procesando el pago con Wompi…')
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    paying.value = false
  }
}

function onMethodSaved(value: BillingOverview) {
  overview.value = value
  toast.success('Medio de pago guardado.')
  void subscription.load(tenant.currentId!, true)
}

async function setAutoRenew(enabled: boolean) {
  togglingRenew.value = true
  try {
    overview.value = (await billingApi.setAutoRenew(enabled)).data
    await subscription.load(tenant.currentId!, true)
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    togglingRenew.value = false
  }
}

async function removeMethod() {
  removingMethod.value = true
  try {
    overview.value = (await billingApi.removePaymentMethod()).data
    await subscription.load(tenant.currentId!, true)
    toast.success('Medio de pago eliminado. La renovación automática quedó apagada.')
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    removingMethod.value = false
  }
}

const chargeColumns: TableColumn[] = [
  { name: 'createdAt', label: 'Fecha' },
  { name: 'description', label: 'Concepto' },
  { name: 'paymentMethod', label: 'Medio' },
  { name: 'amount', label: 'Valor', classes: 'text-right' },
  { name: 'status', label: 'Estado' },
]
const STATUS_COLORS: Record<BillingChargeStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  approved: 'success',
  pending: 'warning',
  declined: 'danger',
  error: 'danger',
  voided: 'neutral',
  expired: 'neutral',
}
</script>

<template>
  <PageHeader title="Plan y facturación" :subtitle="tenant.current?.name" />

  <UiAlert v-if="error" color="danger" variant="soft" class="mb-6">{{ error }}</UiAlert>

  <template v-if="loading">
    <UiSkeleton height="6rem" class="mb-6" />
    <div class="grid gap-4 lg:grid-cols-3">
      <UiSkeleton v-for="n in 3" :key="n" height="22rem" />
    </div>
  </template>

  <UiAlert v-else-if="!current" color="neutral" variant="soft">
    Este conjunto tiene un acuerdo administrado directamente con AptoPH. Para cambios en el plan
    escríbenos a
    <a :href="`mailto:${CONTACT_EMAIL}`" class="font-medium underline">{{ CONTACT_EMAIL }}</a
    >.
  </UiAlert>

  <template v-else>
    <UiCard class="mb-6">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="text-lg font-semibold">Plan {{ PLAN_LABELS[current.plan] }}</h2>
            <UiBadge
              v-if="status"
              :label="status.label"
              :color="status.color"
              variant="soft"
              size="sm"
            />
          </div>
          <p class="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{{ status?.detail }}</p>
          <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Cotizado con {{ units.toLocaleString('es-CO') }} unidades
            {{ current.billableUnits ? '' : '(aún no has cargado unidades)' }}.
          </p>
        </div>
      </div>
    </UiCard>

    <UiAlert v-if="processing" color="primary" variant="soft" class="mb-6">
      <i class="mdi mdi-loading mdi-spin" aria-hidden="true" /> {{ processing }}
    </UiAlert>

    <UiCard v-if="tenant.canManage" class="mb-6">
      <div class="flex flex-col gap-4">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="min-w-0 flex-1">
            <h2 class="text-lg font-semibold">Medio de pago</h2>
            <template v-if="method">
              <p class="mt-1 flex items-center gap-2 font-medium">
                <i
                  class="mdi text-xl"
                  :class="method.type === 'CARD' ? 'mdi-credit-card-outline' : 'mdi-cellphone'"
                  aria-hidden="true"
                />
                {{ method.label }}
                <span class="text-sm font-normal text-neutral-500">
                  · {{ PAYMENT_METHOD_TYPE_LABELS[method.type] }}
                  <template v-if="method.expiresOn">· vence {{ method.expiresOn }}</template>
                </span>
              </p>
              <p class="text-xs text-neutral-500">
                Agregado el {{ formatDate(method.createdAt) }}
                <template v-if="method.createdBy">por {{ method.createdBy }}</template
                >.
              </p>
            </template>
            <div v-else class="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div
                class="flex flex-col gap-3 rounded-lg border border-neutral-200 p-3 dark:border-white/10"
              >
                <p class="font-medium">
                  <i class="mdi mdi-autorenew text-mint-600" aria-hidden="true" /> Pago automático
                </p>
                <p class="mt-1 text-neutral-500 dark:text-neutral-400">
                  Guarda una tarjeta de <strong>crédito o débito</strong> (también débito
                  empresarial), Nequi, Bancolombia o DaviPlata y el plan se renueva solo.
                </p>
                <UiButton class="mt-auto self-start" color="primary" @click="methodModal = true">
                  Activar pago automático
                </UiButton>
              </div>
              <div
                class="flex flex-col gap-3 rounded-lg border border-neutral-200 p-3 dark:border-white/10"
              >
                <p class="font-medium">
                  <i class="mdi mdi-bank-outline text-mint-600" aria-hidden="true" /> Pago manual
                  con PSE
                </p>
                <p class="mt-1 text-neutral-500 dark:text-neutral-400">
                  Desde cualquier banco, también cuentas empresariales, sin guardar nada. Te
                  recordamos antes de cada vencimiento.
                </p>
                <UiButton
                  v-if="!paidAhead"
                  class="mt-auto self-start"
                  color="primary"
                  variant="outline"
                  @click="payManually"
                >
                  Pagar con PSE
                </UiButton>
                <p v-else class="mt-auto text-xs text-neutral-500">
                  Podrás pagar el siguiente periodo desde {{ PAY_AHEAD_DAYS }} días antes del
                  vencimiento.
                </p>
              </div>
            </div>
          </div>
          <div v-if="method" class="flex gap-2">
            <UiButton
              v-if="method"
              variant="ghost"
              color="danger"
              :loading="removingMethod"
              @click="removeMethod"
              >Quitar</UiButton
            >
            <UiButton
              :variant="method ? 'outline' : 'solid'"
              color="primary"
              @click="methodModal = true"
            >
              {{ method ? 'Cambiar' : 'Activar pago automático' }}
            </UiButton>
          </div>
        </div>

        <div
          v-if="method && overview"
          class="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-4 dark:border-white/10"
        >
          <UiSwitch
            :model-value="overview.autoRenew"
            :disabled="togglingRenew || !['active', 'past_due'].includes(current.status)"
            label="Renovación automática"
            :description="
              overview.autoRenew && overview.nextChargeAt
                ? `Próximo cobro: ${formatCop(overview.nextChargeAmount ?? 0)} el ${formatDate(overview.nextChargeAt)} (te avisamos 3 días antes).`
                : 'Se cobra con este medio un día antes de que termine el periodo.'
            "
            @update:model-value="setAutoRenew"
          />
        </div>
        <UiAlert
          v-if="overview?.failedAttempts && current.status === 'past_due' && method"
          color="warning"
          variant="soft"
        >
          {{ overview.failedAttempts }}
          {{
            overview.failedAttempts === 1
              ? 'intento de cobro rechazado'
              : 'intentos de cobro rechazados'
          }}.
          <template v-if="overview.graceEndsAt"
            >Puedes seguir usando AptoPH hasta el {{ formatDate(overview.graceEndsAt) }}.</template
          >
          Cambia el medio de pago o paga ahora para evitar el bloqueo.
        </UiAlert>
      </div>
    </UiCard>

    <div class="max-w-3xl">
      <UiCard class="ring-2 ring-mint-400">
        <div class="flex h-full flex-col">
          <div class="flex items-center justify-between gap-2">
            <h3 class="text-lg font-semibold">Plan {{ PLAN.name }}</h3>
            <UiBadge
              v-if="current.plan === PLAN.id"
              label="Tu plan"
              color="primary"
              size="sm"
              variant="soft"
            />
          </div>
          <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{{ PLAN.tagline }}</p>

          <p class="mt-5 text-4xl font-semibold tabular-nums">
            {{ formatCop(price.pricePerUnit) }}
            <span class="text-base font-normal text-neutral-500">por unidad al mes</span>
          </p>
          <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Tarifa única, sin importar el tamaño del conjunto. Mínimo
            {{ formatCop(MINIMUM_MONTHLY) }} al mes (hasta
            {{ MINIMUM_COVERS_UNITS.toLocaleString('es-CO') }} unidades).
          </p>

          <div
            class="mt-5 flex items-center justify-between gap-3 rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10"
          >
            <span>
              {{ units.toLocaleString('es-CO') }} unidades
              <template v-if="price.minimumApplied">· mínimo mensual</template>
              <template v-else>× {{ formatCop(price.pricePerUnit) }}</template>
            </span>
            <span class="font-medium tabular-nums">{{ formatCop(price.total) }} al mes</span>
          </div>

          <ul class="mt-5 grid flex-1 gap-2 text-sm sm:grid-cols-2">
            <li v-for="feature in PLAN.features" :key="feature" class="flex gap-2">
              <i class="mdi mdi-check text-mint-600 dark:text-mint-300" aria-hidden="true" />
              <span>{{ feature }}</span>
            </li>
          </ul>

          <p
            v-if="paidAhead"
            class="mt-6 rounded-lg bg-mint-50 px-3 py-2 text-sm text-mint-800 dark:bg-mint-400/10 dark:text-mint-200"
          >
            <i class="mdi mdi-check-circle-outline" aria-hidden="true" />
            Pagado hasta el {{ formatDate(current.currentPeriodEndsAt) }}.
          </p>
          <template v-else-if="tenant.canManage">
            <div
              v-if="confirmingPay"
              id="plan-payment"
              class="mt-6 flex flex-col gap-3 rounded-lg bg-neutral-50 p-4 text-sm dark:bg-white/5"
            >
              <p v-if="method">
                Se cobrarán <strong>{{ formatCop(price.total) }}</strong> a
                <strong>{{ method.label }}</strong> por 1 mes del plan {{ PLAN.name }} ({{
                  units.toLocaleString('es-CO')
                }}
                unidades). Después se renueva automáticamente; puedes apagarlo cuando quieras.
              </p>
              <template v-else>
                <p>
                  Pagarás <strong>{{ formatCop(price.total) }}</strong> por 1 mes del plan
                  {{ PLAN.name }} ({{ units.toLocaleString('es-CO') }} unidades) en Wompi con
                  <strong>PSE desde cualquier banco</strong>, tarjeta de crédito o débito, Nequi o
                  Bancolombia. No guardamos el medio de pago: te recordaremos por correo
                  {{ MANUAL_REMINDER_DAYS.join(' y ') }} días antes del siguiente vencimiento.
                </p>
                <p v-if="pendingPlan?.checkout" class="text-xs text-neutral-500">
                  Tienes un pago abierto en Wompi. Si ya pagaste con PSE y el banco aún no lo
                  aprueba, espera la confirmación por correo antes de pagar de nuevo.
                </p>
              </template>
              <div class="flex flex-wrap justify-end gap-2">
                <UiButton
                  v-if="!method"
                  variant="ghost"
                  :disabled="paying"
                  @click="((confirmingPay = false), (methodModal = true))"
                  >Prefiero pago automático</UiButton
                >
                <UiButton variant="ghost" :disabled="paying" @click="confirmingPay = false"
                  >Cancelar</UiButton
                >
                <UiButton color="primary" :loading="paying" @click="pay">
                  {{ method ? 'Confirmar pago' : 'Ir a pagar en Wompi' }}
                </UiButton>
              </div>
            </div>
            <UiButton
              v-else
              class="mt-6"
              block
              color="primary"
              :disabled="hasPending || !!processing"
              @click="startPay"
            >
              {{ hasPending ? 'Pago en proceso…' : payLabel }}
            </UiButton>
            <p
              v-if="!method && !confirmingPay"
              class="mt-2 text-center text-xs text-neutral-500 dark:text-neutral-400"
            >
              PSE desde cualquier banco, tarjeta de crédito o débito, Nequi o Bancolombia.
            </p>
          </template>
        </div>
      </UiCard>
    </div>

    <p class="mt-6 text-sm text-neutral-500 dark:text-neutral-400">
      El valor se calcula con las unidades del día del cobro, así que se ajusta si cambia el número
      de unidades. Los pagos se procesan con Wompi; te enviamos el comprobante por correo.
      <span v-if="!tenant.canManage">Solo la administración puede pagar el plan.</span>
    </p>

    <UiCard v-if="tenant.canManage && overview?.charges.length" class="mt-6">
      <h2 class="mb-3 text-lg font-semibold">Pagos</h2>
      <UiTable :columns="chargeColumns" :rows="overview.charges">
        <template #createdAt="{ createdAt }">
          <span class="whitespace-nowrap">{{ dateTimeFormatter.format(new Date(createdAt)) }}</span>
        </template>
        <template #description="row">
          {{ row.description }}
          <span v-if="row.automatic" class="block text-xs text-neutral-500"
            >Renovación automática</span
          >
        </template>
        <template #paymentMethod="{ paymentMethod }">{{
          paymentMethod ?? 'Checkout Wompi'
        }}</template>
        <template #amount="{ amount }"
          ><span class="tabular-nums">{{ formatCop(amount) }}</span></template
        >
        <template #status="row">
          <UiBadge
            :label="BILLING_CHARGE_STATUS_LABELS[row.status as BillingChargeStatus]"
            :color="STATUS_COLORS[row.status as BillingChargeStatus]"
            variant="soft"
            size="sm"
          />
          <span v-if="row.statusMessage" class="block max-w-xs text-xs text-neutral-500">{{
            row.statusMessage
          }}</span>
        </template>
      </UiTable>
    </UiCard>
  </template>

  <EmailQuotaCard
    v-if="!loading"
    ref="quotaCard"
    class="mt-6"
    :payment-method="method?.label ?? null"
    @charged="loadOverview"
  />
  <PaymentMethodModal v-model="methodModal" @saved="onMethodSaved" />
</template>
