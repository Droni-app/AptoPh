<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { DuiAlert, DuiBadge, DuiButton, DuiCard, DuiSkeleton } from '@dronico/droni-kit'
import {
  ANNUAL_BILLED_MONTHS,
  MINIMUM_MONTHLY,
  PLAN_LABELS,
  PRICE_TIERS,
  SUBSCRIPTION_STATUS_LABELS,
  findPlan,
  formatCop,
  quote,
  tierFor,
  tierLabel,
  type BillingCycle,
  type Plan,
  type PlanId,
} from '@aptoph/shared'
import PageHeader from '@/components/PageHeader.vue'
import { subscriptionApi } from '@/api/backoffice'
import { errorMessage } from '@/lib/errors'
import { useSubscriptionStore } from '@/stores/subscription'
import { useTenantStore } from '@/stores/tenant'

const SALES_EMAIL = 'contacto@aptoph.com'

const tenant = useTenantStore()
const subscription = useSubscriptionStore()
const loading = ref(true)
const error = ref<string | null>(null)
const sending = ref<PlanId | null>(null)
const requested = ref(false)
const cycle = ref<BillingCycle>('annual')

onMounted(async () => {
  try {
    await subscription.load(tenant.currentId!, true)
    if (subscription.current) cycle.value = subscription.current.billingCycle
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
})

const current = computed(() => subscription.current)
const units = computed(() => current.value?.billableUnits ?? 0)

const dateFormatter = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long' })
const formatDate = (iso: string | null) => (iso ? dateFormatter.format(new Date(iso)) : '—')

const status = computed(() => {
  const value = current.value
  if (!value) return null
  if (value.status === 'trialing') {
    return value.locked
      ? { color: 'danger' as const, label: 'Prueba terminada', detail: `Terminó el ${formatDate(value.trialEndsAt)}. Tu información sigue disponible en modo consulta.` }
      : { color: 'primary' as const, label: `Prueba gratis · ${value.trialDaysLeft} ${value.trialDaysLeft === 1 ? 'día' : 'días'}`, detail: `Tienes todas las funciones hasta el ${formatDate(value.trialEndsAt)}.` }
  }
  if (value.status === 'active') {
    return { color: 'success' as const, label: SUBSCRIPTION_STATUS_LABELS.active, detail: `Próxima renovación: ${formatDate(value.currentPeriodEndsAt)}.` }
  }
  return { color: 'warning' as const, label: SUBSCRIPTION_STATUS_LABELS[value.status], detail: 'Activa el plan para volver a editar la información.' }
})

const price = computed(() => quote(units.value, cycle.value))
const currentTier = computed(() => tierFor(units.value))
const mainPlan = findPlan('completo')
const enterprise = findPlan('empresarial')

async function choose(plan: Plan) {
  if (!plan.selfServe) {
    window.location.href = `mailto:${SALES_EMAIL}?subject=${encodeURIComponent(`Plan Empresarial · ${tenant.current?.name ?? ''}`)}`
    return
  }
  sending.value = plan.id
  error.value = null
  try {
    subscription.set((await subscriptionApi.requestActivation({ plan: plan.id, billingCycle: cycle.value })).data)
    requested.value = true
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    sending.value = null
  }
}
</script>

<template>
  <PageHeader title="Plan y facturación" :subtitle="tenant.current?.name" />

  <DuiAlert v-if="error" color="danger" variant="soft" class="mb-6">{{ error }}</DuiAlert>

  <template v-if="loading">
    <DuiSkeleton height="6rem" class="mb-6" />
    <div class="grid gap-4 lg:grid-cols-3">
      <DuiSkeleton v-for="n in 3" :key="n" height="22rem" />
    </div>
  </template>

  <DuiAlert v-else-if="!current" color="neutral" variant="soft">
    Este conjunto tiene un acuerdo administrado directamente con AptoPH. Para cambios en el plan
    escríbenos a <a :href="`mailto:${SALES_EMAIL}`" class="font-medium underline">{{ SALES_EMAIL }}</a>.
  </DuiAlert>

  <template v-else>
    <DuiCard class="mb-6">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="text-lg font-semibold">Plan {{ PLAN_LABELS[current.plan] }}</h2>
            <DuiBadge v-if="status" :label="status.label" :color="status.color" variant="soft" size="sm" />
          </div>
          <p class="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{{ status?.detail }}</p>
          <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Cotizado con {{ units.toLocaleString('es-CO') }} unidades
            {{ current.billableUnits ? '' : '(aún no has cargado unidades)' }}.
          </p>
        </div>
        <p v-if="current.activationRequestedAt" class="text-sm text-neutral-500 dark:text-neutral-400">
          <i class="mdi mdi-email-check-outline" aria-hidden="true" />
          Solicitud enviada el {{ formatDate(current.activationRequestedAt) }}
        </p>
      </div>
    </DuiCard>

    <DuiAlert v-if="requested" color="success" variant="soft" class="mb-6">
      ¡Listo! Recibimos tu solicitud. Te escribiremos en menos de un día hábil con los datos de pago;
      apenas se confirme, el plan queda activo sin perder nada de tu información.
    </DuiAlert>

    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div class="inline-flex rounded-lg border border-neutral-200 p-1 dark:border-white/10" role="group" aria-label="Ciclo de pago">
        <button
          v-for="option in (['monthly', 'annual'] as const)"
          :key="option"
          type="button"
          class="rounded-md px-4 py-1.5 text-sm font-medium transition"
          :class="cycle === option ? 'bg-violet-600 text-white' : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-white/5'"
          :aria-pressed="cycle === option"
          @click="cycle = option"
        >
          {{ option === 'monthly' ? 'Mensual' : 'Anual' }}
        </button>
      </div>
      <p class="text-sm text-emerald-700 dark:text-emerald-300">
        <i class="mdi mdi-gift-outline" aria-hidden="true" />
        Pago anual: pagas {{ ANNUAL_BILLED_MONTHS }} meses y recibes 12.
      </p>
    </div>

    <div class="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <DuiCard class="ring-2 ring-violet-500">
        <div class="flex h-full flex-col">
          <div class="flex items-center justify-between gap-2">
            <h3 class="text-lg font-semibold">Plan {{ mainPlan.name }}</h3>
            <DuiBadge v-if="current.plan === mainPlan.id" label="Tu plan" color="primary" size="sm" variant="soft" />
          </div>
          <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{{ mainPlan.tagline }}</p>

          <p class="mt-5 text-4xl font-semibold tabular-nums">
            {{ formatCop(price.pricePerUnit) }}
            <span class="text-base font-normal text-neutral-500">por unidad al mes</span>
          </p>
          <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Para tus {{ units.toLocaleString('es-CO') }} unidades, antes de IVA<template v-if="cycle === 'annual'">, pagando el año</template>.
          </p>

          <ul class="mt-5 divide-y divide-neutral-200 rounded-lg border border-neutral-200 text-sm dark:divide-white/10 dark:border-white/10">
            <li
              v-for="tier in PRICE_TIERS"
              :key="tier.pricePerUnit"
              class="flex items-center justify-between gap-3 px-3 py-2"
              :class="tier === currentTier ? 'bg-violet-50 font-medium dark:bg-violet-500/10' : ''"
            >
              <span>
                {{ tierLabel(tier) }}
                <span v-if="tier === currentTier" class="ml-1 text-xs text-violet-600 dark:text-violet-300">· tu conjunto</span>
              </span>
              <span class="tabular-nums">{{ formatCop(tier.pricePerUnit) }} / unidad</span>
            </li>
          </ul>
          <p class="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            Total estimado: {{ formatCop(price.total) }} {{ cycle === 'annual' ? 'al año' : 'al mes' }}<template
              v-if="cycle === 'annual'"
            > (ahorras {{ formatCop(price.annualSavings) }})</template>. Mínimo {{ formatCop(MINIMUM_MONTHLY) }} al mes.
          </p>

          <ul class="mt-5 grid flex-1 gap-2 text-sm sm:grid-cols-2">
            <li v-for="feature in mainPlan.features" :key="feature" class="flex gap-2">
              <i class="mdi mdi-check text-violet-600 dark:text-violet-400" aria-hidden="true" />
              <span>{{ feature }}</span>
            </li>
          </ul>

          <DuiButton
            class="mt-6"
            block
            color="primary"
            :loading="sending === mainPlan.id"
            :disabled="!tenant.canManage"
            @click="choose(mainPlan)"
          >
            {{ current.status === 'active' ? 'Renovar mi plan' : 'Activar mi plan' }}
          </DuiButton>
        </div>
      </DuiCard>

      <DuiCard>
        <div class="flex h-full flex-col">
          <h3 class="text-lg font-semibold">{{ enterprise.name }}</h3>
          <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{{ enterprise.tagline }}</p>
          <p class="mt-5 text-3xl font-semibold">A la medida</p>
          <p v-if="enterprise.includesFrom" class="mt-5 text-sm font-medium">{{ enterprise.includesFrom }}</p>
          <ul class="mt-3 flex-1 space-y-2 text-sm">
            <li v-for="feature in enterprise.features" :key="feature" class="flex gap-2">
              <i class="mdi mdi-check text-violet-600 dark:text-violet-400" aria-hidden="true" />
              <span>{{ feature }}</span>
            </li>
          </ul>
          <DuiButton class="mt-6" block color="neutral" variant="outline" @click="choose(enterprise)">
            Hablar con ventas
          </DuiButton>
        </div>
      </DuiCard>
    </div>

    <p class="mt-6 text-sm text-neutral-500 dark:text-neutral-400">
      El precio por unidad depende del tamaño del conjunto y se ajusta si cambia el número de unidades. <span v-if="!tenant.canManage">Solo la administración
      puede activar el plan.</span>
    </p>
  </template>
</template>
