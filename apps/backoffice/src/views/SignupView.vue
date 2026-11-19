<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { DuiAlert, DuiButton, DuiCheckbox, DuiForm, DuiInput, DuiLabel } from '@dronico/droni-kit'
import {
  MINIMUM_MONTHLY,
  PLANS,
  PRICE_TIERS,
  TRIAL_DAYS,
  formatCop,
  quote,
  tierFor,
  tierLabel,
} from '@aptoph/shared'
import AuthShell from '@/components/AuthShell.vue'
import { useAuthStore } from '@/stores/auth'
import { useTenantStore } from '@/stores/tenant'
import { errorMessage, fieldErrors } from '@/lib/errors'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const tenant = useTenantStore()

/** The landing links here with `?plan=completo&unidades=120` */
const selfServe = PLANS.filter((plan) => plan.selfServe).map((plan) => plan.id as string)
const queryPlan = String(route.query.plan ?? '')
const plan = selfServe.includes(queryPlan) ? queryPlan : selfServe[0]!
const queryUnits = String(route.query.unidades ?? '')

const form = ref({
  tenantName: '',
  city: '',
  units: /^\d{1,5}$/.test(queryUnits) ? queryUnits : '',
  fullName: '',
  email: '',
  phone: '',
  password: '',
  acceptTerms: false,
})
const errors = ref<Record<string, string>>({})
const error = ref<string | null>(null)
const loading = ref(false)

const units = computed(() => Number(form.value.units) || 0)
const estimate = computed(() => (units.value > 0 ? quote(units.value, 'monthly') : null))
const currentTier = computed(() => (units.value > 0 ? tierFor(units.value) : null))

async function submit() {
  loading.value = true
  errors.value = {}
  error.value = null
  try {
    const session = await auth.signup({ ...form.value, units: units.value, plan })
    tenant.reset()
    await tenant.load()
    tenant.select(session.tenantId)
    await router.replace({ path: '/', query: { bienvenida: '1' } })
  } catch (e) {
    errors.value = fieldErrors(e)
    error.value = Object.keys(errors.value).length
      ? 'Revisa los campos marcados para continuar.'
      : errorMessage(e)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthShell wide>
    <span
      class="self-start rounded-full bg-mint-50 px-3 py-1 text-xs font-semibold text-mint-700 dark:bg-mint-400/10 dark:text-mint-300"
    >
      {{ TRIAL_DAYS }} días gratis, sin tarjeta
    </span>
    <h1
      class="mt-4 text-[2rem] leading-tight font-extrabold tracking-tight text-brand-700 dark:text-white"
    >
      Crea la cuenta de tu conjunto
    </h1>
    <p class="mt-2 text-neutral-600 dark:text-neutral-300">
      Prueba todas las funciones de AptoPH durante {{ TRIAL_DAYS }} días. Al terminar eliges el
      plan; si no, tu información queda guardada en modo consulta.
    </p>

    <DuiForm class="mt-8" :loading="loading" @submit="submit">
      <DuiAlert v-if="error" color="danger" variant="soft" role="alert">{{ error }}</DuiAlert>

      <DuiLabel title="Nombre del conjunto o edificio" required :error="errors.tenantName">
        <DuiInput
          v-model="form.tenantName"
          autocomplete="organization"
          placeholder="Conjunto Residencial Los Álamos"
          required
          autofocus
          block
        />
      </DuiLabel>
      <div class="grid gap-4 sm:grid-cols-2">
        <DuiLabel title="Ciudad" required :error="errors.city">
          <DuiInput v-model="form.city" autocomplete="address-level2" required block />
        </DuiLabel>
        <DuiLabel title="Número de unidades" required :error="errors.units">
          <DuiInput
            v-model="form.units"
            type="number"
            min="1"
            max="20000"
            inputmode="numeric"
            placeholder="120"
            required
            block
          />
        </DuiLabel>
      </div>

      <div
        class="rounded-2xl bg-cream p-4 ring-1 ring-brand-900/5 dark:bg-white/5 dark:ring-white/10"
      >
        <p class="text-sm font-semibold text-brand-700 dark:text-white">
          Precio por unidad privada al mes, después de la prueba
        </p>
        <ul class="mt-2 space-y-1 text-sm">
          <li
            v-for="tier in PRICE_TIERS"
            :key="tier.pricePerUnit"
            class="flex justify-between gap-3"
            :class="
              tier === currentTier
                ? 'font-semibold text-mint-700 dark:text-mint-300'
                : 'text-neutral-600 dark:text-neutral-300'
            "
          >
            <span>{{ tierLabel(tier) }}</span>
            <span class="tabular-nums">{{ formatCop(tier.pricePerUnit) }}</span>
          </li>
        </ul>
        <p v-if="estimate" class="mt-3 text-sm text-ink dark:text-neutral-100">
          Tu conjunto pagaría
          <strong class="tabular-nums">{{ formatCop(estimate.monthly) }}</strong> al mes.
        </p>
        <p class="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
          Mínimo {{ formatCop(MINIMUM_MONTHLY) }} al mes. Pagando el año: 2 meses
          gratis. ¿Administras varias copropiedades?
          <a
            href="mailto:contacto@aptoph.com?subject=Plan%20Empresarial%20AptoPH"
            class="font-semibold text-mint-700 underline dark:text-mint-300"
            >Habla con ventas</a
          >.
        </p>
      </div>

      <DuiLabel title="Tu nombre completo" required :error="errors.fullName">
        <DuiInput v-model="form.fullName" autocomplete="name" required block />
      </DuiLabel>
      <div class="grid gap-4 sm:grid-cols-2">
        <DuiLabel title="Correo electrónico" required :error="errors.email">
          <DuiInput v-model="form.email" type="email" autocomplete="email" required block />
        </DuiLabel>
        <DuiLabel title="Celular" required :error="errors.phone">
          <DuiInput
            v-model="form.phone"
            type="tel"
            autocomplete="tel"
            placeholder="300 123 4567"
            required
            block
          />
        </DuiLabel>
      </div>
      <DuiLabel
        title="Contraseña"
        required
        :error="errors.password"
        :help-text="errors.password ? undefined : 'Mínimo 8 caracteres.'"
      >
        <DuiInput
          v-model="form.password"
          type="password"
          minlength="8"
          autocomplete="new-password"
          required
          block
        />
      </DuiLabel>

      <div>
        <DuiCheckbox
          v-model="form.acceptTerms"
          label="Acepto los términos del servicio y el tratamiento de datos personales (Ley 1581 de 2012)."
        />
        <p v-if="errors.acceptTerms" class="mt-1 text-sm text-red-600 dark:text-red-300">
          {{ errors.acceptTerms }}
        </p>
      </div>

      <DuiButton type="submit" color="primary" size="lg" block :loading="loading">
        Empezar prueba gratis
      </DuiButton>
    </DuiForm>

    <p class="mt-6 text-center text-sm text-neutral-600 dark:text-neutral-300">
      ¿Ya tienes cuenta?
      <RouterLink to="/login" class="font-semibold text-brand-600 underline dark:text-brand-200">
        Inicia sesión
      </RouterLink>
    </p>
  </AuthShell>
</template>
